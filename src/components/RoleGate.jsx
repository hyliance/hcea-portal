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
  const role = user?.role;

  if (!role) return fallback;

  if (allow) {
    const allowed = Array.isArray(allow) ? allow : [allow];
    if (!allowed.includes(role)) return fallback;
  }

  if (deny) {
    const denied = Array.isArray(deny) ? deny : [deny];
    if (denied.includes(role)) return fallback;
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
