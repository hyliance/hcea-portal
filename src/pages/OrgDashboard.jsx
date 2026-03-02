import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orgsApi } from '../api';
import { Spinner } from '../components/UI';
import styles from './OrgDashboard.module.css';

export default function OrgDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [org, setOrg]           = useState(null);
  const [players, setPlayers]   = useState([]);
  const [teams, setTeams]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      const myOrg = await orgsApi.getMyOrg(user?.id);
      setOrg(myOrg);
      if (myOrg) {
        const [p, t] = await Promise.all([
          orgsApi.getYouthPlayers(myOrg.id),
          orgsApi.getYouthTeams(myOrg.id),
        ]);
        setPlayers(p);
        setTeams(t);
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) return <Spinner />;

  const loginEnabled  = players.filter(p => p.loginEnabled).length;
  const inTournaments = players.filter(p => p.tournamentIds?.length > 0).length;

  return (
    <div className={styles.wrap}>

      {/* Org hero */}
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🏢</div>
        <div className={styles.heroInfo}>
          <div className={styles.orgName}>{org?.name || 'Your Organization'}</div>
          <div className={styles.orgMeta}>
            <span>{org?.type}</span>
            <span>·</span>
            <span>📍 {org?.location}</span>
            <span>·</span>
            <span className={styles.activeTag}>● Active</span>
          </div>
          <p className={styles.orgDesc}>{org?.description}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        {[
          { label: 'Youth Players',   value: players.length,   icon: '👦', action: () => onNavigate('org_players') },
          { label: 'Teams',           value: teams.length,     icon: '🛡️', action: () => onNavigate('org_teams') },
          { label: 'Login Enabled',   value: loginEnabled,     icon: '🔑', action: () => onNavigate('org_players') },
          { label: 'In Tournaments',  value: inTournaments,    icon: '🏆', action: () => onNavigate('org_tournaments') },
        ].map(s => (
          <button key={s.label} className={styles.statCard} onClick={s.action}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statVal}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Quick Actions</div>
        <div className={styles.actionGrid}>
          {[
            { icon: '➕', label: 'Add Youth Player',   sub: 'Create a new player profile', action: () => onNavigate('org_players') },
            { icon: '🛡️', label: 'Manage Teams',       sub: 'Create teams & assign players', action: () => onNavigate('org_teams') },
            { icon: '🏆', label: 'Register for Events', sub: 'Sign players up for tournaments', action: () => onNavigate('org_tournaments') },
            { icon: '🏅', label: 'Scholarships',       sub: 'Apply on behalf of a player', action: () => onNavigate('org_scholarships') },
          ].map(a => (
            <button key={a.label} className={styles.actionCard} onClick={a.action}>
              <div className={styles.actionIcon}>{a.icon}</div>
              <div>
                <div className={styles.actionLabel}>{a.label}</div>
                <div className={styles.actionSub}>{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent players */}
      {players.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Recent Players
            <button className={styles.viewAll} onClick={() => onNavigate('org_players')}>View All →</button>
          </div>
          <div className={styles.playerPreviewList}>
            {players.slice(0, 5).map(p => (
              <div key={p.id} className={styles.playerPreviewRow}>
                <div className={styles.playerAvatar}>
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div className={styles.playerPreviewInfo}>
                  <div className={styles.playerPreviewName}>{p.firstName} {p.lastName}</div>
                  <div className={styles.playerPreviewMeta}>{p.grade} · {p.games.join(', ')}</div>
                </div>
                <div className={styles.playerPreviewTags}>
                  {p.loginEnabled && <span className={styles.loginTag}>🔑 Has Login</span>}
                  {p.teamIds?.length > 0 && <span className={styles.teamTag}>🛡️ On Team</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
