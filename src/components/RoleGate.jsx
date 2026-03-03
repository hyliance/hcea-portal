import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────
//  RoleGate — conditionally renders children
//  based on the current user's role.
//
//  Usage:
//    <RoleGate allow="admin">...</RoleGate>
//    <RoleGate allow={['admin','coach']}>...</RoleGate>
//    <RoleGate deny="player">...</RoleGate>
//    <RoleGate allow="admin" fallback={<p>No access</p>}>...</RoleGate>
// ─────────────────────────────────────────────

export default function RoleGate({ allow, deny, fallback = null, children }) {
  const { user } = useAuth();
  // Use full roles array; fall back to primary role string for legacy compat
  const userRoles = user?.roles || (user?.role ? [user.role] : []);

  if (!user || userRoles.length === 0) return fallback;

  // head_admin inherits all admin permissions — treat it as 'admin' for gate checks
  const effectiveRoles = userRoles.includes('head_admin')
    ? [...new Set([...userRoles, 'admin'])]
    : userRoles;

  if (allow) {
    const allowed = Array.isArray(allow) ? allow : [allow];
    if (!effectiveRoles.some(r => allowed.includes(r))) return fallback;
  }

  if (deny) {
    const denied = Array.isArray(deny) ? deny : [deny];
    if (effectiveRoles.some(r => denied.includes(r))) return fallback;
  }

  return children;
}

// Convenience wrappers
export function AdminOnly({ children, fallback = null }) {
  return <RoleGate allow="admin" fallback={fallback}>{children}</RoleGate>;
}

export function CoachOnly({ children, fallback = null }) {
  return <RoleGate allow={['admin','coach']} fallback={fallback}>{children}</RoleGate>;
}

export function PlayerOnly({ children, fallback = null }) {
  return <RoleGate allow="player" fallback={fallback}>{children}</RoleGate>;
}

export function NotPlayer({ children, fallback = null }) {
  return <RoleGate deny="player" fallback={fallback}>{children}</RoleGate>;
}
