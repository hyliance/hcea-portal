import { useState, useEffect } from 'react';
import { coachesApi } from '../api';
import { Spinner } from '../components/UI';
import styles from './CoachProfileModal.module.css';

const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function Stars({ rating, large }) {
  return (
    <span className={`${styles.stars} ${large ? styles.starsLg : ''}`}>
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= Math.round(rating) ? styles.starOn : styles.starOff}>★</span>
      ))}
      <span className={styles.ratingNum}>{rating.toFixed(1)}</span>
    </span>
  );
}

export default function CoachProfileModal({ coach, onClose, onBook }) {
  const [tab, setTab]               = useState('profile');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  useEffect(() => {
    if (tab !== 'availability') return;
    setLoadingAvail(true);
    setSelectedDate(null);
    coachesApi.getAvailability(coach.id, year, month).then(data => {
      setAvailability(data);
      setLoadingAvail(false);
    });
  }, [tab, coach.id, year, month]);

  const calCells = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const dayKey   = d => `${year}-${month}-${d}`;
  const isPast   = d => new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isToday  = d => year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
  const hasSlots = d => availability[dayKey(d)]?.length > 0;
  const isSel    = d => selectedDate === dayKey(d);

  const handleDayClick = d => {
    if (!d || isPast(d) || !hasSlots(d)) return;
    setSelectedDate(prev => prev === dayKey(d) ? null : dayKey(d));
  };

  const selectedDayNum  = selectedDate ? parseInt(selectedDate.split('-')[2]) : null;
  const selectedDisplay = selectedDayNum
    ? new Date(year, month, selectedDayNum).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;
  const selectedSlots   = selectedDate ? (availability[selectedDate] || []) : [];

  const TABS = ['profile', 'games', 'availability', 'reviews'];

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* ── HERO ── */}
        <div className={styles.hero} style={{ '--accent': coach.accentColor }}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <div className={styles.heroAvatar} style={{ background: coach.accentColor }}>
              {coach.initials}
            </div>
            <div className={styles.heroInfo}>
              <div className={styles.heroName}>{coach.name}</div>
              <div className={styles.heroTitle}>{coach.title}</div>
              <div className={styles.heroMeta}>
                <Stars rating={coach.rating} large />
                <span className={styles.heroDot}>·</span>
                <span>{coach.totalSessions}+ Sessions</span>
                <span className={styles.heroDot}>·</span>
                <span>{coach.experience}</span>
                <span className={styles.heroDot}>·</span>
                <span>📍 {coach.location}</span>
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── TABS ── */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className={styles.body}>

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div className={styles.profileTab}>
              <div className={styles.bioSection}>
                <div className={styles.sectionTitle}>About {coach.name.split(' ')[0]}</div>
                {coach.bio.split('\n\n').map((para, i) => (
                  <p key={i} className={styles.bioText}>{para}</p>
                ))}
              </div>

              <div className={styles.philosophyBox}>
                <div className={styles.philosophyQuote}>"</div>
                <p className={styles.philosophyText}>{coach.philosophy}</p>
                <div className={styles.philosophyAuthor}>— {coach.name}</div>
              </div>

              <div className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>Accolades & Achievements</div>
              <div className={styles.accolades}>
                {coach.accolades.map((a, i) => (
                  <div key={i} className={styles.accolade}>
                    <span className={styles.accoladeIcon}>{a.icon}</span>
                    <span className={styles.accoladeText}>{a.text}</span>
                  </div>
                ))}
              </div>

              {(coach.social?.twitter || coach.social?.twitch) && (
                <div className={styles.socialRow}>
                  {coach.social.twitter && (
                    <a href={coach.social.twitter} target="_blank" rel="noreferrer" className={styles.socialBtn}>
                      𝕏 Twitter / X
                    </a>
                  )}
                  {coach.social.twitch && (
                    <a href={coach.social.twitch} target="_blank" rel="noreferrer" className={styles.socialBtn} style={{ borderColor: 'rgba(145,70,255,0.4)', color: '#a855f7' }}>
                      🟣 Twitch
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GAMES TAB */}
          {tab === 'games' && (
            <div className={styles.gamesTab}>
              <div className={styles.sectionTitle}>Games {coach.name.split(' ')[0]} Coaches</div>
              <div className={styles.gamesList}>
                {coach.games.map(g => (
                  <div key={g.id} className={styles.gameRow}>
                    <div className={styles.gameRowIcon}>{g.icon}</div>
                    <div className={styles.gameRowInfo}>
                      <div className={styles.gameRowName}>{g.label}</div>
                      <div className={styles.gameRowSpec}>{g.specialty}</div>
                    </div>
                    <div className={styles.gameRowRank}>
                      <span className={styles.rankLabel}>Peak Rank</span>
                      <span className={styles.rankVal}>{g.rank}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AVAILABILITY TAB */}
          {tab === 'availability' && (
            <div className={styles.availTab}>
              <div className={styles.availInfo}>
                <div>
                  <div className={styles.sectionTitle}>Available Days</div>
                  <div className={styles.availDays}>
                    {DAYS_LONG.map((d, i) => (
                      <span key={d} className={`${styles.availDay} ${coach.availableDays.includes(i) ? styles.availDayOn : styles.availDayOff}`}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={styles.sectionTitle}>Time Slots</div>
                  <div className={styles.timeSlotList}>
                    {coach.availableHours.map(h => (
                      <span key={h} className={styles.timeSlotChip}>{h}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Calendar */}
              <div className={styles.calCard}>
                <div className={styles.calHeader}>
                  <button className={styles.calNav} onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
                  <div className={styles.calMonth}>{monthName}</div>
                  <button className={styles.calNav} onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
                </div>

                <div className={styles.legend}>
                  <span><span className={`${styles.ldot} ${styles.ldotAvail}`}/>Open</span>
                  <span><span className={`${styles.ldot} ${styles.ldotNone}`}/>Unavailable</span>
                </div>

                {loadingAvail ? <Spinner /> : (
                  <div className={styles.calGrid}>
                    {DAYS_SHORT.map(d => <div key={d} className={styles.dayLabel}>{d}</div>)}
                    {calCells.map((day, i) => {
                      if (!day) return <div key={`e${i}`} />;
                      const past  = isPast(day);
                      const avail = hasSlots(day) && !past;
                      const sel   = isSel(day);
                      const tod   = isToday(day);
                      return (
                        <div
                          key={i}
                          onClick={() => handleDayClick(day)}
                          className={[
                            styles.day,
                            past  ? styles.dayPast    : '',
                            avail ? styles.dayAvail   : '',
                            sel   ? styles.daySel     : '',
                            tod   ? styles.dayToday   : '',
                          ].join(' ')}
                          title={avail ? 'Available — click to see times' : past ? 'Past' : 'No availability'}
                        >
                          <span>{day}</span>
                          {avail && <span className={styles.calDot} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedDate && (
                  <div className={styles.slotPanel}>
                    <div className={styles.slotPanelTitle}>Times for <em>{selectedDisplay}</em></div>
                    <div className={styles.slotGrid}>
                      {selectedSlots.map(s => <div key={s} className={styles.slotChip}>{s}</div>)}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', clipPath: 'none', padding: '0.75rem', marginTop: '1rem' }}
                      onClick={onBook}
                    >
                      Book {selectedDisplay} with {coach.name.split(' ')[0]} →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVIEWS TAB */}
          {tab === 'reviews' && (
            <div className={styles.reviewsTab}>
              <div className={styles.reviewsHeader}>
                <div>
                  <div className={styles.bigRating}>{coach.rating.toFixed(1)}</div>
                  <Stars rating={coach.rating} large />
                  <div className={styles.reviewCount}>{coach.reviews.length} reviews</div>
                </div>
                <div className={styles.ratingBars}>
                  {[5,4,3,2,1].map(n => {
                    const count = coach.reviews.filter(r => r.rating === n).length;
                    const pct   = coach.reviews.length ? (count / coach.reviews.length) * 100 : 0;
                    return (
                      <div key={n} className={styles.ratingBarRow}>
                        <span className={styles.ratingBarLabel}>{n}★</span>
                        <div className={styles.ratingBarTrack}>
                          <div className={styles.ratingBarFill} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={styles.ratingBarCount}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.reviewsList}>
                {coach.reviews.map(r => (
                  <div key={r.id} className={styles.reviewCard}>
                    <div className={styles.reviewTop}>
                      <div className={styles.reviewAvatar}>{r.author[0]}</div>
                      <div>
                        <div className={styles.reviewAuthor}>{r.author}</div>
                        <div className={styles.reviewGame}>{r.game} · {r.date}</div>
                      </div>
                      <Stars rating={r.rating} />
                    </div>
                    <p className={styles.reviewText}>"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className={styles.footer}>
          <div className={styles.footerPricing}>
            <span className={styles.footerRate}>${coach.memberRate}<small>/hr member</small></span>
            <span className={styles.footerDivider}>·</span>
            <span className={styles.footerRateAlt}>${coach.nonMemberRate}<small>/hr standard</small></span>
          </div>
          <button className="btn btn-primary" style={{ clipPath: 'none', padding: '0.75rem 2rem' }} onClick={onBook}>
            Book with {coach.name.split(' ')[0]} →
          </button>
        </div>

      </div>
    </div>
  );
}
