import { Router } from "express";
import { getCurrentUser, login, logout, register } from "../controllers/auth.controllers.js";
import { requireAuth } from "../middleware/require-auth.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, getCurrentUser);

export default authRouter;
