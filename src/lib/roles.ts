/**
 * Where a signed-in user lands, decided by profiles.role.
 * M1.1 routes only shop / customer.
 */
export function homePathForRole(role: string | null | undefined): string {
  return role === "shop" ? "/shop" : "/barbers";
}
