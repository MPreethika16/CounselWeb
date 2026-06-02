export function getDashboardPath(role) {
  if (role === 'institution') return "/institution-dashboard";
  if (role === 'admin') return "/admin";
  return "/dashboard";
}
