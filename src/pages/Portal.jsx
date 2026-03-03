import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Dashboard from './Dashboard';
import Teams from './Teams';
import Coaches from './Coaches';
import Sessions from './Sessions';
import Tournaments from './Tournaments';
import Programs from './Programs';
import Scholarships from './Scholarships';
import Profile from './Profile';
import AdminPanel from './admin/AdminPanel';
import AdminOrgs from './admin/AdminOrgs';
import OrgDashboard from './OrgDashboard';
import OrgPlayers from './OrgPlayers';
import OrgTeams from './OrgTeams';
import League from './League';
import Ladder from './Ladder';

// ── LEAGUES & LADDERS COMBINED VIEW ──────────────────────────────────────────
function LeaguesAndLadders({ defaultTab = 'league' }) {
  const [tab, setTab] = React.useState(defaultTab);
  return (
    <div>
      <div style={{ display:'flex', gap:'0', borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:'1.2rem' }}>
        {[
          { id: 'league', label: '🏅 Seasonal Leagues' },
          { id: 'ladder', label: '🎮 Ranked Ladder' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none',
            border: 'none',
            borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
            color: tab === t.id ? '#e8f0ff' : '#6b7fa3',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.95rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '0.65rem 1.4rem',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'league' ? <League /> : <Ladder />}
    </div>
  );
}
import SocialFeed from './SocialFeed';
import CashMatch from './CashMatch';
import CoachApplication from './CoachApplication';
import Clans from './Clans';
import RoleGate from '../components/RoleGate';
import styles from './Portal.module.css';

const TAB_TITLES = {
  dashboard:        'Dashboard',
  admin:            '⚙️ Admin Panel',
  orgs:             '🏢 HCEA Organizations',
  clans:            '⚔️ Clans',
  teams:            'Teams',
  coaches:          'Find a Coach',
  sessions:         'Coaching Sessions',
  tournaments:      'Tournaments & Events',
  league:           '🏅 Seasonal League',
  ladder:           '🎮 Ranked Ladder',
  halo_ladder:      '🎮 Ranked Ladder',
  community:        '💬 Social Feed',
  cash_match:       '💰 Cash Matches',
  coach_apply:      '📝 Become a Coach',
  profile:          'My Profile',
  // HCEA section
  hcea_programs:    '🎓 HCEA Programs & Services',
  scholarships:     '🏅 HCEA Scholarships',
  org_dashboard:    '🏢 Org Dashboard',
  org_players:      '👦 Youth Players',
  org_teams:        '🛡️ Youth Teams',
  org_tournaments:  '🏆 Tournaments',
  org_scholarships: '🏅 Scholarships',
};

const ROLE_LABELS = {
  admin: 'HCG Admin', head_admin: 'HCG Head Admin',
  league_admin: 'League Admin', coach: 'Coach',
  player: 'Player', org_manager: 'Org Manager'
};
const ROLE_COLORS = {
  admin: '#ef4444', head_admin: '#7c3aed', league_admin: '#f59e0b',
  coach: '#1d4ed8', player: '#059669', org_manager: '#6366f1'
};

function RolePill({ role }) {
  if (!role) return null;
  return (
    <div className={styles.rolePill} style={{ borderColor: ROLE_COLORS[role], color: ROLE_COLORS[role] }}>
      {ROLE_LABELS[role] || role}
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{ padding:'3rem', textAlign:'center', color:'var(--muted)' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🔒</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', color:'var(--white)', letterSpacing:'0.04em' }}>Access Restricted</div>
      <div style={{ marginTop:'0.5rem', fontSize:'0.9rem' }}>You don't have permission to view this page.</div>
    </div>
  );
}

function AgeGate({ minAge, feature, children }) {
  const { userAge } = useAuth();
  // If age is unknown (null) we allow — they didn't provide DOB
  if (userAge === null || userAge >= minAge) return children;
  return (
    <div style={{ padding:'3rem', textAlign:'center', color:'var(--muted)' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🔞</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', color:'var(--white)', letterSpacing:'0.04em' }}>
        {minAge}+ Required
      </div>
      <div style={{ marginTop:'0.5rem', fontSize:'0.9rem', maxWidth:'360px', margin:'0.5rem auto 0' }}>
        {feature} is only available to users aged {minAge} and older.
        {userAge < 16 && ' The HCEA Academy section is tailored for players under 16.'}
      </div>
    </div>
  );
}

export default function Portal({ onBackToSite }) {
  const { user, isAdmin, isCoach, isOrgManager, canAccessSocial, canAccessCashMatch } = useAuth();

  const defaultTab = (isOrgManager && !isAdmin) ? 'org_dashboard' : 'dashboard';
  const [activeTab, setActiveTab]     = useState(defaultTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCoach, setPendingCoach] = useState(null);

  const handleBookWithCoach = (coach) => { setPendingCoach(coach); setActiveTab('sessions'); };
  const handleTabChange = (tab) => { if (tab !== 'sessions') setPendingCoach(null); setActiveTab(tab); };

  const renderTab = () => {
    switch (activeTab) {

      // ── HCG Admin ──
      case 'admin':
        return <RoleGate allow={['admin','head_admin','league_admin']} fallback={<AccessDenied />}><AdminPanel /></RoleGate>;
      case 'orgs':
        return <RoleGate allow={['admin','head_admin']} fallback={<AccessDenied />}><AdminOrgs /></RoleGate>;

      // ── Org Manager (HCEA) ──
      case 'org_dashboard':
        return <RoleGate allow={['admin','org_manager']} fallback={<AccessDenied />}><OrgDashboard onNavigate={handleTabChange} /></RoleGate>;
      case 'org_players':
        return <RoleGate allow={['admin','org_manager']} fallback={<AccessDenied />}><OrgPlayers /></RoleGate>;
      case 'org_teams':
        return <RoleGate allow={['admin','org_manager']} fallback={<AccessDenied />}><OrgTeams /></RoleGate>;
      case 'org_tournaments':
        return <RoleGate allow={['admin','org_manager']} fallback={<AccessDenied />}><Tournaments /></RoleGate>;
      case 'org_scholarships':
        return <RoleGate allow={['admin','org_manager']} fallback={<AccessDenied />}><Scholarships /></RoleGate>;

      // ── HCG Core ──
      case 'dashboard':    return <Dashboard onNavigate={handleTabChange} />;
      case 'clans':        return <Clans />;
      case 'teams':        return <Teams />;
      case 'tournaments':  return <Tournaments />;
      case 'league':           return <LeaguesAndLadders defaultTab="league" />;
      case 'ladder':           return <LeaguesAndLadders defaultTab="ladder" />;
      case 'halo_ladder':      return <LeaguesAndLadders defaultTab="ladder" />;
      case 'leagues_ladders':  return <LeaguesAndLadders defaultTab="league" />;

      // ── HCG Social — 16+ age gate ──
      case 'community':
        return (
          <AgeGate minAge={16} feature="The Social Feed">
            <SocialFeed />
          </AgeGate>
        );

      // ── HCG Cash Matches — 18+ age gate ──
      case 'cash_match':
        return (
          <AgeGate minAge={18} feature="Cash Matches">
            <CashMatch />
          </AgeGate>
        );

      // ── HCG Coaching ──
      case 'coaches':      return <Coaches onBookWithCoach={handleBookWithCoach} />;
      case 'sessions':     return <Sessions preselectedCoach={pendingCoach} onCoachCleared={() => setPendingCoach(null)} />;
      case 'coach_apply':  return <CoachApplication />;

      // ── HCEA Academy section ──
      case 'hcea_programs':  return <Programs onNavigate={handleTabChange} />;
      case 'scholarships':   return <Scholarships />;

      // ── Profile ──
      case 'profile':      return <Profile />;

      default:
        return (isOrgManager && !isAdmin) ? <OrgDashboard onNavigate={handleTabChange} /> : <Dashboard onNavigate={handleTabChange} />;
    }
  };

  // Determine if the active tab is in HCEA section for topbar styling
  const hceaTabs = new Set(['hcea_programs','scholarships','org_dashboard','org_players','org_teams','org_tournaments','org_scholarships','orgs']);
  const isHceaTab = hceaTabs.has(activeTab);

  return (
    <div className={styles.portal}>
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} onBackToSite={onBackToSite} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className={styles.main}>
        <div className={`${styles.topbar} ${isHceaTab ? styles.topbarHcea : ''}`}>
          <div className={styles.topbarLeft}>
            <button className={styles.hamburger} onClick={() => setSidebarOpen(p => !p)} aria-label="Toggle menu">
              <span /><span /><span />
            </button>
            <button className={styles.homeBtn} onClick={onBackToSite} title="Back to Homepage">🏠</button>
            <div className={styles.topbarBrand}>
              {isHceaTab
                ? <><span className={styles.topbarBrandHcea}>🎓 HCEA</span><span className={styles.topbarSep}>·</span></>
                : <><span className={styles.topbarBrandHcg}>HCG</span><span className={styles.topbarSep}>·</span></>
              }
              <span className={styles.topbarTitle}>{TAB_TITLES[activeTab] || activeTab}</span>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <RolePill role={user?.role} />
            <div className={styles.topbarName}>{user?.firstName} {user?.lastName}</div>
            <div className={styles.topbarAvatar} style={{ background: user?.avatarColor || '#1d4ed8' }}>
              {user?.initials}
            </div>
          </div>
        </div>
        <div className={styles.content}>
          {renderTab()}
        </div>
      </main>
    </div>
  );
}
