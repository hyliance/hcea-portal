import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Profile.module.css';

const ALL_GAMES = ['League of Legends', 'Valorant', 'TFT', 'Fortnite', 'Rocket League', 'Smash Bros.', 'Marvel Rivals'];

export default function Profile() {
  const { user, updateProfile, loading } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
    school:    user?.school    || '',
    grade:     user?.grade     || '10th Grade',
  });
  const [games, setGames]       = useState(user?.games || []);
  const [saved, setSaved]       = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(user?.avatarImg || null);
  const [avatarDrag, setAvatarDrag] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const toggleGame   = (game) => setGames(prev => prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]);

  // Process a file object into a base64 data URL
  const processFile = (file) => {
    setAvatarError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please upload an image file (JPG, PNG, GIF, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setAvatarSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileInput  = (e) => { processFile(e.target.files?.[0]); e.target.value = ''; };
  const handleDrop       = (e) => { e.preventDefault(); setAvatarDrag(false); processFile(e.dataTransfer.files?.[0]); };
  const handleDragOver   = (e) => { e.preventDefault(); setAvatarDrag(true); };
  const handleDragLeave  = () => setAvatarDrag(false);
  const handleRemove     = () => { setAvatarSrc(null); setAvatarError(''); };

  const handleSave = async () => {
    const res = await updateProfile({ ...form, games, avatarImg: avatarSrc });
    if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  return (
    <div>
      <div className={styles.header}><h2>My Profile</h2><p>Manage your account and membership details.</p></div>
      <div className={styles.grid}>

        {/* ── Profile Card ── */}
        <div className={styles.profileCard}>

          {/* Avatar upload zone */}
          <div
            className={`${styles.avatarWrap} ${avatarDrag ? styles.avatarDragging : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            title="Click or drag an image to upload"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile" className={styles.avatarImg} />
            ) : (
              <div
                className={styles.avatarBig}
                style={{ background: user?.avatarColor || '#1d4ed8' }}
              >
                {user?.initials}
              </div>
            )}

            {/* Hover overlay */}
            <div className={styles.avatarOverlay}>
              <span className={styles.avatarOverlayIcon}>📷</span>
              <span className={styles.avatarOverlayText}>
                {avatarSrc ? 'Change Photo' : 'Upload Photo'}
              </span>
            </div>
          </div>

          {/* Remove button */}
          {avatarSrc && (
            <button className={styles.removeAvatarBtn} onClick={handleRemove}>
              ✕ Remove photo
            </button>
          )}

          {avatarError && <div className={styles.avatarError}>{avatarError}</div>}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />

          <div className={styles.name}>{user?.firstName} {user?.lastName}</div>
          <div className={styles.role}>⭐ Active Member · {user?.membershipYear}</div>
          <div className={styles.since}>Member since {user?.memberSince}</div>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}><div className={styles.statLabel}>Sessions</div><div className={styles.statVal}>{user?.stats?.sessionsCompleted ?? '—'}</div></div>
            <div className={styles.statItem}><div className={styles.statLabel}>Tournaments</div><div className={styles.statVal}>{user?.stats?.tournamentsEntered ?? '—'}</div></div>
            <div className={styles.statItem}><div className={styles.statLabel}>Win Rate</div><div className={styles.statVal}>{user?.stats?.winRate ?? '—'}</div></div>
            <div className={styles.statItem}><div className={styles.statLabel}>Schol. Apps</div><div className={styles.statVal}>{user?.stats?.scholarshipApps ?? '—'}</div></div>
          </div>
        </div>

        {/* ── Details Card ── */}
        <div className={styles.detailsCard}>
          <div className={styles.sectionTitle}>Personal Info</div>
          <div className={styles.fieldRow}>
            <div className="fg"><label>First Name</label><input name="firstName" value={form.firstName} onChange={handleChange} /></div>
            <div className="fg"><label>Last Name</label><input name="lastName" value={form.lastName} onChange={handleChange} /></div>
          </div>
          <div className={styles.fieldRow}>
            <div className="fg"><label>Email</label><input name="email" type="email" value={form.email} onChange={handleChange} /></div>
            <div className="fg"><label>Phone</label><input name="phone" value={form.phone} onChange={handleChange} /></div>
          </div>
          <div className={styles.fieldRow}>
            <div className="fg"><label>School / Organization</label><input name="school" value={form.school} onChange={handleChange} /></div>
            <div className="fg">
              <label>Grade / Year</label>
              <select name="grade" value={form.grade} onChange={handleChange}>
                {['10th Grade','11th Grade','12th Grade','College Freshman','College Sophomore','College Junior','College Senior','Other'].map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>My Games</div>
          <div className={styles.gameTags}>
            {ALL_GAMES.map(g => (
              <button key={g} className={`${styles.gameTag} ${games.includes(g) ? styles.active : ''}`} onClick={() => toggleGame(g)}>
                {g}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            style={{ fontSize: '0.9rem', padding: '0.7rem 2rem' }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
