import { checkoutOrder, getOrder as getOrderRecord, listOrders, updateOrderStatus } from "../services/order.services.js";

export async function getMine(req, res, next) {
  try { return res.json(await listOrders(req.auth.userId, req.auth.role, req.validatedQuery)); } catch (error) { return next(error); }
}
export async function getOne(req, res, next) {
  try { return res.json({ order: await getOrderRecord(req.params.orderId, req.auth.userId, req.auth.role === "ADMIN") }); } catch (error) { return next(error); }
}
export async function checkout(req, res, next) {
  try { return res.status(201).json({ order: await checkoutOrder(req.auth.userId, req.body) }); } catch (error) { return next(error); }
}
export async function patchStatus(req, res, next) {
  try { return res.json({ order: await updateOrderStatus(req.params.orderId, req.auth.userId, req.auth.role, req.body.status) }); } catch (error) { return next(error); }
}
