import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

// ─────────────────────────────────────────────────────────────────
//  NAV STRUCTURE
//
//  HCG Platform sections (all logged-in users):
//    Community: Social Feed (16+), Clans
//    Competitive: Teams, Tournaments, Leagues & Ladders, Cash Matches (18+)
//    Coaching: Find a Coach, Sessions, Become a Coach
//    HCEA Academy: Programs, Scholarships (separate from HCG)
//    Account: My Profile
//
//  Admin roles:
//    head_admin  — full access to all tabs including HCEA Orgs, Coach Apps, Scholarships, Players
//    league_admin — Leagues, Tournaments, Flags, Flag History, Social Feed mod only
//    admin       — legacy alias = head_admin behavior
// ─────────────────────────────────────────────────────────────────

const NAV_BY_ROLE = {

  // ── HEAD ADMIN (& legacy admin) ───────────────────────────────
  head_admin: [
    { id: 'dashboard',    icon: '⬛', label: 'Dashboard',          section: 'HCG Platform' },
    { id: 'admin',        icon: '⚙️', label: 'Admin Panel',         section: null },
    // Community
    { id: 'community',    icon: '💬', label: 'Social Feed',         section: 'Community' },
    { id: 'clans',        icon: '⚔️', label: 'Clans',               section: null },
    // Competitive
    { id: 'tournaments',  icon: '🏆', label: 'Tournaments',         section: 'Competitive' },
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: null },
    { id: 'teams',        icon: '🛡️', label: 'Teams',               section: null },
    { id: 'cash_match',   icon: '💰', label: 'Cash Matches',         section: null },
    // Coaching
    { id: 'coaches',      icon: '🎓', label: 'Coaches',             section: 'Coaching' },
    { id: 'sessions',     icon: '🎯', label: 'Sessions',            section: null },
    // HCEA Academy — organizations are HCEA-only
    { id: 'hcea_programs',  icon: '📚', label: 'Programs',          section: 'HCEA Academy' },
    { id: 'scholarships',   icon: '🏅', label: 'Scholarships',      section: null },
    // Account
    { id: 'profile',      icon: '👤', label: 'My Profile',          section: 'Account' },
  ],

  // ── LEAGUE ADMIN ──────────────────────────────────────────────
  // Can: run leagues, tournaments, ladders, flagged matches, flag history, social feed mod
  // Cannot: coach apps, scholarship apps, HCEA orgs, player/coach roster management
  league_admin: [
    { id: 'dashboard',    icon: '⬛', label: 'Dashboard',           section: 'HCG Platform' },
    { id: 'admin',        icon: '⚙️', label: 'League Admin Panel',  section: null },
    // Community — social mod only
    { id: 'community',    icon: '💬', label: 'Social Feed',         section: 'Community' },
    // Competitive — full access
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: 'Competitive' },
    { id: 'tournaments',  icon: '🏆', label: 'Tournaments',         section: null },
    { id: 'teams',        icon: '🛡️', label: 'Teams',               section: null },
    // No HCEA section — no orgs, no scholarships, no coach apps
    { id: 'profile',      icon: '👤', label: 'My Profile',          section: 'Account' },
  ],

  // ── LEGACY ADMIN (= head_admin behavior) ─────────────────────
  admin: [
    { id: 'dashboard',    icon: '⬛', label: 'Dashboard',          section: 'HCG Platform' },
    { id: 'admin',        icon: '⚙️', label: 'Admin Panel',         section: null },
    { id: 'community',    icon: '💬', label: 'Social Feed',         section: 'Community' },
    { id: 'clans',        icon: '⚔️', label: 'Clans',               section: null },
    { id: 'tournaments',  icon: '🏆', label: 'Tournaments',         section: 'Competitive' },
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: null },
    { id: 'teams',        icon: '🛡️', label: 'Teams',               section: null },
    { id: 'cash_match',   icon: '💰', label: 'Cash Matches',         section: null },
    { id: 'coaches',      icon: '🎓', label: 'Coaches',             section: 'Coaching' },
    { id: 'sessions',     icon: '🎯', label: 'Sessions',            section: null },
    { id: 'hcea_programs',  icon: '📚', label: 'Programs',          section: 'HCEA Academy' },
    { id: 'scholarships',   icon: '🏅', label: 'Scholarships',      section: null },
    { id: 'profile',      icon: '👤', label: 'My Profile',          section: 'Account' },
  ],

  // ── COACH ────────────────────────────────────────────────────
  coach: [
    { id: 'dashboard',    icon: '⬛', label: 'Dashboard',          section: 'HCG Platform' },
    { id: 'community',    icon: '💬', label: 'Social Feed',         section: 'Community' },
    { id: 'clans',        icon: '⚔️', label: 'Clans',               section: null },
    { id: 'tournaments',  icon: '🏆', label: 'Tournaments',         section: 'Competitive' },
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: null },
    { id: 'teams',        icon: '🛡️', label: 'Teams',               section: null },
    { id: 'cash_match',   icon: '💰', label: 'Cash Matches',         section: null },
    { id: 'sessions',     icon: '🎯', label: 'My Sessions',         section: 'Coaching' },
    { id: 'coaches',      icon: '🎓', label: 'Coach Profile',       section: null },
    { id: 'hcea_programs',icon: '📚', label: 'HCEA Programs',       section: 'HCEA Academy' },
    { id: 'profile',      icon: '👤', label: 'My Profile',          section: 'Account' },
  ],

  // ── ORG MANAGER (HCEA) ───────────────────────────────────────
  org_manager: [
    { id: 'org_dashboard',    icon: '🏢', label: 'Org Dashboard',   section: 'HCEA Organization' },
    { id: 'org_players',      icon: '👦', label: 'Youth Players',    section: null },
    { id: 'org_teams',        icon: '🛡️', label: 'Youth Teams',      section: null },
    { id: 'org_tournaments',  icon: '🏆', label: 'Tournaments',      section: null },
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: null },
    { id: 'org_scholarships', icon: '🏅', label: 'Scholarships',     section: null },
    { id: 'hcea_programs',    icon: '📚', label: 'HCEA Programs',    section: null },
    { id: 'profile',          icon: '👤', label: 'My Profile',       section: 'Account' },
  ],

  // ── PLAYER ───────────────────────────────────────────────────
  player: [
    { id: 'dashboard',    icon: '⬛', label: 'Dashboard',           section: 'HCG Platform' },
    // Community — social feed 16+ age-gated, clans open to all
    { id: 'community',    icon: '💬', label: 'Social Feed',          section: 'Community', minAge: 16 },
    { id: 'clans',        icon: '⚔️', label: 'Clans',                section: null },
    // Competitive
    { id: 'teams',        icon: '🛡️', label: 'My Teams',             section: 'Competitive' },
    { id: 'tournaments',  icon: '🏆', label: 'Tournaments',          section: null },
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: null },
    { id: 'cash_match',   icon: '💰', label: 'Cash Matches',          section: null, minAge: 18 },
    // Coaching
    { id: 'coaches',      icon: '🎓', label: 'Find a Coach',         section: 'Coaching' },
    { id: 'sessions',     icon: '🎯', label: 'Book a Session',       section: null },
    { id: 'coach_apply',  icon: '📝', label: 'Become a Coach',       section: null },
    // HCEA Academy
    { id: 'hcea_programs',  icon: '📚', label: 'HCEA Programs',      section: 'HCEA Academy' },
    { id: 'scholarships',   icon: '🏅', label: 'Scholarships',       section: null },
    // Account
    { id: 'profile',      icon: '👤', label: 'My Profile',           section: 'Account' },
  ],
};

const ROLE_LABELS = {
  admin: 'Administrator', head_admin: 'Head Admin', league_admin: 'League Admin',
  coach: 'Coach', player: 'Player', org_manager: 'Org Manager',
};
const ROLE_COLORS = {
  admin: '#ef4444', head_admin: '#7c3aed', league_admin: '#f59e0b',
  coach: '#1d4ed8', player: '#059669', org_manager: '#6366f1',
};

// Sections that belong to HCEA (get tinted styling)
const HCEA_SECTIONS = new Set(['HCEA Academy', 'HCEA Organization']);

export default function Sidebar({ activeTab, onTabChange, onBackToSite, open, onClose }) {
  const { user, logout, userAge } = useAuth();
  const role = user?.role || 'player';

  // Pick nav list — fall back to player if role not found
  const allItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.player;

  // Filter out age-gated items
  const navItems = allItems.filter(item => {
    if (item.minAge && userAge !== null && userAge < item.minAge) return false;
    return true;
  });

  const handleLogout = async () => { await logout(); onBackToSite(); };
  const handleNav    = (id) => { onTabChange(id); onClose?.(); };

  // Track which section is "current" for each item (for HCEA tint)
  let currentSection = '';
  const itemSections = navItems.map(item => {
    if (item.section) currentSection = item.section;
    return currentSection;
  });

  return (
    <>
      <div className={`${styles.overlay} ${open ? styles.show : ''}`} onClick={onClose} />
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>

        {/* Logo */}
        <div className={styles.logo}>
          High <em>Caliber</em>
          <span className={styles.logoGame}>Gaming</span>
          <span className={styles.logoSub}>Player Portal</span>
        </div>

        {/* User card */}
        {user && (
          <div className={styles.member}>
            <div className={styles.avatar} style={{ background: user.avatarColor || '#1d4ed8' }}>
              {user.initials}
            </div>
            <div className={styles.memberInfo}>
              <div className={styles.memberName}>{user.firstName} {user.lastName}</div>
              {role === 'org_manager' && user.orgName && (
                <div className={styles.orgName}>{user.orgName}</div>
              )}
              <div className={styles.roleBadge} style={{ borderColor: ROLE_COLORS[role], color: ROLE_COLORS[role] }}>
                {ROLE_LABELS[role] || role}
              </div>
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          {navItems.map((item, idx) => {
            const sectionForItem = itemSections[idx];
            const isHceaItem     = HCEA_SECTIONS.has(sectionForItem);
            const showSection    = item.section !== null;

            return (
              <div key={item.id}>
                {showSection && item.section && (
                  <div className={`${styles.section} ${HCEA_SECTIONS.has(item.section) ? styles.sectionHcea : ''}`}>
                    {HCEA_SECTIONS.has(item.section) && <span className={styles.sectionHceaIcon}>🎓</span>}
                    {item.section}
                  </div>
                )}
                <button
                  className={`${styles.item} ${activeTab === item.id ? styles.active : ''} ${isHceaItem ? styles.itemHcea : ''}`}
                  onClick={() => handleNav(item.id)}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  {item.label}
                  {item.id === 'admin' && <span className={styles.adminDot} />}
                </button>
              </div>
            );
          })}
        </nav>

        <div className={styles.bottom}>
          <button className={styles.homeBtn} onClick={onBackToSite}><span>🏠</span> Homepage</button>
          <button className={styles.logout} onClick={handleLogout}><span>🚪</span> Log Out</button>
        </div>
      </aside>
    </>
  );
}
