import {
  createPaymentIntent as createPaymentIntentRecord,
  getOrderPayment,
  handleStripeWebhook,
} from "../services/payment.services.js";

export async function getPayment(req, res, next) {
  try {
    const payment = await getOrderPayment(req.params.orderId, req.auth.userId, req.auth.role === "ADMIN");
    return res.json({ payment });
  } catch (error) {
    return next(error);
  }
}

export async function createPaymentIntent(req, res, next) {
  try {
    const result = await createPaymentIntentRecord(req.params.orderId, req.auth.userId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function stripeWebhook(req, res, next) {
  try {
    const result = await handleStripeWebhook(req.body, req.get("stripe-signature"));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
