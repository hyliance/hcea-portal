import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionsApi } from '../api';
import { Badge, Spinner } from '../components/UI';
import BookingModal from '../components/BookingModal';
import styles from './Sessions.module.css';

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_ABB  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const GAME_COLORS = {
  'League of Legends': { bg:'#1d4ed8', text:'#bfdbfe' },
  'Valorant':          { bg:'#b91c1c', text:'#fecaca' },
  'Rocket League':     { bg:'#b45309', text:'#fde68a' },
  'Fortnite':          { bg:'#065f46', text:'#6ee7b7' },
  'Apex Legends':      { bg:'#4338ca', text:'#c7d2fe' },
  'Smash Bros.':       { bg:'#9d174d', text:'#fbcfe8' },
  'TFT':               { bg:'#6d28d9', text:'#ddd6fe' },
};
const gc = (game) => GAME_COLORS[game] || { bg:'#334155', text:'#94a3b8' };

function buildGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoKey(year, month, day) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// Build a Google Calendar event URL for a single session
function gcalUrl(session) {
  const [datePart] = session.isoDate.split('T');
  // Parse time like "4:00 PM CST" → try to build a datetime
  const timeStr = session.time || '12:00 PM CST';
  const match   = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let hour = match ? parseInt(match[1]) : 12;
  const min  = match ? parseInt(match[2]) : 0;
  const ampm = match ? match[3].toUpperCase() : 'PM';
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  // Duration in minutes
  const durMap = { '1 hour':60, '1.5 hours':90, '2 hours':120 };
  const durMin = durMap[session.duration] || 60;

  const start = new Date(`${datePart}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
  const end   = new Date(start.getTime() + durMin * 60000);

  const fmt = (d) => d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';

  const params = new URLSearchParams({
    action:  'TEMPLATE',
    text:    `Coaching: ${session.title} — ${session.playerName}`,
    dates:   `${fmt(start)}/${fmt(end)}`,
    details: `Game: ${session.game}\nPlayer: ${session.playerName}\nDuration: ${session.duration}\nEarnings: $${session.price}`,
    location:'High Caliber Gaming — Online',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Build an .ics blob for all sessions (Google Calendar import or any calendar app)
function buildICS(sessions) {
  const durMap = { '1 hour':60, '1.5 hours':90, '2 hours':120 };

  const events = sessions.map(s => {
    const match  = (s.time||'').match(/(\d+):(\d+)\s*(AM|PM)/i);
    let hour = match ? parseInt(match[1]) : 12;
    const min  = match ? parseInt(match[2]) : 0;
    const ampm = match ? match[3].toUpperCase() : 'PM';
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const durMin = durMap[s.duration] || 60;
    const start  = new Date(`${s.isoDate}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
    const end    = new Date(start.getTime() + durMin*60000);
    const fmt    = (d) => d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';

    return [
      'BEGIN:VEVENT',
      `UID:hcg-session-${s.id}@highcalibergaming`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:Coaching: ${s.title} — ${s.playerName}`,
      `DESCRIPTION:Game: ${s.game}\\nPlayer: ${s.playerName}\\nDuration: ${s.duration}\\nEarnings: $${s.price}`,
      'LOCATION:High Caliber Gaming — Online',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//High Caliber Gaming//Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

// ─────────────────────────────────────────────────────────────────
//  GOOGLE CALENDAR PANEL
// ─────────────────────────────────────────────────────────────────
function GoogleCalendarPanel({ sessions }) {
  const [open, setOpen]       = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced]   = useState(false);

  const upcoming = sessions.filter(s => s.status === 'upcoming');

  // Download .ics file for all upcoming sessions
  const downloadICS = () => {
    const ics  = buildICS(upcoming);
    const blob = new Blob([ics], { type:'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'hcg-sessions.ics';
    a.click();
    URL.revokeObjectURL(url);
    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  };

  // Simulate "Connect Google Calendar" OAuth flow (real impl requires Google OAuth)
  const connectGoogle = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
      setTimeout(() => setSynced(false), 4000);
    }, 1800);
  };

  return (
    <div className={styles.gcalPanel}>
      <button className={styles.gcalToggle} onClick={() => setOpen(o => !o)}>
        <span className={styles.gcalIcon}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M16 2v4M8 2v4M3 9h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="7" y="13" width="3" height="3" rx="0.5" fill="currentColor"/>
            <rect x="14" y="13" width="3" height="3" rx="0.5" fill="currentColor"/>
          </svg>
        </span>
        Google Calendar
        <span className={styles.gcalChevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.gcalBody}>
          <div className={styles.gcalDesc}>
            Sync your upcoming sessions with Google Calendar or any calendar app that supports .ics files.
          </div>

          {/* Option 1: Google OAuth connect (requires backend in production) */}
          <div className={styles.gcalOption}>
            <div className={styles.gcalOptionHead}>
              <span className={styles.gcalOptionNum}>1</span>
              <div>
                <div className={styles.gcalOptionTitle}>Connect Google Account</div>
                <div className={styles.gcalOptionSub}>Automatically syncs new sessions as they're booked</div>
              </div>
            </div>
            <button
              className={`${styles.gcalBtn} ${syncing ? styles.gcalBtnLoading : ''} ${synced ? styles.gcalBtnDone : ''}`}
              onClick={connectGoogle}
              disabled={syncing}
            >
              {syncing ? '⏳ Connecting…' : synced ? '✓ Connected!' : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{marginRight:'0.4rem'}}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Connect with Google
                </>
              )}
            </button>
          </div>

          <div className={styles.gcalDivider}>or</div>

          {/* Option 2: .ics download */}
          <div className={styles.gcalOption}>
            <div className={styles.gcalOptionHead}>
              <span className={styles.gcalOptionNum}>2</span>
              <div>
                <div className={styles.gcalOptionTitle}>Download .ics File</div>
                <div className={styles.gcalOptionSub}>Import into Google Calendar, Apple Calendar, or Outlook</div>
              </div>
            </div>
            <button className={styles.gcalBtnSecondary} onClick={downloadICS} disabled={upcoming.length === 0}>
              ⬇ Download {upcoming.length} upcoming sessions
            </button>
          </div>

          <div className={styles.gcalDivider}>or add individual sessions</div>

          {/* Option 3: Add each session to Google Calendar individually */}
          <div className={styles.gcalOption}>
            <div className={styles.gcalOptionHead}>
              <span className={styles.gcalOptionNum}>3</span>
              <div>
                <div className={styles.gcalOptionTitle}>Add Sessions One by One</div>
                <div className={styles.gcalOptionSub}>Opens Google Calendar pre-filled for each session</div>
              </div>
            </div>
            <div className={styles.gcalSessionLinks}>
              {upcoming.length === 0 && (
                <div className={styles.gcalNoSessions}>No upcoming sessions to add.</div>
              )}
              {upcoming.map(s => (
                <a
                  key={s.id}
                  href={gcalUrl(s)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.gcalSessionLink}
                >
                  <span className={styles.gcalSessionDot} style={{ background: gc(s.game).bg }} />
                  <span className={styles.gcalSessionInfo}>
                    <span className={styles.gcalSessionTitle}>{s.date} · {s.time}</span>
                    <span className={styles.gcalSessionSub}>{s.playerName} · {s.game}</span>
                  </span>
                  <span className={styles.gcalArrow}>+ Add ↗</span>
                </a>
              ))}
            </div>
          </div>

          <div className={styles.gcalNote}>
            💡 In production, "Connect with Google" uses OAuth 2.0 to write events directly to your calendar via the Google Calendar API.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  BIG CALENDAR
// ─────────────────────────────────────────────────────────────────
function BigCalendar({ sessions, selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prev = () => { if (viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); };
  const next = () => { if (viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); };

  // Build session map: isoDate → [session, ...]
  const sMap = {};
  sessions.forEach(s => { (sMap[s.isoDate] = sMap[s.isoDate]||[]).push(s); });

  const cells    = buildGrid(viewYear, viewMonth);
  const todayStr = today.toISOString().split('T')[0];

  // How many sessions this month (for the header badge)
  const monthStr    = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
  const monthCount  = sessions.filter(s => s.isoDate.startsWith(monthStr)).length;
  const monthEarned = sessions
    .filter(s => s.isoDate.startsWith(monthStr) && s.status==='upcoming')
    .reduce((n,s)=>n+(s.price||0),0);

  return (
    <div className={styles.bigCal}>
      {/* ── Calendar header ── */}
      <div className={styles.bigCalHeader}>
        <div className={styles.bigCalTitleRow}>
          <button className={styles.bigCalNav} onClick={prev}>‹</button>
          <div>
            <div className={styles.bigCalMonth}>{MONTHS[viewMonth]} {viewYear}</div>
            <div className={styles.bigCalMeta}>
              {monthCount} session{monthCount!==1?'s':''} this month
              {monthEarned > 0 && <span className={styles.bigCalEarned}> · ${monthEarned} pending</span>}
            </div>
          </div>
          <button className={styles.bigCalNav} onClick={next}>›</button>
        </div>
      </div>

      {/* ── Day-of-week header row ── */}
      <div className={styles.bigCalDayNames}>
        {DAYS_ABB.map(d => <div key={d} className={styles.bigCalDayName}>{d}</div>)}
      </div>

      {/* ── Day cells ── */}
      <div className={styles.bigCalGrid}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} className={styles.bigCalCellEmpty} />;

          const key         = isoKey(viewYear, viewMonth, day);
          const daySess     = sMap[key] || [];
          const isToday     = key === todayStr;
          const isSelected  = key === selectedDate;
          const hasUpcoming = daySess.some(s=>s.status==='upcoming');
          const hasDone     = daySess.some(s=>s.status==='completed');

          return (
            <div
              key={key}
              className={[
                styles.bigCalCell,
                daySess.length ? styles.bigCalCellActive : '',
                isToday        ? styles.bigCalCellToday  : '',
                isSelected     ? styles.bigCalCellSel    : '',
              ].join(' ')}
              onClick={() => daySess.length && onSelectDate(isSelected ? null : key)}
            >
              {/* Day number */}
              <div className={styles.bigCalDayNum}>
                <span className={isToday ? styles.bigCalTodayBadge : ''}>{day}</span>
                {daySess.length > 0 && (
                  <span className={styles.bigCalDayCount}>
                    {daySess.length}
                  </span>
                )}
              </div>

              {/* Session chips inside the cell */}
              <div className={styles.bigCalEvents}>
                {daySess.slice(0,3).map((s,i) => {
                  const { bg, text } = gc(s.game);
                  return (
                    <div
                      key={s.id}
                      className={styles.bigCalChip}
                      style={{ background: bg+'22', borderLeft: `2px solid ${bg}`, color: text }}
                    >
                      <span className={styles.bigCalChipTime}>{s.time.replace(' CST','').replace(' CDT','')}</span>
                      <span className={styles.bigCalChipName}>{s.playerName?.split(' ')[0]}</span>
                      <span className={styles.bigCalChipGame}>{s.game.split(' ').slice(0,2).join(' ')}</span>
                    </div>
                  );
                })}
                {daySess.length > 3 && (
                  <div className={styles.bigCalMore}>+{daySess.length-3} more</div>
                )}
              </div>

              {/* Status dots at bottom */}
              {daySess.length > 0 && (
                <div className={styles.bigCalDots}>
                  {hasUpcoming && <span className={styles.bigCalDotUpcoming}/>}
                  {hasDone     && <span className={styles.bigCalDotDone}/>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className={styles.bigCalLegend}>
        <div className={styles.bigCalLegendItem}>
          <span className={styles.bigCalDotUpcoming}/>Upcoming
        </div>
        <div className={styles.bigCalLegendItem}>
          <span className={styles.bigCalDotDone}/>Completed
        </div>
        {Object.entries(GAME_COLORS)
          .filter(([g]) => sessions.some(s=>s.game===g))
          .map(([g,c]) => (
            <div key={g} className={styles.bigCalLegendItem}>
              <span className={styles.bigCalLegendDot} style={{background:c.bg}}/>
              {g}
            </div>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SESSION CARD
// ─────────────────────────────────────────────────────────────────
function SessionCard({ session: s, isCoach, onCancel }) {
  const { bg } = gc(s.game);
  return (
    <div className={styles.card}>
      <div className={styles.cardAccent} style={{ background: s.status==='upcoming' ? 'var(--bright)' : 'var(--green)' }} />
      <div className={styles.cardBody}>
        <div className={styles.cardGame} style={{ color: gc(s.game).bg }}>{s.game}</div>
        <div className={styles.cardTitle}>{s.title}</div>
        <div className={styles.cardMeta}>
          {isCoach
            ? <><span>👤 {s.playerName||'Player'}</span>{s.duration&&<span> · {s.duration}</span>}</>
            : <>{s.coach&&<span>Coach {s.coach}</span>}{s.coach&&s.duration&&' · '}{s.duration&&<span>{s.duration}</span>}</>
          }
        </div>
      </div>
      <div className={styles.cardRight}>
        <div className={styles.cardDate}>{s.date}</div>
        <div className={styles.cardTime}>{s.time}</div>
        {isCoach && (s.coachEarning ?? s.price) !== undefined && (
          <div className={styles.cardPrice}>+${s.coachEarning ?? Math.round((s.price||0)/3)}</div>
        )}
        <Badge variant={s.status==='completed'?'green':'gold'}>
          {s.status==='completed'?'Completed':'Upcoming'}
        </Badge>
        {isCoach && s.status==='upcoming' && (
          <a href={gcalUrl(s)} target="_blank" rel="noreferrer" className={styles.gcalCardLink}>
            + Google Cal
          </a>
        )}
        {onCancel && <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COACH SESSIONS VIEW
// ─────────────────────────────────────────────────────────────────
function CoachSessionsView({ sessions, loading }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const display   = selectedDate ? sessions.filter(s=>s.isoDate===selectedDate) : sessions;
  const upcoming  = display.filter(s=>s.status==='upcoming');
  const completed = display.filter(s=>s.status==='completed');

  const totalUpcoming  = sessions.filter(s=>s.status==='upcoming').length;
  const totalCompleted = sessions.filter(s=>s.status==='completed').length;
  const totalEarned    = sessions.filter(s=>s.status==='completed').reduce((n,s)=>n+(s.coachEarning||s.price||0),0);
  const totalPending   = sessions.filter(s=>s.status==='upcoming').reduce((n,s)=>n+(s.coachEarning||s.price||0),0);

  return (
    <>
      {/* Stats bar */}
      <div className={styles.coachStats}>
        {[
          { label:'Upcoming',  value:totalUpcoming,      color:'#f59e0b' },
          { label:'Completed', value:totalCompleted,     color:'#10b981' },
          { label:'Earned',    value:`$${totalEarned}`,  color:'#3b82f6' },
          { label:'Pending',   value:`$${totalPending}`, color:'#a78bfa' },
        ].map(stat => (
          <div key={stat.label} className={styles.coachStat}>
            <div className={styles.coachStatVal} style={{color:stat.color}}>{stat.value}</div>
            <div className={styles.coachStatLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Google Calendar panel */}
      <GoogleCalendarPanel sessions={sessions} />

      {loading ? <Spinner /> : (
        <>
          {/* Big calendar — full width */}
          <BigCalendar
            sessions={sessions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Session list below calendar */}
          <div className={styles.listSection}>
            {selectedDate && (
              <div className={styles.dateFilterBanner}>
                <span>
                  📅 <strong>
                    {new Date(selectedDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
                  </strong>
                  {' '}— {display.length} session{display.length!==1?'s':''}
                </span>
                <button className={styles.clearDateBtn} onClick={()=>setSelectedDate(null)}>
                  ✕ Show all
                </button>
              </div>
            )}

            {display.length === 0 ? (
              <div className={styles.calEmpty}>
                <div style={{fontSize:'2rem'}}>📅</div>
                <div>{selectedDate?'No sessions on this day.':'No sessions scheduled yet.'}</div>
              </div>
            ) : null}

            {upcoming.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <div className={styles.sectionTitle}>Upcoming</div>
                  <span className={styles.badge}>{upcoming.length}</span>
                </div>
                <div className={styles.list}>
                  {upcoming.map(s=><SessionCard key={s.id} session={s} isCoach/>)}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <div className={styles.sectionTitle}>Completed</div>
                  <span className={styles.badge}>{completed.length}</span>
                </div>
                <div className={styles.list}>
                  {completed.map(s=><SessionCard key={s.id} session={s} isCoach/>)}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────────────────────────
export default function Sessions({ preselectedCoach, onCoachCleared }) {
  const { user, isCoach } = useAuth();
  const [sessions, setSessions]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showBooking, setShowBooking] = useState(!!preselectedCoach);

  useEffect(() => { if(preselectedCoach) setShowBooking(true); }, [preselectedCoach]);

  useEffect(() => {
    const req = isCoach ? sessionsApi.getAllCoach('coach_zach') : sessionsApi.getAll(user?.id);
    req.then(data => { setSessions(data); setLoading(false); });
  }, [user?.id, isCoach]);

  const handleBookingComplete = (s) => { setSessions(p=>[...p,s]); setShowBooking(false); if(onCoachCleared) onCoachCleared(); };
  const handleCloseModal      = ()  => { setShowBooking(false); if(onCoachCleared) onCoachCleared(); };

  // ── COACH ──
  if (isCoach) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h2>My Sessions</h2>
            <p>Your scheduled coaching sessions and earnings at a glance.</p>
          </div>
        </div>

        {/* Rate structure — read-only, set by HCG */}
        <div className={styles.ratePanel}>
          <div className={styles.ratePanelTitle}>
            💰 HCG Coaching Rate Structure
            <span className={styles.ratePanelLocked}>🔒 Platform managed · Not editable</span>
          </div>
          <div className={styles.rateGrid}>
            <div className={styles.rateRow}>
              <span className={styles.rateLabel}>Non-member rate</span>
              <span className={styles.rateVal}>$60 / hr</span>
            </div>
            <div className={styles.rateRow}>
              <span className={styles.rateLabel}>Member rate <span className={styles.rateDiscount}>15% off</span></span>
              <span className={styles.rateVal}>$51 / hr</span>
            </div>
            <div className={styles.rateDivider} />
            <div className={styles.rateRow}>
              <span className={styles.rateLabel}>1.5 hr session</span>
              <span className={styles.rateVal} style={{color:'var(--muted)', fontSize:'0.82rem'}}>$90 / $77 (member)</span>
            </div>
            <div className={styles.rateRow}>
              <span className={styles.rateLabel}>2 hr session</span>
              <span className={styles.rateVal} style={{color:'var(--muted)', fontSize:'0.82rem'}}>$120 / $102 (member)</span>
            </div>
            <div className={styles.rateDivider} />
            <div className={`${styles.rateRow} ${styles.rateRowEarnings}`}>
              <span className={styles.rateLabel}>Your earnings</span>
              <span className={styles.rateEarnings}>$20 / hr · $30 / 1.5hr · $40 / 2hr</span>
            </div>
          </div>
        </div>

        <CoachSessionsView sessions={sessions} loading={loading} />
      </div>
    );
  }

  // ── PLAYER ──
  const upcoming  = sessions.filter(s=>s.status==='upcoming');
  const completed = sessions.filter(s=>s.status==='completed');

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div><h2>Coaching Sessions</h2><p>Your upcoming and past sessions with HCG coaches.</p></div>
        <button className="btn btn-primary" onClick={()=>setShowBooking(true)}>+ Book a Session</button>
      </div>
      <div className={styles.pricingRow}>
        {[
          {label:user?'Member · 1 Hour':'1 Hour', price:user?'$45':'$60'},
          {label:'1.5 Hours', price:user?'$65':'$85'},
          {label:'2 Hours',   price:user?'$85':'$110'},
          {label:'Available Coaches', price:'1'},
        ].map(p=>(
          <div key={p.label} className={styles.pill}>
            <span className={styles.pillLabel}>{p.label}</span>
            <span className={styles.pillVal}>{p.price}</span>
          </div>
        ))}
        {user && <div className={styles.memberNote}>🏷️ Member pricing applied</div>}
      </div>
      {loading ? <Spinner /> : (
        <>
          {upcoming.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHead}><div className={styles.sectionTitle}>Upcoming</div><span className={styles.badge}>{upcoming.length}</span></div>
              <div className={styles.list}>
                {upcoming.map(s=>(
                  <SessionCard key={s.id} session={s} isCoach={false}
                    onCancel={()=>{if(window.confirm('Cancel this session? Refunds take 5–7 business days.')) setSessions(p=>p.filter(x=>x.id!==s.id));}}/>
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHead}><div className={styles.sectionTitle}>Past Sessions</div><span className={styles.badge}>{completed.length}</span></div>
              <div className={styles.list}>{completed.map(s=><SessionCard key={s.id} session={s} isCoach={false}/>)}</div>
            </div>
          )}
          {sessions.length===0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🎮</div>
              <div className={styles.emptyTitle}>No sessions yet</div>
              <p className={styles.emptyText}>Book a session to start leveling up. Pick your game, choose a coach, and get scheduled — all in a few clicks.</p>
              <button className="btn btn-primary" style={{clipPath:'none',padding:'0.75rem 2rem'}} onClick={()=>setShowBooking(true)}>Book Your First Session →</button>
            </div>
          )}
        </>
      )}
      {showBooking && <BookingModal preselectedCoach={preselectedCoach||null} user={user} onClose={handleCloseModal} onComplete={handleBookingComplete}/>}
    </div>
  );
}
