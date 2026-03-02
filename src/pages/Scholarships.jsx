import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scholarshipsApi } from '../api';
import { Spinner, Badge } from '../components/UI';
import styles from './Scholarships.module.css';

const STATUS_COLORS = { pending: 'gold', approved: 'green', rejected: 'red' };

export default function Scholarships() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState([]);
  const [myApps, setMyApps]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [applying, setApplying]         = useState(null);

  useEffect(() => {
    Promise.all([
      scholarshipsApi.getAll(),
      user ? scholarshipsApi.getMyApplications(user.id) : Promise.resolve([]),
    ]).then(([schs, apps]) => {
      setScholarships(schs);
      setMyApps(apps);
      setLoading(false);
    });
  }, [user]);

  const handleApply = async (s) => {
    setApplying(s.id);
    const res = await scholarshipsApi.apply(s.id, user?.id, { playerName: user?.firstName + ' ' + user?.lastName, school: user?.school || '' });
    if (res.success) {
      setMyApps(prev => [...prev, { id: res.applicationId, scholarshipId: s.id, status: 'pending', submittedAt: new Date().toISOString().split('T')[0] }]);
    }
    setApplying(null);
  };

  const getAppStatus = (schId) => myApps.find(a => a.scholarshipId === schId);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className={styles.hceaBadge}>🎓 HCEA Academy</div>
      <div className={styles.header}>
        <h2>HCEA Scholarships</h2>
        <p>Scholarship programs exclusively for High Caliber Esports Academy members. Active HCEA membership is required to apply. Build your future through esports.</p>
      </div>

      <div className={styles.grid}>
        {scholarships.map(s => (
          <div key={s.id} className={`${styles.card} ${s.featured ? styles.gold : ''}`}>
            <span className={styles.tag}>{s.tag}</span>
            <div className={styles.name}>{s.name}</div>
            <div className={styles.amount}>{s.amount}</div>
            <div className={styles.amountNote}>{s.amountNote}</div>
            <p className={styles.desc}>{s.description}</p>

            <div className={styles.reqs}>
              <div className={styles.reqsTitle}>Requirements</div>
              {s.requirements.map((r, i) => (
                <div key={i} className={styles.reqItem}>→ {r}</div>
              ))}
            </div>

            <div className={styles.deadline}>📅 Deadline: {s.deadline}</div>

            {(() => {
              const app = getAppStatus(s.id);
              return app ? (
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Badge variant={STATUS_COLORS[app.status] || 'blue'}>
                    {app.status === 'pending' ? '⏳ Application Pending' : app.status === 'approved' ? '✓ Approved!' : '✕ Not Selected'}
                  </Badge>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Submitted {app.submittedAt}</span>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', fontSize: '0.85rem', padding: '0.6rem 1.5rem', background: s.featured ? 'var(--gold)' : undefined }}
                  onClick={() => handleApply(s)}
                  disabled={applying === s.id}
                >
                  {applying === s.id ? 'Submitting...' : 'Apply Now'}
                </button>
              );
            })()}
          </div>
        ))}
      </div>

      <div className={styles.statusBox}>
        <div className={styles.statusLabel}>Application Status</div>
        <div className={styles.statusText}>
          Your Higher Caliber Scholarship application is currently{' '}
          <strong style={{ color: 'var(--gold)' }}>in review</strong>.
          You'll be notified at <a href={`mailto:${user?.email}`}>{user?.email}</a> with next steps.
        </div>
      </div>
    </div>
  );
}
