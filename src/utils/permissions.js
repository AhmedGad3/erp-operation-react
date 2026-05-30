export function isAdminUser(user) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter(Boolean)
    .map((role) => String(role).toLowerCase());

  return roles.includes("admin");
}
