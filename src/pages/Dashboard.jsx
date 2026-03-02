import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { activityApi } from '../api';
import { StatCard, Badge, Spinner } from '../components/UI';
import styles from './Dashboard.module.css';

export default function Dashboard({ onNavigate }) {
  const { user, isAdmin, isCoach, isOrgManager } = useAuth();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Safe fallback so coach/admin (no stats obj) never crash
  const stats = user?.stats || {};

  useEffect(() => {
    activityApi.getRecent(user?.id).then(data => {
      setActivity(data);
      setLoading(false);
    });
  }, [user?.id]);

  const upcomingEvents = [
    { title: 'TFT Tournament',           date: 'Feb 24 · 5 PM PST',           status: 'Registered', variant: 'green' },
    { title: 'Coaching — LoL Mid Lane',  date: 'Feb 27 · 4:00 PM CST',        status: 'Confirmed',  variant: 'blue'  },
    { title: 'Spring Valorant Cup',      date: 'Mar 15 · Open Registration',   status: 'Register',   variant: 'gold'  },
    { title: 'Rocket League Doubles',    date: 'Mar 29 · Free Entry',          status: 'Open',       variant: 'blue'  },
  ];

  const dotClass = { blue: styles.dotBlue, green: styles.dotGreen, gold: styles.dotGold };

  // ── Role-specific stat cards ──────────────────────────────────
  const renderStats = () => {
    if (isAdmin) return (
      <div className={styles.statsGrid}>
        <StatCard label="Total Players"       value="3"    trend="↑ 1 this month"  trendUp />
        <StatCard label="Active Tournaments"  value="4"    trend="1 live now"      trendUp />
        <StatCard label="Scholarship Apps"    value="2"    trend="● Needs Review"  />
        <StatCard label="Active Members"      value="2"    sub="of 3 registered"   />
      </div>
    );
    if (isCoach) return (
      <div className={styles.statsGrid}>
        <StatCard label="Sessions Coached"    value="200+" trend="↑ 12 this month" trendUp />
        <StatCard label="Active Students"     value="8"    trend="↑ 2 this week"   trendUp />
        <StatCard label="Rating"              value="5.0"  sub="⭐ All-time"        />
        <StatCard label="Games Coached"       value="7"    sub="Across all titles" />
      </div>
    );
    if (isOrgManager) return (
      <div className={styles.statsGrid}>
        <StatCard label="Youth Players"    value="3"    trend="↑ 1 this month"  trendUp />
        <StatCard label="Teams"            value="1"    trend="Active"          trendUp />
        <StatCard label="In Tournaments"   value="0"    sub="Register players" />
        <StatCard label="Scholarship Apps" value="0"    sub="Apply on their behalf" />
      </div>
    );
    // Player (default)
    return (
      <div className={styles.statsGrid}>
        <StatCard label="Sessions Completed"  value={stats.sessionsCompleted  ?? 0} trend="↑ 3 this month" trendUp />
        <StatCard label="Tournaments Entered" value={stats.tournamentsEntered ?? 0} trend="↑ TFT this week" trendUp />
        <StatCard label="Membership"          value={user?.membershipYear ?? '—'}   sub="Active · Renews Jan 2026" />
        <StatCard label="Scholarship Apps"    value={stats.scholarshipApps    ?? 0} trend="● In Review" />
      </div>
    );
  };

  // ── Role-specific quick-action CTAs ──────────────────────────
  const renderCTAs = () => {
    if (isAdmin) return (
      <div className={styles.ctaRow}>
        <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('admin')}>⚙️ Open Admin Panel</button>
        <button className="btn btn-ghost"   style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('tournaments')}>🏆 Manage Tournaments</button>
        <button className="btn btn-ghost"   style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('scholarships')}>🏅 Review Applications</button>
      </div>
    );
    if (isCoach) return (
      <div className={styles.ctaRow}>
        <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('sessions')}>🎯 View My Sessions</button>
        <button className="btn btn-ghost"   style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('coaches')}>🎓 Edit Coach Profile</button>
      </div>
    );
    if (isOrgManager) return (
      <div className={styles.ctaRow}>
        <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('org_players')}>👦 Manage Players</button>
        <button className="btn btn-ghost"   style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('org_teams')}>🛡️ Manage Teams</button>
        <button className="btn btn-ghost"   style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('org_tournaments')}>🏆 Tournaments</button>
      </div>
    );
    return (
      <div className={styles.ctaRow}>
        <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('sessions')}>🎯 Book a Session</button>
        <button className="btn btn-ghost"   style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('teams')}>🛡️ My Teams</button>
        <button className="btn btn-ghost"   style={{ clipPath:'none', padding:'0.65rem 1.5rem', fontSize:'0.88rem' }} onClick={() => onNavigate('tournaments')}>🏆 Tournaments</button>
      </div>
    );
  };

  const roleGreeting = isAdmin ? '⚙️' : isCoach ? '🎓' : isOrgManager ? '🏢' : '👾';

  return (
    <div>
      <div className={styles.welcome}>
        <h2>Welcome back, {user?.firstName} {roleGreeting}</h2>
        <p>Here's what's happening at High Caliber Gaming.</p>
      </div>

      {renderStats()}
      {renderCTAs()}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Recent Activity
            <span onClick={() => {}}>View All</span>
          </div>
          {loading ? <Spinner /> : activity.map(item => (
            <div key={item.id} className={styles.activityItem}>
              <div className={`${styles.dot} ${dotClass[item.dot] || styles.dotBlue}`} />
              <div>
                <div className={styles.activityText} dangerouslySetInnerHTML={{ __html: item.text.replace(/^(.*?) —/, '<strong>$1</strong> —') }} />
                <div className={styles.activityTime}>{item.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Upcoming Events
            <span onClick={() => onNavigate('tournaments')}>All Tournaments</span>
          </div>
          {upcomingEvents.map((ev, i) => (
            <div key={i} className={styles.upcomingItem}>
              <div>
                <div className={styles.upcomingTitle}>{ev.title}</div>
                <div className={styles.upcomingDate}>{ev.date}</div>
              </div>
              <Badge variant={ev.variant}>{ev.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
