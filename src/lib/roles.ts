/**
 * Where a signed-in user lands, decided by profiles.role.
 * shop -> shop dashboard; customer -> marketplace.
 * admin -> marketplace for now: /admin/payouts does not exist yet, so we must not strand
 * a newly-promoted admin on a 404. TODO(M2.2): admin -> "/admin/payouts" once the page ships.
 */
export function homePathForRole(role: string | null | undefined): string {
  if (role === "shop") return "/shop";
  return "/barbers";
}
