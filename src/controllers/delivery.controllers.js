import {
  acceptDelivery as acceptDeliveryRecord,
  assignDelivery as assignDeliveryRecord,
  createDeliveryForOrder,
  getDelivery as getDeliveryRecord,
  listAllDeliveries,
  listAvailableDeliveries,
  listCustomerDeliveries,
  updateDeliveryStatus,
} from "../services/delivery.services.js";

export async function getAvailable(req, res, next) {
  try { return res.json(await listAvailableDeliveries(req.validatedQuery)); } catch (error) { return next(error); }
}
export async function getMine(req, res, next) {
  try { return res.json({ deliveries: await listCustomerDeliveries(req.auth.userId) }); } catch (error) { return next(error); }
}
export async function getAll(req, res, next) {
  try { return res.json(await listAllDeliveries(req.validatedQuery)); } catch (error) { return next(error); }
}
export async function getOne(req, res, next) {
  try { return res.json({ delivery: await getDeliveryRecord(req.params.deliveryId, req.auth.userId, req.auth.role === "ADMIN") }); } catch (error) { return next(error); }
}
export async function accept(req, res, next) {
  try { return res.json({ delivery: await acceptDeliveryRecord(req.params.deliveryId, req.auth.userId) }); } catch (error) { return next(error); }
}
export async function markPickedUp(req, res, next) {
  try { return res.json({ delivery: await updateDeliveryStatus(req.params.deliveryId, req.auth.userId, "PICKED_UP", req.body.note) }); } catch (error) { return next(error); }
}
export async function markCompleted(req, res, next) {
  try { return res.json({ delivery: await updateDeliveryStatus(req.params.deliveryId, req.auth.userId, "COMPLETED", req.body.note) }); } catch (error) { return next(error); }
}
export async function createForOrder(req, res, next) {
  try { return res.status(201).json({ delivery: await createDeliveryForOrder(req.params.orderId) }); } catch (error) { return next(error); }
}
export async function assign(req, res, next) {
  try { return res.json({ delivery: await assignDeliveryRecord(req.params.deliveryId, req.body.driverId) }); } catch (error) { return next(error); }
}
