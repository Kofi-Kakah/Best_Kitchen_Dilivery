const USER_ROLES = new Set(["CUSTOMER", "RESTAURANT_OWNER", "DRIVER", "ADMIN"]);

export function requireRole(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => typeof role !== "string" || !USER_ROLES.has(role))
  ) {
    throw new TypeError("requireRole needs one or more valid user roles");
  }

  return function roleMiddleware(req, res, next) {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: "You do not have permission to access this resource" });
    }

    return next();
  };
}
