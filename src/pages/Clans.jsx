import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { clansApi } from '../api';
import { Spinner } from '../components/UI';
import styles from './Clans.module.css';

const GAMES = ['Valorant', 'League of Legends', 'Rocket League', 'Fortnite', 'Apex Legends', 'Call of Duty', 'Overwatch 2', 'Smash Bros.', 'Marvel Rivals', 'TFT', 'Other'];

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

// ── CREATE CLAN MODAL ──────────────────────────────────────────────
function CreateClanModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', game:'', region:'NA', description:'', openToApps: true });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.game) { setError('Clan name and game are required.'); return; }
    setSaving(true);
    const res = await clansApi.create(user.id, `${user.firstName} ${user.lastName}`, form);
    if (res.success) { onCreated(res.clan); onClose(); }
    else setError(res.error || 'Failed to create clan.');
    setSaving(false);
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>Create a Clan</div>
            <div className={styles.modalSub}>You'll be set as IGL (owner). Invite members after creation.</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className={styles.formGrid}>
            <div className={`${styles.fg} ${styles.fgFull}`}>
              <label>Clan Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Rapid Reapers" maxLength={40} />
            </div>
            <div className={styles.fg}>
              <label>Primary Game *</label>
              <select value={form.game} onChange={e => set('game', e.target.value)}>
                <option value="">Select game...</option>
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className={styles.fg}>
              <label>Region</label>
              <select value={form.region} onChange={e => set('region', e.target.value)}>
                {clansApi.exportRegions().map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className={`${styles.fg} ${styles.fgFull}`}>
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description — what you're about, rank requirements, etc." maxLength={200} />
            </div>
            <div className={`${styles.fg} ${styles.fgFull}`}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.openToApps} onChange={e => set('openToApps', e.target.checked)} />
                Open to applications (players can request to join)
              </label>
            </div>
          </div>
        </div>
        <div className={styles.modalFoot}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create Clan →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CLAN DETAIL PANEL ──────────────────────────────────────────────
function ClanDetail({ clan, user, isAdmin, onClose, onUpdated }) {
  const isOwner = clan.ownerId === user?.id;
  const isMember = clan.members.some(m => m.userId === user?.id);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [editRole, setEditRole] = useState({}); // userId -> role

  const handleJoin = async () => {
    setJoining(true);
    const res = await clansApi.addMember(clan.id, user.id, `${user.firstName} ${user.lastName}`);
    if (res.success) { const updated = await clansApi.getById(clan.id); onUpdated(updated); }
    else alert(res.error);
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this clan?')) return;
    setLeaving(true);
    await clansApi.removeMember(clan.id, user.id);
    const updated = await clansApi.getById(clan.id);
    onUpdated(updated);
    setLeaving(false);
  };

  const handleRoleChange = async (memberId, role) => {
    await clansApi.updateMemberRole(clan.id, memberId, role);
    const updated = await clansApi.getById(clan.id);
    onUpdated(updated);
  };

  const handleKick = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    await clansApi.removeMember(clan.id, memberId);
    const updated = await clansApi.getById(clan.id);
    onUpdated(updated);
  };

  return (
    <div className={styles.detailPanel}>
      {/* Banner */}
      <div className={styles.detailBanner} style={{ background: `linear-gradient(135deg, ${clan.bannerColor || '#1d4ed8'} 0%, #080f1c 100%)` }}>
        <button className={styles.detailClose} onClick={onClose}>✕</button>
        <div className={styles.detailBannerLogo}>
          {clan.name.slice(0,2).toUpperCase()}
        </div>
        <div className={styles.detailBannerInfo}>
          <div className={styles.detailName}>
            {clan.name}
            {clan.verified && <span className={styles.verifiedBadge}>✓ Verified</span>}
          </div>
          <div className={styles.detailMeta}>
            <span>{clan.game}</span>
            <span>·</span>
            <span>{clan.region}</span>
            <span>·</span>
            <span>{clan.members.length}/{clan.maxSize} members</span>
            <span>·</span>
            <span>{clan.wins}W – {clan.losses}L</span>
          </div>
        </div>
      </div>

      <div className={styles.detailBody}>
        {/* Description */}
        {clan.description && <p className={styles.detailDesc}>{clan.description}</p>}

        {/* Join / Leave */}
        {!isMember && clan.openToApps && user && (
          <button className="btn btn-primary" onClick={handleJoin} disabled={joining} style={{marginBottom:'1rem'}}>
            {joining ? 'Joining…' : '+ Join Clan'}
          </button>
        )}
        {isMember && !isOwner && (
          <button className={styles.leaveBtn} onClick={handleLeave} disabled={leaving} style={{marginBottom:'1rem'}}>
            {leaving ? '…' : 'Leave Clan'}
          </button>
        )}

        {/* Roster */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Roster</div>
          <div className={styles.rosterList}>
            {clan.members.map(m => (
              <div key={m.userId} className={styles.rosterRow}>
                <div className={styles.rosterAvatar}>{m.userName.slice(0,2).toUpperCase()}</div>
                <div className={styles.rosterInfo}>
                  <div className={styles.rosterName}>{m.userName}</div>
                  <div className={styles.rosterMeta}>Joined {timeAgo(m.joinedAt)}</div>
                </div>
                {(isOwner || isAdmin) && m.userId !== clan.ownerId ? (
                  <div className={styles.rosterActions}>
                    <select
                      value={m.role}
                      className={styles.roleSelect}
                      onChange={e => handleRoleChange(m.userId, e.target.value)}
                    >
                      {clansApi.exportRoles().map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button className={styles.kickBtn} onClick={() => handleKick(m.userId)}>✕</button>
                  </div>
                ) : (
                  <span className={styles.rosterRole}>{m.role}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Record</div>
          <div className={styles.recordGrid}>
            <div className={styles.recordStat}><span>{clan.wins}</span><small>Wins</small></div>
            <div className={styles.recordStat}><span>{clan.losses}</span><small>Losses</small></div>
            <div className={styles.recordStat}>
              <span>{clan.wins + clan.losses > 0 ? Math.round((clan.wins/(clan.wins+clan.losses))*100) : 0}%</span>
              <small>Win Rate</small>
            </div>
          </div>
        </div>

        {/* Social links */}
        {(clan.twitterUrl || clan.twitchUrl || clan.discordUrl) && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>Links</div>
            <div className={styles.socialLinks}>
              {clan.twitterUrl && <a href={clan.twitterUrl} target="_blank" rel="noreferrer" className={styles.socialLink}>𝕏 Twitter</a>}
              {clan.twitchUrl && <a href={clan.twitchUrl} target="_blank" rel="noreferrer" className={styles.socialLink}>🟣 Twitch</a>}
              {clan.discordUrl && <a href={clan.discordUrl} target="_blank" rel="noreferrer" className={styles.socialLink}>💬 Discord</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CLAN CARD ──────────────────────────────────────────────────────
function ClanCard({ clan, user, onClick }) {
  const isMember = clan.members.some(m => m.userId === user?.id);
  return (
    <div className={`${styles.clanCard} ${isMember ? styles.clanCardMember : ''}`} onClick={() => onClick(clan)}>
      <div className={styles.clanCardBanner} style={{ background: `linear-gradient(135deg, ${clan.bannerColor || '#1d4ed8'} 0%, #0a1525 100%)` }}>
        <div className={styles.clanCardLogo}>{clan.name.slice(0,2).toUpperCase()}</div>
        {clan.verified && <span className={styles.clanVerified}>✓</span>}
        {isMember && <span className={styles.clanMemberBadge}>Your Clan</span>}
      </div>
      <div className={styles.clanCardBody}>
        <div className={styles.clanCardName}>{clan.name}</div>
        <div className={styles.clanCardGame}>{clan.game} · {clan.region}</div>
        {clan.description && <p className={styles.clanCardDesc}>{clan.description}</p>}
        <div className={styles.clanCardFoot}>
          <span className={styles.clanCardMembers}>👥 {clan.members.length}/{clan.maxSize}</span>
          <span className={styles.clanCardRecord}>{clan.wins}W–{clan.losses}L</span>
          {clan.openToApps && <span className={styles.clanCardOpen}>Open</span>}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────
export default function Clans() {
  const { user, isAdmin } = useAuth();
  const [clans, setClans]       = useState([]);
  const [myClans, setMyClans]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab]           = useState('all'); // all | mine
  const [search, setSearch]     = useState('');
  const [gameFilter, setGameFilter] = useState('');

  const load = async () => {
    const [all, mine] = await Promise.all([
      clansApi.getAll({ game: gameFilter || undefined, search: search || undefined }),
      user ? clansApi.getMyClans(user.id) : Promise.resolve([]),
    ]);
    setClans(all);
    setMyClans(mine);
    setLoading(false);
    // Refresh selected
    if (selected) {
      const refreshed = all.find(c => c.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
  };

  useEffect(() => { load(); }, [gameFilter, search]);

  const handleClanUpdated = (updated) => {
    setClans(prev => prev.map(c => c.id === updated.id ? updated : c));
    setMyClans(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
  };

  const handleCreated = (clan) => {
    setClans(prev => [clan, ...prev]);
    setMyClans(prev => [clan, ...prev]);
    setSelected(clan);
  };

  const displayClans = tab === 'mine' ? myClans : clans;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Clans</h2>
          <p className={styles.sub}>Create or join a competitive clan, manage your roster, and challenge other teams.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Clan</button>
      </div>

      {/* Tabs + filters */}
      <div className={styles.controls}>
        <div className={styles.tabBar}>
          <button className={`${styles.tabBtn} ${tab==='all' ? styles.tabBtnOn : ''}`} onClick={() => setTab('all')}>
            All Clans <span className={styles.tabCount}>{clans.length}</span>
          </button>
          <button className={`${styles.tabBtn} ${tab==='mine' ? styles.tabBtnOn : ''}`} onClick={() => setTab('mine')}>
            My Clans <span className={styles.tabCount}>{myClans.length}</span>
          </button>
        </div>
        <div className={styles.filters}>
          <input
            className={styles.searchInput}
            placeholder="Search clans…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className={styles.gameSelect} value={gameFilter} onChange={e => setGameFilter(e.target.value)}>
            <option value="">All Games</option>
            {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className={`${styles.layout} ${selected ? styles.layoutSplit : ''}`}>
        {/* Clan grid */}
        <div className={styles.grid}>
          {loading ? <Spinner /> : (
            displayClans.length === 0 ? (
              <div className={styles.empty}>
                {tab === 'mine' ? "You haven't joined any clans yet. Find one below or create your own!" : 'No clans found.'}
              </div>
            ) : (
              displayClans.map(clan => (
                <ClanCard
                  key={clan.id} clan={clan} user={user}
                  onClick={(c) => setSelected(s => s?.id === c.id ? null : c)}
                />
              ))
            )
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <ClanDetail
            clan={selected}
            user={user}
            isAdmin={isAdmin}
            onClose={() => setSelected(null)}
            onUpdated={handleClanUpdated}
          />
        )}
      </div>

      {showCreate && (
        <CreateClanModal user={user} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
