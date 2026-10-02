import { Router } from "express";
import { getCurrentUser, login, logout, register } from "../controllers/auth.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateLogin, validateRegistration } from "../validators/auth.validators.js";

const authRouter = Router();

authRouter.post("/register", validateRegistration, register);
authRouter.post("/login", validateLogin, login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, getCurrentUser);

export default authRouter;
