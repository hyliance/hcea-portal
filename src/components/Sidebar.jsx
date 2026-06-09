import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

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
    { id: 'coach_apply',  icon: '📝', label: 'Become a Coach',      section: null },
    // HCEA Academy
    { id: 'hcea_programs',  icon: '📚', label: 'Programs',          section: 'HCEA Academy' },
    { id: 'scholarships',   icon: '🏅', label: 'Scholarships',      section: null },
    // Account
    { id: 'profile',      icon: '👤', label: 'My Profile',          section: 'Account' },
  ],

  // ── LEAGUE ADMIN ──────────────────────────────────────────────
  league_admin: [
    { id: 'dashboard',    icon: '⬛', label: 'Dashboard',           section: 'HCG Platform' },
    { id: 'admin',        icon: '⚙️', label: 'League Admin Panel',  section: null },
    { id: 'community',    icon: '💬', label: 'Social Feed',         section: 'Community' },
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: 'Competitive' },
    { id: 'tournaments',  icon: '🏆', label: 'Tournaments',         section: null },
    { id: 'teams',        icon: '🛡️', label: 'Teams',               section: null },
    { id: 'coaches',      icon: '🎓', label: 'Find a Coach',        section: 'Coaching' },
    { id: 'coach_apply',  icon: '📝', label: 'Become a Coach',      section: null },
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
    { id: 'coach_apply',  icon: '📝', label: 'Become a Coach',      section: null },
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
    { id: 'coach_apply',  icon: '📝', label: 'Become a Coach',      section: null },
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
    { id: 'coaches',          icon: '🎓', label: 'Find a Coach',     section: 'Coaching' },
    { id: 'coach_apply',      icon: '📝', label: 'Become a Coach',   section: null },
    { id: 'profile',          icon: '👤', label: 'My Profile',       section: 'Account' },
  ],

  // ── PLAYER ───────────────────────────────────────────────────
  player: [
    { id: 'dashboard',    icon: '⬛', label: 'Dashboard',           section: 'HCG Platform' },
    { id: 'community',    icon: '💬', label: 'Social Feed',          section: 'Community', minAge: 16 },
    { id: 'clans',        icon: '⚔️', label: 'Clans',                section: null },
    { id: 'teams',        icon: '🛡️', label: 'My Teams',             section: 'Competitive' },
    { id: 'tournaments',  icon: '🏆', label: 'Tournaments',          section: null },
    { id: 'leagues_ladders', icon: '🏅', label: 'Leagues & Ladders', section: null },
    { id: 'cash_match',   icon: '💰', label: 'Cash Matches',          section: null, minAge: 18 },
    { id: 'coaches',      icon: '🎓', label: 'Find a Coach',         section: 'Coaching' },
    { id: 'sessions',     icon: '🎯', label: 'Book a Session',       section: null },
    { id: 'coach_apply',  icon: '📝', label: 'Become a Coach',       section: null },
    { id: 'hcea_programs',  icon: '📚', label: 'HCEA Programs',      section: 'HCEA Academy' },
    { id: 'scholarships',   icon: '🏅', label: 'Scholarships',       section: null },
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

const HCEA_SECTIONS = new Set(['HCEA Academy', 'HCEA Organization']);

function buildSections(navItems) {
  const sections = [];
  let current = null;
  navItems.forEach(item => {
    if (item.section !== null) {
      current = { name: item.section, isHcea: HCEA_SECTIONS.has(item.section), items: [] };
      sections.push(current);
    }
    if (current) current.items.push(item);
  });
  return sections;
}

export default function Sidebar({ activeTab, onTabChange, onBackToSite, open, onClose }) {
  const { user, logout, userAge } = useAuth();
  const role = user?.role || 'player';

  const allItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.player;
  const navItems = allItems.filter(item => {
    if (item.minAge && userAge !== null && userAge < item.minAge) return false;
    return true;
  });

  const sections = buildSections(navItems);

  const [collapsed, setCollapsed] = useState(new Set());

  // Auto-expand the section containing the active tab
  useEffect(() => {
    const activeSection = sections.find(s => s.items.some(i => i.id === activeTab))?.name;
    if (activeSection) {
      setCollapsed(prev => {
        if (!prev.has(activeSection)) return prev;
        const next = new Set(prev);
        next.delete(activeSection);
        return next;
      });
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (name) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleLogout = async () => { await logout(); onBackToSite(); };
  const handleNav    = (id) => { onTabChange(id); onClose?.(); };

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
          {sections.map(section => {
            const isCollapsed = collapsed.has(section.name);
            return (
              <div key={section.name}>
                <button
                  className={`${styles.section} ${section.isHcea ? styles.sectionHcea : ''} ${styles.sectionToggle}`}
                  onClick={() => toggleSection(section.name)}
                >
                  {section.isHcea && <span className={styles.sectionHceaIcon}>🎓</span>}
                  <span className={styles.sectionLabel}>{section.name}</span>
                  <span className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ''}`}>▾</span>
                </button>

                <div className={`${styles.sectionItems} ${isCollapsed ? styles.sectionItemsCollapsed : ''}`}>
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      className={`${styles.item} ${activeTab === item.id ? styles.active : ''} ${section.isHcea ? styles.itemHcea : ''}`}
                      onClick={() => handleNav(item.id)}
                    >
                      <span className={styles.icon}>{item.icon}</span>
                      {item.label}
                      {item.id === 'admin' && <span className={styles.adminDot} />}
                    </button>
                  ))}
                </div>
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
