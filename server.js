import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { initializeSockets } from "./src/sockets/index.js";
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid TCP port between 1 and 65535");
}

const server = createServer(app);
initializeSockets(server);

server.listen(PORT, () => {
  console.log(`Best Kitchen Delivery API listening on PORT: http://localhost:${PORT}`);
});
