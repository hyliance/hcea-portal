import { useState, useEffect } from 'react';
import { coachesApi, sessionsApi } from '../api';
import { Spinner } from '../components/UI';
import styles from './BookingModal.module.css';

// ─────────────────────────────────────────────
//  Stripe integration:
//  1. npm install @stripe/stripe-js @stripe/react-stripe-js
//  2. Set REACT_APP_STRIPE_PUBLIC_KEY in .env.local
//  3. Replace mock confirmPayment() in handlePayment() below
// ─────────────────────────────────────────────

const ALL_GAMES = [
  { id: 'lol',    label: 'League of Legends', icon: '⚔️' },
  { id: 'val',    label: 'Valorant',           icon: '🎯' },
  { id: 'tft',    label: 'Team Fight Tactics', icon: '♟️' },
  { id: 'rl',     label: 'Rocket League',      icon: '🚀' },
  { id: 'fn',     label: 'Fortnite',           icon: '🏗️' },
  { id: 'smash',  label: 'Smash Bros.',        icon: '💥' },
  { id: 'rivals', label: 'Marvel Rivals',      icon: '🦸' },
];

const FOCUS_AREAS = {
  lol:    ['Laning Phase','Macro Play','Map Control','Champion Pool','Team Fights','Jungle Pathing'],
  val:    ['Aim & Mechanics','Agent Selection','Utility Usage','Team Comps','Rank Push','IGL Calls'],
  tft:    ['Early Economy','Augment Selection','Board Positioning','Trait Synergies','Late Game Pivots'],
  rl:     ['Mechanics','Rotations','Boost Management','Aerial Play','Team Coordination'],
  fn:     ['Building & Editing','Zone Strategy','Loot Efficiency','End Game','Controller Play'],
  smash:  ['Neutral Game','Punish Game','Edgeguarding','Character Matchups','Movement Tech'],
  rivals: ['Hero Selection','Team Comps','Positioning','Ult Management','Communication'],
};

// Pricing rules (set by HCG, not editable by coaches):
//   Non-member: $60/hr  |  Member: 15% off = $51/hr  |  Coach earns: $20/hr (fixed)
const HCG_HOURLY_NON_MEMBER = 60;
const HCG_HOURLY_MEMBER     = Math.round(60 * 0.85); // $51
const COACH_HOURLY_RATE     = 20; // fixed, not editable

const calcPrice = (hrs, isMember) =>
  Math.round((isMember ? HCG_HOURLY_MEMBER : HCG_HOURLY_NON_MEMBER) * hrs);
const calcCoachEarning = (hrs) => Math.round(COACH_HOURLY_RATE * hrs);

const DURATIONS = [
  { id: '1hr',   label: '1 Hour',    hours: 1,   },
  { id: '1.5hr', label: '1.5 Hours', hours: 1.5, },
  { id: '2hr',   label: '2 Hours',   hours: 2,   },
];

const CAL_DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
// STEPS are defined inside the component (dynamic based on preselectedCoach)

export default function BookingModal({ user, preselectedCoach, onClose, onComplete }) {
  const hasPreselected = !!preselectedCoach;
  // When coach is pre-selected, Coach step is removed from the flow
  const STEPS = hasPreselected
    ? ['Game', 'Schedule', 'Payment', 'Done']
    : ['Game', 'Coach', 'Schedule', 'Payment', 'Done'];
  // Map logical step indices (always 0=Game, always has Coach at 1 unless skipped)
  const SCHED_STEP   = hasPreselected ? 1 : 2;
  const PAYMENT_STEP = hasPreselected ? 2 : 3;
  const DONE_STEP    = hasPreselected ? 3 : 4;

  // ── STATE ──
  const [step, setStep]               = useState(0);
  const [allCoaches, setAllCoaches]   = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(!hasPreselected);

  // Step 0 — Game
  const [game, setGame]               = useState(null);
  const [focusArea, setFocusArea]     = useState('');

  // Step 1 — Coach (skipped when preselectedCoach provided)
  const [coach, setCoach]             = useState(preselectedCoach || null);

  // Step 2 — Schedule
  const [duration, setDuration]       = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlot, setTimeSlot]       = useState('');
  const [notes, setNotes]             = useState('');

  // Step 3 — Payment
  const [cardName, setCardName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [cardNum, setCardNum]   = useState('');
  const [cardExp, setCardExp]   = useState('');
  const [cardCvv, setCardCvv]   = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError]       = useState('');

  // ── LOAD ALL COACHES ONCE ──
  useEffect(() => {
    coachesApi.getAll().then(data => { setAllCoaches(data); setLoadingCoaches(false); });
  }, []);

  // ── LOAD AVAILABILITY WHEN ENTERING STEP 2 ──
  useEffect(() => {
    if (step !== SCHED_STEP || !coach) return;
    setLoadingAvail(true);
    setSelectedDate(null);
    setTimeSlot('');
    coachesApi.getAvailability(coach.id, currentDate.getFullYear(), currentDate.getMonth()).then(data => {
      setAvailability(data);
      setLoadingAvail(false);
    });
  }, [step, coach, currentDate]);

  // ── DERIVED ──
  const isMember = !!user?.membershipActive;

  // Coaches that teach the selected game
  const eligibleCoaches = game
    ? allCoaches.filter(c => c.games.some(g => g.id === game.id))
    : allCoaches;

  const year         = currentDate.getFullYear();
  const month        = currentDate.getMonth();
  const monthName    = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const today        = new Date();

  const calCells = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const dayKey   = d => `${year}-${month}-${d}`;
  const isPast   = d => new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isToday  = d => year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
  const hasSlots = d => availability[dayKey(d)]?.length > 0;
  const isSel    = d => selectedDate === dayKey(d);

  const price        = duration ? calcPrice(duration.hours, isMember) : 0;
  const coachEarning = duration ? calcCoachEarning(duration.hours) : 0;

  const selectedDayNum  = selectedDate ? parseInt(selectedDate.split('-')[2]) : null;
  const selectedDisplay = selectedDayNum
    ? new Date(year, month, selectedDayNum).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;
  const selectedSlots = selectedDate ? (availability[selectedDate] || []) : [];

  // Get this game's details from the selected coach
  const coachGameDetails = coach?.games.find(g => g.id === game?.id);

  const canNext = () => {
    if (step === 0) return !!game;
    if (step === 1 && !hasPreselected) return !!coach;
    if (step === SCHED_STEP) return !!duration && !!selectedDate && !!timeSlot;
    if (step === PAYMENT_STEP) return cardName && cardNum.replace(/\s/g,'').length === 16 && cardExp.length === 5 && cardCvv.length >= 3;
    return true;
  };

  // ── PAYMENT ──
  const handlePayment = async () => {
    setProcessing(true);
    setError('');
    try {
      // ── TODO: Replace with real Stripe ────────────────────────────────
      // const { clientSecret } = await fetch('/api/sessions/payment-intent', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ amount: price * 100, userId: user.id })
      // }).then(r => r.json());
      // const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
      // const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      //   payment_method: { card: elements.getElement(CardElement), billing_details: { name: cardName } }
      // });
      // if (stripeError) throw new Error(stripeError.message);
      // ── END Stripe ────────────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 1800));

      const result = await sessionsApi.book({
        userId: user?.id, coachId: coach.id, coachName: coach.name,
        game: game.label, title: `${focusArea || game.label} Session`,
        date: selectedDisplay, dateKey: selectedDate, time: timeSlot,
        duration: duration.label, focusArea, notes, price, status: 'upcoming',
      });

      setStep(DONE_STEP);
      setTimeout(() => onComplete(result.session), 2200);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCard = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExp  = v => { const d = v.replace(/\D/g,'').slice(0,4); return d.length >= 3 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* ── HEADER ── */}
        <div className={styles.head}>
          <div>
            <div className={styles.title}>Book a Coaching Session</div>
            {game && (
              <div className={styles.sub}>
                {game.icon} {game.label}
                {focusArea && ` · ${focusArea}`}
                {coach && ` · ${coach.name}`}
              </div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── STEP INDICATOR ── */}
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s} className={`${styles.stepItem} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
              <div className={styles.stepDot}>{i < step ? '✓' : i + 1}</div>
              <div className={styles.stepLabel}>{s}</div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════
            STEP 0 — GAME SELECTION
        ════════════════════════════════════════ */}
        {step === 0 && (
          <div className={styles.body}>
            {hasPreselected && (
              <div className={styles.preselectedBanner}>
                <div className={styles.preselectedAvatar} style={{ background: preselectedCoach.accentColor }}>{preselectedCoach.initials}</div>
                <div>
                  <div className={styles.preselectedLabel}>Booking with</div>
                  <div className={styles.preselectedName}>{preselectedCoach.name}</div>
                  <div className={styles.preselectedTitle}>{preselectedCoach.title}</div>
                </div>
              </div>
            )}
            <div className={styles.stepTitle}>What game do you want to be coached in?</div>
            <div className={styles.gameGrid}>
              {ALL_GAMES.map(g => (
                <button
                  key={g.id}
                  className={`${styles.gameCard} ${game?.id === g.id ? styles.gameCardOn : ''}`}
                  onClick={() => { setGame(g); setFocusArea(''); setCoach(null); }}
                >
                  <span className={styles.gameIcon}>{g.icon}</span>
                  <span className={styles.gameLabel}>{g.label}</span>
                </button>
              ))}
            </div>

            {game && (
              <div className={styles.focusBox}>
                <div className={styles.fieldLabel}>Focus Area <span className={styles.opt}>(optional)</span></div>
                <div className={styles.focusGrid}>
                  {(FOCUS_AREAS[game.id] || []).map(f => (
                    <button
                      key={f}
                      className={`${styles.focusChip} ${focusArea === f ? styles.focusChipOn : ''}`}
                      onClick={() => setFocusArea(p => p === f ? '' : f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            STEP 1 — COACH SELECTION (filtered by game)
        ════════════════════════════════════════ */}
        {step === 1 && !hasPreselected && (
          <div className={styles.body}>
            <div className={styles.stepTitle}>
              Choose your coach
              {game && <span className={styles.stepSub}> — {eligibleCoaches.length} coach{eligibleCoaches.length !== 1 ? 'es' : ''} available for {game.label}</span>}
            </div>

            {loadingCoaches ? <Spinner /> : eligibleCoaches.length === 0 ? (
              <div className={styles.noCoaches}>
                No coaches are currently available for {game?.label}. Check back soon or choose a different game.
              </div>
            ) : (
              <div className={styles.coachList}>
                {eligibleCoaches.map(c => {
                  const gameDetail = c.games.find(g => g.id === game?.id);
                  const isSelected = coach?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`${styles.coachCard} ${isSelected ? styles.coachCardOn : ''}`}
                      onClick={() => setCoach(c)}
                    >
                      <div className={styles.coachAvatar} style={{ background: c.accentColor }}>
                        {c.initials}
                      </div>
                      <div className={styles.coachInfo}>
                        <div className={styles.coachName}>{c.name}</div>
                        <div className={styles.coachTitle}>{c.title}</div>
                        {gameDetail && (
                          <div className={styles.coachGameDetail}>
                            <span className={styles.rankBadge}>{gameDetail.rank}</span>
                            <span className={styles.specText}>{gameDetail.specialty}</span>
                          </div>
                        )}
                        <div className={styles.coachStats}>
                          <span>⭐ {c.rating.toFixed(1)}</span>
                          <span>·</span>
                          <span>{c.totalSessions}+ sessions</span>
                          <span>·</span>
                          <span>{c.experience}</span>
                        </div>
                      </div>
                      <div className={styles.coachPricing}>
                        <div className={styles.coachRate}>
                          ${isMember ? HCG_HOURLY_MEMBER : HCG_HOURLY_NON_MEMBER}
                          <small>/hr</small>
                        </div>
                        {isMember && <div className={styles.memberTag}>15% member discount</div>}
                        <div className={styles.checkCircle + (isSelected ? ' ' + styles.checkCircleOn : '')}>✓</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Coach bio preview when selected */}
            {coach && (
              <div className={styles.coachBioPreview}>
                <div className={styles.bioPreviewLabel}>About {coach.name.split(' ')[0]}</div>
                <p className={styles.bioPreviewText}>{coach.bio.split('\n\n')[0]}</p>
                <div className={styles.accoladesRow}>
                  {coach.accolades.slice(0, 3).map((a, i) => (
                    <div key={i} className={styles.accoladeChip}>
                      <span>{a.icon}</span> {a.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            STEP 2 — SCHEDULE
        ════════════════════════════════════════ */}
        {step === SCHED_STEP && (
          <div className={styles.body}>
            <div className={styles.stepTitle}>Pick a date & time with {coach?.name.split(' ')[0]}</div>

            {/* Duration */}
            <div className={styles.fieldLabel}>Session Duration</div>
            <div className={styles.durationRow}>
              {DURATIONS.map(d => {
                const p        = calcPrice(d.hours, isMember);
                const nonMemP  = calcPrice(d.hours, false);
                return (
                  <button
                    key={d.id}
                    className={`${styles.durCard} ${duration?.id === d.id ? styles.durCardOn : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    <div className={styles.durLabel}>{d.label}</div>
                    <div className={styles.durPrice}>${p}</div>
                    {isMember && nonMemP !== p && (
                      <div className={styles.durMember}>Was ${nonMemP}</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar */}
            <div className={styles.calWrap}>
              <div className={styles.calHeader}>
                <button className={styles.calNav} onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
                <span className={styles.calMonth}>{monthName}</span>
                <button className={styles.calNav} onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
              </div>
              <div className={styles.calLegend}>
                <span><span className={`${styles.ldot} ${styles.ldotAvail}`}/>Available</span>
                <span><span className={`${styles.ldot} ${styles.ldotNone}`}/>Unavailable</span>
              </div>
              {loadingAvail ? <Spinner /> : (
                <div className={styles.calGrid}>
                  {CAL_DAYS.map(d => <div key={d} className={styles.dayHdr}>{d}</div>)}
                  {calCells.map((day, i) => {
                    if (!day) return <div key={`e${i}`} />;
                    const past  = isPast(day);
                    const avail = hasSlots(day) && !past;
                    const sel   = isSel(day);
                    const tod   = isToday(day);
                    return (
                      <div
                        key={i}
                        onClick={() => { if (!past && avail) { setSelectedDate(p => p === dayKey(day) ? null : dayKey(day)); setTimeSlot(''); } }}
                        className={[styles.day, past ? styles.dayPast : '', avail ? styles.dayAvail : '', sel ? styles.daySel : '', tod ? styles.dayToday : ''].join(' ')}
                      >
                        <span>{day}</span>
                        {avail && <span className={styles.calDot} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className={styles.slotSection}>
                <div className={styles.fieldLabel}>{selectedDisplay}</div>
                <div className={styles.slotGrid}>
                  {selectedSlots.map(s => (
                    <button key={s} className={`${styles.slotBtn} ${timeSlot === s ? styles.slotBtnOn : ''}`} onClick={() => setTimeSlot(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className={styles.fieldLabel}>Notes <span className={styles.opt}>(optional)</span></div>
              <textarea className={styles.textarea} placeholder="Your skill level, specific goals, or anything else..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            STEP 3 — PAYMENT
        ════════════════════════════════════════ */}
        {step === PAYMENT_STEP && (
          <div className={styles.body}>
            <div className={styles.stepTitle}>Complete your booking</div>

            <div className={styles.orderBox}>
              <div className={styles.orderRow}>
                <span className={styles.orderLabel}>Coach</span>
                <span>{coach?.name}</span>
              </div>
              <div className={styles.orderRow}>
                <span className={styles.orderLabel}>Game</span>
                <span>{game?.icon} {game?.label}{focusArea ? ` · ${focusArea}` : ''}</span>
              </div>
              {coachGameDetails && (
                <div className={styles.orderRow}>
                  <span className={styles.orderLabel}>Rank</span>
                  <span className={styles.rankBadge}>{coachGameDetails.rank}</span>
                </div>
              )}
              <div className={styles.orderRow}>
                <span className={styles.orderLabel}>Date & Time</span>
                <span>{selectedDisplay} · {timeSlot}</span>
              </div>
              <div className={styles.orderRow}>
                <span className={styles.orderLabel}>Duration</span>
                <span>{duration?.label}</span>
              </div>
              {isMember && (
                <div className={`${styles.orderRow} ${styles.orderDiscount}`}>
                  <span>🏷️ Member discount (15%)</span>
                  <span>-${calcPrice(duration?.hours || 1, false) - price}</span>
                </div>
              )}
              <div className={`${styles.orderRow} ${styles.orderTotal}`}>
                <span>Total</span>
                <span>${price}.00</span>
              </div>
            </div>

            <div className={styles.cardForm}>
              <div className={styles.stripeNote}>🔒 Secured by Stripe — your card is never stored</div>
              <div className={styles.fg}><label>Name on Card</label><input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="John Doe" /></div>
              <div className={styles.fg}><label>Card Number</label><input value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19} /></div>
              <div className={styles.cardRow}>
                <div className={styles.fg}><label>Expiry</label><input value={cardExp} onChange={e => setCardExp(formatExp(e.target.value))} placeholder="MM/YY" maxLength={5} /></div>
                <div className={styles.fg}><label>CVV</label><input type="password" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/,'').slice(0,4))} placeholder="123" maxLength={4} /></div>
              </div>
              {error && <div className={styles.errorBox}>{error}</div>}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            STEP 4 — CONFIRMED
        ════════════════════════════════════════ */}
        {step === DONE_STEP && (
          <div className={styles.confirmed}>
            <div className={styles.confirmIcon}>✅</div>
            <div className={styles.confirmTitle}>Booking Confirmed!</div>
            <div className={styles.confirmSub}>
              Your session with <strong>{coach?.name}</strong> is set for <strong>{selectedDisplay}</strong> at <strong>{timeSlot}</strong>.
            </div>
            <div className={styles.confirmDetails}>
              <div>{game?.icon} {game?.label}{focusArea ? ` · ${focusArea}` : ''}</div>
              <div>⏱ {duration?.label}</div>
              <div>💳 ${price}.00 charged</div>
              <div>📧 Confirmation sent to {user?.email}</div>
            </div>
            <div className={styles.confirmNote}>
              {coach?.name?.split(' ')[0]} will be in touch before your session to confirm details.
            </div>
          </div>
        )}

        {/* ── FOOTER NAV ── */}
        {step < DONE_STEP && (
          <div className={styles.footer}>
            <button
              className="btn btn-ghost"
              onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
              disabled={processing}
              style={{ fontSize: '0.88rem' }}
            >
              {step === 0 ? 'Cancel' : '← Back'}
            </button>
            {step < PAYMENT_STEP ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                style={{ opacity: canNext() ? 1 : 0.4, fontSize: '0.9rem', clipPath: 'none', padding: '0.7rem 2rem' }}
              >
                Next →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={!canNext() || processing}
                style={{ opacity: canNext() && !processing ? 1 : 0.45, minWidth: '150px', clipPath: 'none', padding: '0.7rem 2rem', fontSize: '0.95rem' }}
              >
                {processing
                  ? <span className={styles.spinner}>Processing...</span>
                  : `Pay $${price}.00 →`}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
