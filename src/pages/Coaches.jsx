### FILE: pages\Coaches.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { coachesApi } from '../api';
import { Spinner } from '../components/UI';
import CoachProfileModal from '../components/CoachProfileModal';
import styles from './Coaches.module.css';

const ALL_GAMES = ['League of Legends', 'Valorant', 'TFT', 'Rocket League', 'Fortnite', 'Smash Bros.', 'Marvel Rivals'];
const GAME_ICONS = { 'League of Legends':'⚔️', 'Valorant':'🎯', 'TFT':'♟️', 'Rocket League':'🚀', 'Fortnite':'🏗️', 'Smash Bros.':'💥', 'Marvel Rivals':'🦸' };
const GAME_IDS   = { 'League of Legends':'lol', 'Valorant':'val', 'TFT':'tft', 'Rocket League':'rl', 'Fortnite':'fn', 'Smash Bros.':'smash', 'Marvel Rivals':'rivals' };
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = ['8:00 AM CST','9:00 AM CST','10:00 AM CST','11:00 AM CST','11:30 AM CST','12:00 PM CST','1:00 PM CST','2:00 PM CST','2:30 PM CST','3:00 PM CST','4:00 PM CST','4:30 PM CST','5:00 PM CST','5:30 PM CST','6:00 PM CST','7:00 PM CST','8:00 PM CST'];

function Stars({ rating }) {
  return (
    <div className={styles.stars}>
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= Math.round(rating) ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
      <span className={styles.ratingNum}>{rating.toFixed(1)}</span>
    </div>
  );
}

function CoachCard({ coach, onViewProfile, onBookNow }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.avatar} style={{ background: coach.accentColor }}>{coach.initials}</div>
        <div className={styles.headInfo}>
          <div className={styles.coachName}>{coach.name}</div>
          <div className={styles.coachTitle}>{coach.title}</div>
          <Stars rating={coach.rating} />
        </div>
        <div className={styles.headMeta}>
          <div className={styles.metaItem}><span className={styles.metaLabel}>Experience</span><span className={styles.metaVal}>{coach.experience}</span></div>
          <div className={styles.metaItem}><span className={styles.metaLabel}>Sessions</span><span className={styles.metaVal}>{coach.totalSessions}+</span></div>
        </div>
      </div>
      <div className={styles.cardSection}>
        <div className={styles.sectionLabel}>Games Coached</div>
        <div className={styles.gamesRow}>
          {coach.games.map(g => (
            <div key={g.id} className={styles.gameChip}>
              <span>{g.icon}</span>
              <div><div className={styles.chipGame}>{g.label}</div><div className={styles.chipRank}>{g.rank}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.cardSection}>
        <div className={styles.sectionLabel}>Weekly Availability</div>
        <div className={styles.dayPills}>
          {DAY_NAMES.map((d, i) => (
            <span key={d} className={`${styles.dayPill} ${coach.availableDays.includes(i) ? styles.dayPillOn : styles.dayPillOff}`}>{d}</span>
          ))}
        </div>
        <div className={styles.hoursNote}>{coach.availableHours[0]} – {coach.availableHours[coach.availableHours.length - 1]}</div>
      </div>
      <div className={styles.cardSection}>
        <div className={styles.pricingRow}>
          <div className={styles.priceBox}><span className={styles.priceBoxLabel}>Member Rate</span><span className={styles.priceBoxVal}>$51<small>/hr</small></span></div>
          <div className={styles.priceBox}><span className={styles.priceBoxLabel}>Standard Rate</span><span className={styles.priceBoxVal} style={{ color: 'var(--silver)' }}>$60<small>/hr</small></span></div>
        </div>
      </div>
      <div className={styles.cardActions}>
        <button className="btn btn-ghost" style={{ flex:1, fontSize:'0.85rem', padding:'0.6rem', clipPath:'none' }} onClick={() => onViewProfile(coach)}>View Profile</button>
        <button className="btn btn-primary" style={{ flex:1, fontSize:'0.85rem', padding:'0.6rem', clipPath:'none' }} onClick={() => onBookNow(coach)}>Book Session</button>
      </div>
    </div>
  );
}

// ── COACH EDIT PANEL ─────────────────────────────────────────────
function CoachEditPanel({ coach, onSaved }) {
  const [form, setForm]         = useState({ ...coach });
  const [tab, setTab]           = useState('profile');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Games helpers
  const toggleGame = (gameName) => {
    const id = GAME_IDS[gameName];
    const icon = GAME_ICONS[gameName];
    const exists = form.games.find(g => g.id === id);
    if (exists) {
      set('games', form.games.filter(g => g.id !== id));
    } else {
      set('games', [...form.games, { id, label: gameName, icon, rank: '', specialty: '' }]);
    }
  };

  const updateGame = (id, field, value) => {
    set('games', form.games.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  // Availability helpers
  const toggleDay = (dayIdx) => {
    const days = form.availableDays.includes(dayIdx)
      ? form.availableDays.filter(d => d !== dayIdx)
      : [...form.availableDays, dayIdx].sort();
    set('availableDays', days);
  };

  const toggleTimeSlot = (slot) => {
    const hours = form.availableHours.includes(slot)
      ? form.availableHours.filter(h => h !== slot)
      : [...form.availableHours, slot];
    set('availableHours', hours);
  };

  // Accolades helpers
  const updateAccolade = (i, field, val) => {
    const updated = [...form.accolades];
    updated[i] = { ...updated[i], [field]: val };
    set('accolades', updated);
  };
  const addAccolade    = () => set('accolades', [...form.accolades, { icon: '⭐', text: '' }]);
  const removeAccolade = (i) => set('accolades', form.accolades.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    await coachesApi.update(coach.id, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved(form);
  };

  const TABS = [
    { id: 'profile',      label: '👤 Profile & Bio' },
    { id: 'games',        label: '🎮 Games' },
    { id: 'availability', label: '📅 Availability' },
    { id: 'accolades',    label: '🏆 Accolades' },
  ];

  return (
    <div className={styles.editPanel}>
      <div className={styles.editHeader}>
        <div>
          <div className={styles.editTitle}>Edit Coach Profile</div>
          <div className={styles.editSub}>Changes update your public profile immediately.</div>
        </div>
        <div className={styles.editActions}>
          {saved && <span className={styles.savedNote}>✓ Saved!</span>}
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.8rem' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Edit tabs */}
      <div className={styles.editTabs}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.editTab} ${tab === t.id ? styles.editTabOn : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.editBody}>

        {/* ── PROFILE & BIO ── */}
        {tab === 'profile' && (
          <div className={styles.editSection}>
            <div className={styles.formRow}>
              <div className={styles.fg}>
                <label>Display Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className={styles.fg}>
                <label>Title</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Head Coach & Founder" />
              </div>
              <div className={styles.fg}>
                <label>Experience</label>
                <input value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="20+ Years" />
              </div>
              <div className={styles.fg}>
                <label>Location</label>
                <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Rapid City, SD" />
              </div>
            </div>
            <div className={styles.fg}>
              <label>Bio</label>
              <textarea rows={6} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Write your coaching background, achievements, and approach..." />
            </div>
            <div className={styles.fg}>
              <label>Coaching Philosophy</label>
              <textarea rows={3} value={form.philosophy} onChange={e => set('philosophy', e.target.value)} placeholder="Your coaching philosophy or signature quote..." />
            </div>
            <div className={styles.formRow}>
              <div className={styles.fg}>
                <label>Twitter / X URL</label>
                <input value={form.social?.twitter || ''} onChange={e => set('social', { ...form.social, twitter: e.target.value })} placeholder="https://twitter.com/yourhandle" />
              </div>
              <div className={styles.fg}>
                <label>Twitch URL</label>
                <input value={form.social?.twitch || ''} onChange={e => set('social', { ...form.social, twitch: e.target.value })} placeholder="https://twitch.tv/yourchannel" />
              </div>
            </div>
          </div>
        )}

        {/* ── GAMES ── */}
        {tab === 'games' && (
          <div className={styles.editSection}>
            <div className={styles.editLabel}>Select games you coach, then fill in your rank and specialty.</div>
            <div className={styles.gameToggleGrid}>
              {ALL_GAMES.map(g => {
                const id = GAME_IDS[g];
                const active = form.games.some(fg => fg.id === id);
                return (
                  <button key={g} className={`${styles.gameToggle} ${active ? styles.gameToggleOn : ''}`} onClick={() => toggleGame(g)}>
                    <span>{GAME_ICONS[g]}</span> {g}
                  </button>
                );
              })}
            </div>
            {form.games.length > 0 && (
              <div className={styles.gameDetails}>
                <div className={styles.editLabel} style={{ marginTop:'1rem' }}>Game Details</div>
                {form.games.map(g => (
                  <div key={g.id} className={styles.gameDetailRow}>
                    <div className={styles.gameDetailName}>{g.icon} {g.label}</div>
                    <div className={styles.fg}>
                      <label>Your Rank</label>
                      <input value={g.rank} onChange={e => updateGame(g.id, 'rank', e.target.value)} placeholder="Diamond II" />
                    </div>
                    <div className={styles.fg}>
                      <label>Specialty / Focus</label>
                      <input value={g.specialty} onChange={e => updateGame(g.id, 'specialty', e.target.value)} placeholder="Mid Lane / Macro Play" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AVAILABILITY ── */}
        {tab === 'availability' && (
          <div className={styles.editSection}>
            <div className={styles.fg}>
              <label>Available Days</label>
              <div className={styles.dayToggleRow}>
                {DAY_NAMES.map((d, i) => (
                  <button key={d} className={`${styles.dayToggle} ${form.availableDays.includes(i) ? styles.dayToggleOn : ''}`} onClick={() => toggleDay(i)}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.fg}>
              <label>Available Time Slots</label>
              <div className={styles.timeSlotGrid}>
                {TIME_SLOTS.map(slot => (
                  <button key={slot} className={`${styles.timeSlot} ${form.availableHours.includes(slot) ? styles.timeSlotOn : ''}`} onClick={() => toggleTimeSlot(slot)}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ACCOLADES ── */}
        {tab === 'accolades' && (
          <div className={styles.editSection}>
            <div className={styles.editLabel}>Accolades appear on your public profile under the bio.</div>
            {form.accolades.map((a, i) => (
              <div key={i} className={styles.accoladeRow}>
                <input className={styles.emojiInput} value={a.icon} onChange={e => updateAccolade(i, 'icon', e.target.value)} maxLength={2} />
                <input className={styles.accoladeText} value={a.text} onChange={e => updateAccolade(i, 'text', e.target.value)} placeholder="Accolade description..." />
                <button className={styles.removeBtn} onClick={() => removeAccolade(i)}>✕</button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addAccolade}>+ Add Accolade</button>
          </div>
        )}



      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function Coaches({ onBookWithCoach }) {
  const { user, isCoach, isAdmin, isHeadAdmin } = useAuth();
  const canEditCoachProfile = isCoach || isHeadAdmin;
  const [coaches, setCoaches]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterGame, setFilterGame]     = useState('all');
  const [profileCoach, setProfileCoach] = useState(null);
  // Coaches and admins see edit mode by default when landing here
  const [editMode, setEditMode]         = useState(canEditCoachProfile);
  const [myCoach, setMyCoach]           = useState(null);

  useEffect(() => {
    coachesApi.getAll().then(data => {
      setCoaches(data);
      // Find the coach profile that matches the logged-in coach user
      if (canEditCoachProfile && user?.coachId) {
        const mine = data.find(c => c.id === user.coachId);
        if (mine) setMyCoach(mine);
      }
      setLoading(false);
    });
  }, [canEditCoachProfile, user?.coachId]);

  const handleSaved = (updatedCoach) => {
    setCoaches(prev => prev.map(c => c.id === updatedCoach.id ? updatedCoach : c));
    setMyCoach(updatedCoach);
  };

  const filtered = filterGame === 'all'
    ? coaches
    : coaches.filter(c => c.games.some(g => g.label === filterGame));

  if (loading) return <Spinner />;

  // ── COACH VIEW: edit panel first, then full directory below ──
  if (canEditCoachProfile) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h2>Coach Profile</h2>
            <p>Edit your public profile, games, availability, and rates.</p>
          </div>
          <div style={{ display:'flex', gap:'0.6rem' }}>
            <button className={`btn ${editMode ? 'btn-primary' : 'btn-ghost'}`} style={{ clipPath:'none', padding:'0.55rem 1.2rem', fontSize:'0.85rem' }} onClick={() => setEditMode(true)}>✏️ Edit Profile &amp; Availability</button>
            <button className={`btn ${!editMode ? 'btn-primary' : 'btn-ghost'}`} style={{ clipPath:'none', padding:'0.55rem 1.2rem', fontSize:'0.85rem' }} onClick={() => setEditMode(false)}>👁 Preview</button>
          </div>
        </div>

        {editMode ? (
          myCoach
            ? <CoachEditPanel coach={myCoach} onSaved={handleSaved} />
            : <div className={styles.noProfile}>No coach profile found linked to your account. Contact an admin to get set up.</div>
        ) : (
          // Preview mode — show their card + full directory
          <div className={styles.grid}>
            {coaches.map(coach => (
              <CoachCard key={coach.id} coach={coach} onViewProfile={setProfileCoach} onBookNow={onBookWithCoach} />
            ))}
          </div>
        )}

        {profileCoach && (
          <CoachProfileModal coach={profileCoach} onClose={() => setProfileCoach(null)} onBook={(c) => { setProfileCoach(null); onBookWithCoach && onBookWithCoach(c || profileCoach); }} />
        )}
      </div>
    );
  }

  // ── PLAYER / ADMIN VIEW: full directory ──
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2>Our Coaches</h2>
          <p>Browse coaches, view their profiles, and book a session directly.</p>
        </div>
      </div>

      <div className={styles.filters}>
        <button className={`${styles.filterBtn} ${filterGame === 'all' ? styles.filterActive : ''}`} onClick={() => setFilterGame('all')}>All Games</button>
        {ALL_GAMES.map(g => (
          <button key={g} className={`${styles.filterBtn} ${filterGame === g ? styles.filterActive : ''}`} onClick={() => setFilterGame(g)}>{g}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>No coaches found for that game yet.</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(coach => (
            <CoachCard key={coach.id} coach={coach} onViewProfile={setProfileCoach} onBookNow={onBookWithCoach} />
          ))}
        </div>
      )}

      {profileCoach && (
        <CoachProfileModal coach={profileCoach} onClose={() => setProfileCoach(null)} onBook={() => { setProfileCoach(null); onBookWithCoach(profileCoach); }} />
      )}
    </div>
  );
}



### FILE: pages\Coaches.module.css
