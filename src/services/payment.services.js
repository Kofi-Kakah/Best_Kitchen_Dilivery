import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../lib/prisma.js";

const STRIPE_API = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 300;

export class PaymentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "PaymentError";
    this.statusCode = statusCode;
  }
}

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentError("Card payments are not configured", 503);
  return key;
}

async function stripeRequest(path, { method = "GET", body, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${stripeSecretKey()}` };
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let response;
  try {
    response = await fetch(`${STRIPE_API}${path}`, {
      method,
      headers,
      ...(body ? { body: body.toString() } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new PaymentError("Payment provider is temporarily unavailable", 502);
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof result?.error?.message === "string" ? result.error.message : "Payment provider request failed";
    throw new PaymentError(message, response.status >= 500 ? 502 : 400);
  }
  return result;
}

export async function getOrderPayment(orderId, userId, isAdmin = false) {
  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: { order: { select: { customerId: true } } },
  });
  if (!payment) throw new PaymentError("Payment not found", 404);
  if (!isAdmin && payment.order.customerId !== userId) throw new PaymentError("You do not have permission to view this payment", 403);

  const { order, ...safePayment } = payment;
  return safePayment;
}

export async function createPaymentIntent(orderId, userId) {
  let payment = await prisma.payment.findUnique({
    where: { orderId },
    include: { order: { select: { customerId: true } } },
  });
  if (!payment) throw new PaymentError("Payment not found", 404);
  if (payment.order.customerId !== userId) throw new PaymentError("You do not have permission to pay for this order", 403);
  if (payment.method !== "CARD") throw new PaymentError("Online payment is available only for card orders", 409);
  if (payment.status === "PAID") throw new PaymentError("This order has already been paid", 409);
  if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") throw new PaymentError("This payment cannot be reused", 409);

  if (payment.providerPaymentId && payment.provider === "stripe") {
    const existingIntent = await stripeRequest(`/payment_intents/${encodeURIComponent(payment.providerPaymentId)}`);
    return { payment: publicPayment(payment), clientSecret: existingIntent.client_secret };
  }

  const amount = Math.round(Number(payment.amount) * 100);
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 99999999) {
    throw new PaymentError("Order total is outside Stripe's supported USD payment range", 400);
  }

  const form = new URLSearchParams({
    amount: String(amount),
    currency: payment.currency.toLowerCase(),
    "automatic_payment_methods[enabled]": "true",
    "metadata[orderId]": orderId,
    "metadata[paymentId]": payment.id,
  });
  const intent = await stripeRequest("/payment_intents", {
    method: "POST",
    body: form,
    idempotencyKey: `order-${orderId}`,
  });

  payment = await prisma.payment.update({
    where: { id: payment.id },
    data: { provider: "stripe", providerPaymentId: intent.id },
  });
  return { payment: publicPayment(payment), clientSecret: intent.client_secret };
}

function publicPayment(payment) {
  const { providerPaymentId: _providerPaymentId, ...safePayment } = payment;
  return safePayment;
}

function verifyStripeSignature(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new PaymentError("Payment webhooks are not configured", 503);
  if (!Buffer.isBuffer(rawBody) || typeof signatureHeader !== "string") {
    throw new PaymentError("Invalid webhook request", 400);
  }

  const fields = signatureHeader.split(",").map((field) => field.split("=", 2));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
    throw new PaymentError("Invalid webhook signature", 400);
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new PaymentError("Webhook signature timestamp is outside the allowed window", 400);
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
  const valid = signatures.some((signature) => {
    if (!/^[a-f\d]{64}$/i.test(signature)) return false;
    const provided = Buffer.from(signature, "hex");
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
  if (!valid) throw new PaymentError("Invalid webhook signature", 400);
}

export async function handleStripeWebhook(rawBody, signatureHeader) {
  verifyStripeSignature(rawBody, signatureHeader);

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new PaymentError("Invalid webhook payload", 400);
  }

  const intent = event?.data?.object;
  if (!event?.id || !event?.type || intent?.object !== "payment_intent" || !intent.id) {
    throw new PaymentError("Invalid Stripe event payload", 400);
  }

  if (event.type !== "payment_intent.succeeded" && event.type !== "payment_intent.payment_failed" && event.type !== "payment_intent.canceled") {
    return { received: true, handled: false };
  }

  const payment = await prisma.payment.findUnique({ where: { providerPaymentId: intent.id } });
  if (!payment || payment.provider !== "stripe") throw new PaymentError("Payment record not found for this event", 404);

  if (
    intent.metadata?.paymentId !== payment.id ||
    intent.metadata?.orderId !== payment.orderId ||
    intent.amount !== Math.round(Number(payment.amount) * 100) ||
    intent.currency?.toLowerCase() !== payment.currency.toLowerCase()
  ) {
    throw new PaymentError("Webhook payment details do not match the order", 400);
  }

  if (event.type === "payment_intent.succeeded") {
    if (intent.amount_received !== Math.round(Number(payment.amount) * 100)) {
      throw new PaymentError("Stripe reported an unexpected amount received", 400);
    }
    await prisma.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PAID", paidAt: new Date(), failureReason: null },
    });
  } else {
    const failureReason = event.type === "payment_intent.canceled"
      ? "Payment was canceled"
      : String(intent.last_payment_error?.message ?? "Payment failed").slice(0, 500);
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED", failureReason },
    });
  }

  return { received: true, handled: true };
}
