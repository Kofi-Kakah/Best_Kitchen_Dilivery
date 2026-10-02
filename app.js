import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./src/routes/auth.routes.js";
import restaurantRouter from "./src/routes/restaurant.routes.js";
import driverRouter from "./src/routes/driver.routes.js";
import deliveryRouter from "./src/routes/delivery.routes.js";
import cartRouter from "./src/routes/cart.routes.js";
import orderRouter from "./src/routes/order.routes.js";
import { errorHandler } from "./src/middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/restaurants", restaurantRouter);
app.use("/api/drivers", driverRouter);
app.use("/api/deliveries", deliveryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

export default app;
