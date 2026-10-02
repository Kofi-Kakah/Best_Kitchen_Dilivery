import { ensureDriverProfile, recordDriverLocation, setDriverAvailability, updateDriverProfile } from "../services/driver.services.js";
import { listDriverDeliveries } from "../services/delivery.services.js";

export async function getMe(req, res, next) {
  try { return res.json({ driver: await ensureDriverProfile(req.auth.userId) }); } catch (error) { return next(error); }
}
export async function updateMe(req, res, next) {
  try { return res.json({ driver: await updateDriverProfile(req.auth.userId, req.body) }); } catch (error) { return next(error); }
}
export async function setAvailability(req, res, next) {
  try { return res.json({ driver: await setDriverAvailability(req.auth.userId, req.body.availability) }); } catch (error) { return next(error); }
}
export async function updateLocation(req, res, next) {
  try { return res.status(201).json({ location: await recordDriverLocation(req.auth.userId, req.body) }); } catch (error) { return next(error); }
}
export async function getDeliveries(req, res, next) {
  try { return res.json(await listDriverDeliveries(req.auth.userId, req.validatedQuery)); } catch (error) { return next(error); }
}
