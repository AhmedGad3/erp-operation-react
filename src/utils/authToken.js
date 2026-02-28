function decodeBase64Url(value) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function normalizeUserShape(source) {
  if (!source || typeof source !== "object") return null;

  const rolesRaw = pickFirst(source.roles, source.userRoles, source.permissions);
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw
    : source.role
      ? [source.role]
      : [];

  return {
    id: pickFirst(source.id, source._id, source.userId, source.sub),
    name: pickFirst(
      source.name,
      source.fullName,
      source.username,
      source.displayName,
      source.nameAr,
      source.nameEn,
      source.email,
      "User"
    ),
    email: pickFirst(source.email, source.mail),
    role: pickFirst(source.role, source.userRole, source?.user?.role, roles[0]),
    roles,
  };
}

function getStoredUserProfile() {
  try {
    const raw = localStorage.getItem("user_profile");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeUserShape(parsed);
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

export function getUserFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return normalizeUserShape({
    ...payload,
    ...(payload?.user || {}),
    ...(payload?.result?.user || {}),
  });
}

export function getAuthUser(token) {
  const fromToken = getUserFromToken(token);
  const fromStorage = getStoredUserProfile();

  if (!fromToken) return fromStorage;
  if (!fromStorage) return fromToken;

  const tokenName =
    fromToken?.name && String(fromToken.name).trim().toLowerCase() !== "user"
      ? fromToken.name
      : null;

  return {
    ...fromStorage,
    ...fromToken,
    name: pickFirst(tokenName, fromStorage.name, fromStorage.email, "User"),
    email: pickFirst(fromToken.email, fromStorage.email),
    role: pickFirst(fromToken.role, fromStorage.role),
    roles:
      Array.isArray(fromToken.roles) && fromToken.roles.length
        ? fromToken.roles
        : Array.isArray(fromStorage.roles)
          ? fromStorage.roles
          : [],
  };
}

export function hasRequiredRole(user, requiredRole) {
  if (!requiredRole) return true;
  if (!user) return false;

  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const normalizedRequired = required.map((role) =>
    String(role || "").toLowerCase()
  );

  const userRoles = new Set(
    [user.role, ...(Array.isArray(user.roles) ? user.roles : [])]
      .filter(Boolean)
      .map((role) => String(role).toLowerCase())
  );

  return normalizedRequired.some((role) => userRoles.has(role));
}
