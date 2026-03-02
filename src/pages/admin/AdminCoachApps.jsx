import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { coachAppApi, coachesApi, GAME_TEAM_SIZES } from '../../api';
import { Spinner, Badge } from '../../components/UI';
import styles from './AdminCoachApps.module.css';

const GAMES = Object.keys(GAME_TEAM_SIZES);
const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_META = {
  pending:      { label:'Pending',      variant:'gold',  next:[{ action:'under_review', label:'🔍 Start Review' },{ action:'rejected', label:'✕ Reject' }] },
  under_review: { label:'Under Review', variant:'blue',  next:[{ action:'approved', label:'✓ Approve' },{ action:'rejected', label:'✕ Reject' }] },
  approved:     { label:'Approved',     variant:'green', next:[{ action:'rejected', label:'↩ Revoke Approval' }] },
  rejected:     { label:'Rejected',     variant:'red',   next:[{ action:'pending', label:'↩ Reopen' }] },
};

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 86400000)  return `${Math.floor(d/3600000)||1}h ago`;
  if (d < 604800000) return `${Math.floor(d/86400000)}d ago`;
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

// ── DETAIL DRAWER ──────────────────────────────────────────────────
function AppDetail({ app, onUpdate, onClose }) {
  const { user } = useAuth();
  const [note, setNote]         = useState(app.reviewNote || '');
  const [saving, setSaving]     = useState('');
  const [rosterDone, setRosterDone] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const meta = STATUS_META[app.status] || STATUS_META.pending;

  const handleAction = async (action) => {
    setSaving(action);
    await coachAppApi.updateStatus(app.id, action, note || undefined, user?.id);
    await onUpdate();
    setSaving('');
  };

  const handleAddToRoster = async () => {
    setRosterLoading(true);
    const res = await coachesApi.addToRoster(app);
    if (res.success) setRosterDone(true);
    setRosterLoading(false);
  };

  const [tab, setTab] = useState('overview');

  const TABS = [
    { id:'overview',  label:'Overview' },
    { id:'background',label:'Background' },
    { id:'philosophy',label:'Philosophy' },
    { id:'experience',label:'Experience' },
    { id:'availability',label:'Availability' },
    { id:'statement', label:'Statement' },
  ];

  return (
    <div className={styles.drawer}>
      <div className={styles.drawerHeader}>
        <div>
          <div className={styles.drawerName}>{app.firstName} {app.lastName}</div>
          <div className={styles.drawerMeta}>{app.email} · {app.location} · Applied {timeAgo(app.submittedAt)}</div>
        </div>
        <div className={styles.drawerHeaderRight}>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <button className={styles.closeDrawer} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Admin action bar */}
      <div className={styles.actionBar}>
        <div className={styles.noteWrap}>
          <input
            className={styles.noteInput}
            placeholder="Add a review note visible to the applicant..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
        <div className={styles.actionBtns}>
          {app.status === 'approved' && (
            <button
              className={`${styles.actionBtn} ${styles.action_roster}`}
              onClick={handleAddToRoster}
              disabled={rosterLoading || rosterDone}
            >
              {rosterDone ? '✓ On Roster' : rosterLoading ? '...' : '🎓 Add to Roster'}
            </button>
          )}
          {meta.next.map(a => (
            <button
              key={a.action}
              className={`${styles.actionBtn} ${styles[`action_${a.action}`]}`}
              onClick={() => handleAction(a.action)}
              disabled={!!saving}
            >
              {saving === a.action ? '...' : a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.drawerTabs}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.drawerTab} ${tab===t.id ? styles.drawerTabOn : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.drawerBody}>
        {tab === 'overview' && (
          <div className={styles.overviewGrid}>
            <InfoCard title="Contact">
              <InfoRow label="Name"     value={`${app.firstName} ${app.lastName}`} />
              <InfoRow label="Email"    value={app.email} />
              <InfoRow label="Phone"    value={app.phone || '—'} />
              <InfoRow label="Location" value={app.location} />
            </InfoCard>
            <InfoCard title="Experience Summary">
              <InfoRow label="Years Playing"  value={`${app.yearsPlaying} years`} />
              <InfoRow label="Years Coaching" value={`${app.yearsCoaching} years`} />
              <InfoRow label="Level"          value={app.competitiveLevel} />
              <InfoRow label="Certifications" value={app.certifications || 'None listed'} />
            </InfoCard>
            <InfoCard title="Games & Ranks">
              {(app.primaryGames||[]).map(g => (
                <InfoRow key={g} label={g} value={(app.gameRanks||{})[g] || 'Not listed'} />
              ))}
            </InfoCard>
            <InfoCard title="Rates">
              <InfoRow label="Member Rate"     value={`$${app.proposedMemberRate}/session`} />
              <InfoRow label="Non-Member Rate" value={`$${app.proposedNonMemberRate}/session`} />
              <InfoRow label="Platform Fee"    value="$20/session" />
              <InfoRow label="Coach Earnings (member)" value={`$${Math.max(0,(app.proposedMemberRate||0)-20)}/session`} />
            </InfoCard>
            <InfoCard title="Target Age Groups" className={styles.fullCol}>
              <div className={styles.tagList}>
                {(app.targetAgeGroups||[]).map(a => <span key={a} className={styles.tag}>{a}</span>)}
              </div>
            </InfoCard>
            {app.reviewNote && (
              <InfoCard title="📝 Current Review Note" className={styles.fullCol}>
                <div className={styles.reviewNoteText}>{app.reviewNote}</div>
                {app.reviewedBy && <div className={styles.reviewedBy}>Last updated by: {app.reviewedBy} · {timeAgo(app.updatedAt)}</div>}
              </InfoCard>
            )}
          </div>
        )}

        {tab === 'background' && (
          <div className={styles.section}>
            <SectionBlock title="Years Playing Competitively" text={`${app.yearsPlaying} years`} />
            <SectionBlock title="Years Coaching Others"       text={`${app.yearsCoaching} years`} />
            <SectionBlock title="Highest Competitive Level"   text={app.competitiveLevel} />
            <div className={styles.sectionBlock}>
              <div className={styles.sectionBlockTitle}>Primary Games & Ranks</div>
              <div className={styles.gameRankTable}>
                {(app.primaryGames||[]).map(g => (
                  <div key={g} className={styles.gameRankRow}>
                    <span className={styles.gameRankGame}>{g}</span>
                    <span className={styles.gameRankRank}>{(app.gameRanks||{})[g] || 'Not provided'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'philosophy' && (
          <div className={styles.section}>
            <SectionBlock title="Coaching Philosophy"  text={app.philosophy} />
            <SectionBlock title="Coaching Style"       text={app.coachingStyle} />
            <div className={styles.sectionBlock}>
              <div className={styles.sectionBlockTitle}>Target Age Groups</div>
              <div className={styles.tagList}>
                {(app.targetAgeGroups||[]).map(a => <span key={a} className={styles.tag}>{a}</span>)}
              </div>
            </div>
          </div>
        )}

        {tab === 'experience' && (
          <div className={styles.section}>
            <SectionBlock title="Experience Description" text={app.experience} />
            {app.certifications && <SectionBlock title="Certifications / Training" text={app.certifications} />}
            {(app.references||[]).length > 0 && (
              <div className={styles.sectionBlock}>
                <div className={styles.sectionBlockTitle}>References ({app.references.length})</div>
                {app.references.map((r, i) => (
                  <div key={i} className={styles.refCard}>
                    <div className={styles.refNum}>#{i+1}</div>
                    <div>
                      <div className={styles.refName}>{r.name}</div>
                      <div className={styles.refRole}>{r.role}</div>
                      <div className={styles.refContact}>{r.contact}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'availability' && (
          <div className={styles.section}>
            <div className={styles.sectionBlock}>
              <div className={styles.sectionBlockTitle}>Available Days</div>
              <div className={styles.dayChips}>
                {DAYS.map((d,i) => (
                  <div key={d} className={`${styles.dayChip} ${(app.availableDays||[]).includes(i) ? styles.dayChipOn : ''}`}>{d}</div>
                ))}
              </div>
            </div>
            <SectionBlock title="Preferred Hours" text={app.preferredHours} />
            <div className={styles.rateBreakdown}>
              <div className={styles.rateRow}><span>Proposed Member Rate</span><strong>${app.proposedMemberRate}/session</strong></div>
              <div className={styles.rateRow}><span>Proposed Non-Member Rate</span><strong>${app.proposedNonMemberRate}/session</strong></div>
              <div className={styles.rateRow + ' ' + styles.rateFee}><span>Platform Fee</span><span>$20/session</span></div>
              <div className={styles.rateRow + ' ' + styles.rateEarnings}><span>Coach Earnings (member)</span><strong>${Math.max(0,(app.proposedMemberRate||0)-20)}/session</strong></div>
            </div>
          </div>
        )}

        {tab === 'statement' && (
          <div className={styles.section}>
            <div className={styles.statementBlock}>
              <div className={styles.statementLabel}>Personal Statement</div>
              <div className={styles.statementText}>"{app.personalStatement}"</div>
              <div className={styles.wordCount}>{(app.personalStatement||'').trim().split(/\s+/).filter(Boolean).length} words</div>
            </div>
            <div className={styles.sectionBlock}>
              <div className={styles.sectionBlockTitle}>Agreements</div>
              <div className={`${styles.agreeRow} ${app.agreedToTerms ? styles.agreeYes : styles.agreeNo}`}>
                {app.agreedToTerms ? '✓' : '✕'} Coach Code of Conduct
              </div>
              <div className={`${styles.agreeRow} ${app.backgroundCheckConsent ? styles.agreeYes : styles.agreeNo}`}>
                {app.backgroundCheckConsent ? '✓' : '✕'} Background Check Consent
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, children, className }) {
  return (
    <div className={`${styles.infoCard} ${className||''}`}>
      <div className={styles.infoCardTitle}>{title}</div>
      {children}
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
function SectionBlock({ title, text }) {
  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sectionBlockTitle}>{title}</div>
      <div className={styles.sectionBlockText}>{text}</div>
    </div>
  );
}

// ── MAIN PANEL ─────────────────────────────────────────────────────
export default function AdminCoachApps() {
  const [apps, setApps]         = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const [all, sum] = await Promise.all([
      coachAppApi.getAll(),
      coachAppApi.getSummary(),
    ]);
    setApps(all);
    setSummary(sum);
    // Refresh selected drawer if open
    if (selected) {
      const refreshed = all.find(a => a.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);

  return (
    <div className={styles.wrap}>
      {/* Summary stats */}
      {summary && (
        <div className={styles.statBar}>
          {[
            { key:'all',          label:'Total',        val: summary.total,        color:'#3b82f6' },
            { key:'pending',      label:'Pending',      val: summary.pending,      color:'#f59e0b' },
            { key:'under_review', label:'Under Review', val: summary.under_review, color:'#3b82f6' },
            { key:'approved',     label:'Approved',     val: summary.approved,     color:'#10b981' },
            { key:'rejected',     label:'Rejected',     val: summary.rejected,     color:'#ef4444' },
          ].map(s => (
            <button
              key={s.key}
              className={`${styles.statBtn} ${filter===s.key ? styles.statBtnOn : ''}`}
              style={{ '--s-color': s.color }}
              onClick={() => setFilter(s.key)}
            >
              <span className={styles.statVal}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.layout}>
        {/* Applications list */}
        <div className={`${styles.list} ${selected ? styles.listNarrow : ''}`}>
          {loading ? <Spinner /> : filtered.length === 0 ? (
            <div className={styles.empty}>No applications with status "{filter}".</div>
          ) : filtered.map(app => {
            const meta = STATUS_META[app.status] || STATUS_META.pending;
            return (
              <div
                key={app.id}
                className={`${styles.appRow} ${selected?.id === app.id ? styles.appRowSelected : ''}`}
                onClick={() => setSelected(selected?.id === app.id ? null : app)}
              >
                <div className={styles.appAvatar} style={{ background: app.status === 'approved' ? '#059669' : app.status === 'rejected' ? '#7f1d1d' : '#1e3a5f' }}>
                  {(app.firstName?.[0]||'?')}{(app.lastName?.[0]||'?')}
                </div>
                <div className={styles.appInfo}>
                  <div className={styles.appName}>{app.firstName} {app.lastName}</div>
                  <div className={styles.appGames}>{(app.primaryGames||[]).join(' · ')}</div>
                  <div className={styles.appSub}>{app.location} · {timeAgo(app.submittedAt)}</div>
                </div>
                <div className={styles.appRight}>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <div className={styles.appRate}>${app.proposedMemberRate}/mo</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail drawer */}
        {selected && (
          <AppDetail
            app={selected}
            onUpdate={load}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
