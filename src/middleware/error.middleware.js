export function errorHandler(error, _req, res, _next) {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  if (error?.code === "P2002") {
    return res.status(409).json({ error: "A record with this value already exists" });
  }

  if (error?.code === "P2025") {
    return res.status(404).json({ error: "Requested record was not found" });
  }

  const statusCode = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;
  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : error.message,
  });
}
