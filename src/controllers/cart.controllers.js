import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from "../services/cart.services.js";

export async function getMine(req, res, next) {
  try {
    const result = await getCart(req.auth.userId, req.params.restaurantId);
    return res.json(req.params.restaurantId ? { cart: result } : result);
  } catch (error) { return next(error); }
}
export async function addItem(req, res, next) {
  try { return res.status(200).json({ cart: await addCartItem(req.auth.userId, req.params.restaurantId, req.body.menuItemId, req.body.quantity) }); } catch (error) { return next(error); }
}
export async function patchItem(req, res, next) {
  try { return res.json({ cart: await updateCartItem(req.auth.userId, req.params.cartItemId, req.body.quantity) }); } catch (error) { return next(error); }
}
export async function deleteItem(req, res, next) {
  try { return res.json({ cart: await removeCartItem(req.auth.userId, req.params.cartItemId) }); } catch (error) { return next(error); }
}
export async function deleteCart(req, res, next) {
  try { return res.json(await clearCart(req.auth.userId, req.params.restaurantId)); } catch (error) { return next(error); }
}
