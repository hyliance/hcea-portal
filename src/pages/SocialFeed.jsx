import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { socialApi, FEED_CATEGORIES, GAME_TEAM_SIZES } from '../api';
import { Spinner } from '../components/UI';
import GiphyPicker from '../components/GiphyPicker';
import styles from './SocialFeed.module.css';

const GAMES_LIST = Object.keys(GAME_TEAM_SIZES);
const ROLE_COLORS = { head_admin:'#7c3aed', league_admin:'#f59e0b', admin:'#ef4444', coach:'#1d4ed8', player:'#059669', org_manager:'#6366f1' };
const ROLE_LABELS = { head_admin:'Head Admin', league_admin:'League Admin', admin:'Admin', coach:'Coach', player:'', org_manager:'Org' };
const RESTRICTED_ROLES = ['admin', 'head_admin', 'league_admin', 'org_manager'];

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

// ── MEDIA ─────────────────────────────────────────────────────────────────────
function MediaBlock({ media }) {
  const [err, setErr] = useState(false);
  if (!media?.type) return null;
  if (media.type === 'structured') return null; // handled by StructuredPostBody
  if (media.type === 'youtube' || media.type === 'twitch') {
    if (!media.embedUrl) return null;
    return (
      <div className={styles.mediaEmbed}>
        <iframe src={media.embedUrl} title={media.type}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen className={styles.embedFrame} />
      </div>
    );
  }
  if ((media.type === 'image' || media.type === 'gif') && media.url && !err) {
    return (
      <div className={styles.mediaImg}>
        <img src={media.url} alt={media.alt || ''} onError={() => setErr(true)} />
        {media.type === 'gif' && <span className={styles.gifBadge}>GIF</span>}
      </div>
    );
  }
  if (media.type === 'images' && media.images?.length) {
    const imgs = media.images;
    return (
      <div className={`${styles.imageGrid} ${styles[`imageGrid${Math.min(imgs.length,4)}`]}`}>
        {imgs.slice(0,4).map((img,i) => (
          <div key={i} className={styles.imageGridItem}>
            <img src={img.url} alt={img.alt||''} />
            {i===3 && imgs.length>4 && <div className={styles.imageMore}>+{imgs.length-4}</div>}
          </div>
        ))}
      </div>
    );
  }
  if (media.type === 'link') {
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
        <div className={styles.linkCardBody}>
          <div className={styles.linkDomain}>{media.domain}</div>
          {media.title && <div className={styles.linkTitle}>{media.title}</div>}
          {media.description && <div className={styles.linkDesc}>{media.description}</div>}
        </div>
        <div className={styles.linkArrow}>↗</div>
      </a>
    );
  }
  return null;
}

// ── CATEGORY BADGE ────────────────────────────────────────────────────────────
function CategoryBadge({ categoryId, communityMeta, onClick }) {
  const cat = FEED_CATEGORIES.find(c => c.id === categoryId);
  const display = cat
    ? { icon: cat.icon, label: cat.label, color: cat.color }
    : communityMeta
      ? { icon: communityMeta.icon || '🎮', label: communityMeta.name, color: communityMeta.color || '#3b82f6' }
      : null;
  if (!display) return null;
  return (
    <button className={styles.categoryBadge} style={{'--cc': display.color}}
      onClick={e => { e.stopPropagation(); onClick?.(categoryId); }}>
      <span>{display.icon}</span>
      <span>{display.label}</span>
    </button>
  );
}

// ── STRUCTURED POST BODY ──────────────────────────────────────────────────────
function ScTag({ label, value, accent }) {
  if (!value) return null;
  return (
    <span className={styles.scTag} style={accent ? { '--sct': accent } : {}}>
      <span className={styles.scTagLabel}>{label}</span>
      <span className={styles.scTagValue}>{value}</span>
    </span>
  );
}

function StructuredCard({ category, data, description }) {
  switch (category) {
    case 'scrims':
      return (
        <div className={styles.structuredCard}>
          <div className={styles.scRow}>
            {data.game     && <ScTag label="Game"     value={data.game} />}
            {data.platform && <ScTag label="Platform" value={data.platform} />}
            {data.region   && <ScTag label="Region"   value={data.region} />}
            {data.format   && <ScTag label="Format"   value={data.format} accent="#ef4444" />}
          </div>
          {data.timeWindow && <div className={styles.scDetail}>🕐 {data.timeWindow}</div>}
          {data.rankRange  && <div className={styles.scDetail}>🏅 {data.rankRange}</div>}
          {description     && <p className={styles.scDesc}>{description}</p>}
        </div>
      );
    case 'lft':
      return (
        <div className={styles.structuredCard}>
          <div className={styles.scRow}>
            {data.game && <ScTag label="Game" value={data.game} />}
            {data.rank && <ScTag label="Rank" value={data.rank} accent="#3b82f6" />}
          </div>
          {data.roles && <div className={styles.scDetail}>🎮 <strong>Roles:</strong> {data.roles}</div>}
          {(data.days?.length || data.hours) && (
            <div className={styles.scDetail}>📅 {data.days?.join(', ')}{data.hours ? ` · ${data.hours}` : ''}</div>
          )}
          {description && <p className={styles.scDesc}>{description}</p>}
        </div>
      );
    case 'lfo':
      return (
        <div className={styles.structuredCard}>
          <div className={styles.scRow}>
            {data.game    && <ScTag label="Game"    value={data.game} />}
            {data.seeking && <ScTag label="Seeking" value={data.seeking} accent="#8b5cf6" />}
            {data.rank    && <ScTag label="Rank"    value={data.rank} />}
          </div>
          {data.role   && <div className={styles.scDetail}>🎯 <strong>Position:</strong> {data.role}</div>}
          {description && <p className={styles.scDesc}>{description}</p>}
        </div>
      );
    case 'roster_move':
      return (
        <div className={styles.structuredCard}>
          <div className={styles.scRow}>
            {data.game     && <ScTag label="Game"           value={data.game} />}
            {data.moveType && <ScTag label={data.playerName || 'Player'} value={data.moveType} accent="#6366f1" />}
          </div>
          {(data.fromTeam || data.toTeam) && (
            <div className={styles.scMoveFlow}>
              {data.fromTeam && <span className={styles.scMoveTeam}>{data.fromTeam}</span>}
              {data.fromTeam && data.toTeam && <span className={styles.scMoveArrow}>→</span>}
              {data.toTeam   && <span className={styles.scMoveTeam}>{data.toTeam}</span>}
            </div>
          )}
          {data.role   && <div className={styles.scDetail}>🎯 {data.role}</div>}
          {description && <p className={styles.scDesc}>{description}</p>}
        </div>
      );
    case 'vod_review':
      return (
        <div className={styles.structuredCard}>
          <div className={styles.scRow}>
            {data.game      && <ScTag label="Game"      value={data.game} />}
            {data.offerType && <ScTag label="Type"      value={data.offerType} accent="#10b981" />}
          </div>
          {data.focus  && <div className={styles.scDetail}>🔍 <strong>Focus:</strong> {data.focus}</div>}
          {description && <p className={styles.scDesc}>{description}</p>}
        </div>
      );
    case 'montages':
    case 'highlight':
      return (
        <div className={styles.structuredCard}>
          {data.game   && <div className={styles.scRow}><ScTag label="Game" value={data.game} /></div>}
          {description && <p className={styles.scDesc}>{description}</p>}
        </div>
      );
    default:
      return description ? <p className={styles.postText}>{description}</p> : null;
  }
}

function StructuredPostBody({ media, text }) {
  if (media?.type === 'structured') {
    return <StructuredCard category={media.category} data={media.data || {}} description={text} />;
  }
  return text ? <p className={styles.postText}>{text}</p> : null;
}

// ── VOTE ──────────────────────────────────────────────────────────────────────
function VoteCol({ score, myUpvote, onUpvote }) {
  return (
    <div className={styles.voteCol}>
      <button className={`${styles.upvoteBtn} ${myUpvote?styles.upvoteBtnOn:''}`} onClick={onUpvote}>▲</button>
      <span className={`${styles.voteScore} ${myUpvote?styles.voteScoreOn:''}`}>{score}</span>
      <button className={styles.downvoteBtn}>▼</button>
    </div>
  );
}

// ── COMMENT ───────────────────────────────────────────────────────────────────
function Comment({ comment, postId, me, isAdmin, onUpvote, onDelete }) {
  const isMe = comment.userId === me?.id;
  const voted = comment.upvotes?.includes(me?.id);
  return (
    <div className={styles.comment}>
      <div className={styles.commentAvatarCol}>
        <div className={styles.commentAvatar} style={{background:comment.userAvatarColor}}>{comment.userInitials}</div>
        <div className={styles.commentLine}/>
      </div>
      <div className={styles.commentBody}>
        <div className={styles.commentMeta}>
          <span className={styles.commentAuthor}>{comment.userName}</span>
          {ROLE_LABELS[comment.userRole] && (
            <span className={styles.commentRole} style={{color:ROLE_COLORS[comment.userRole]}}>{ROLE_LABELS[comment.userRole]}</span>
          )}
          <span className={styles.commentTime}>{timeAgo(comment.createdAt)}</span>
        </div>
        {comment.text && <div className={styles.commentText}>{comment.text}</div>}
        {comment.media && <div className={styles.commentMedia}><MediaBlock media={comment.media}/></div>}
        <div className={styles.commentActions}>
          <button className={`${styles.commentVote} ${voted?styles.commentVoteOn:''}`}
            onClick={()=>onUpvote(postId,comment.id)}>
            ▲ {comment.upvotes?.length||0}
          </button>
          {(isMe||isAdmin) && (
            <button className={styles.commentDel} onClick={()=>onDelete(postId,comment.id)}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMMENT COMPOSE ───────────────────────────────────────────────────────────
function CommentCompose({ me, onSubmit, submitting }) {
  const [text, setText]       = useState('');
  const [media, setMedia]     = useState(null);
  const [showGif, setShowGif] = useState(false);
  const fileRef               = useRef(null);

  const submit = async () => {
    if (!text.trim() && !media) return;
    await onSubmit(text, media);
    setText(''); setMedia(null);
  };

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => setMedia({type:'image', url:ev.target.result, alt:f.name});
    r.readAsDataURL(f);
  };

  return (
    <div className={styles.commentCompose}>
      <div className={styles.ccAvatar} style={{background:me?.avatarColor}}>{me?.initials}</div>
      <div className={styles.ccRight}>
        {media && (
          <div className={styles.ccMediaPrev}>
            <img src={media.url} alt="preview"/>
            <button onClick={()=>setMedia(null)}>✕</button>
          </div>
        )}
        <div className={styles.ccInputRow}>
          <textarea className={styles.ccInput} rows={2} placeholder="Add a comment… (Ctrl+Enter to post)"
            value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&e.ctrlKey&&submit()}/>
          <div className={styles.ccTools}>
            <button className={styles.ccTool} onClick={()=>fileRef.current.click()} title="Image">🖼️</button>
            <button className={styles.ccTool} onClick={()=>setShowGif(true)} title="GIF">🎞️</button>
            <button className={styles.ccSend} disabled={submitting||(!text.trim()&&!media)} onClick={submit}>
              {submitting?'…':'↑'}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
      </div>
      {showGif && <GiphyPicker onSelect={g=>{setMedia(g);setShowGif(false);}} onClose={()=>setShowGif(false)}/>}
    </div>
  );
}

// ── POST CARD ─────────────────────────────────────────────────────────────────
function PostCard({ post, me, isAdmin, onUpvote, onComment, onDelPost, onDelComment, onVoteComment, onFlag, onPin, onCategoryClick }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isMe = post.userId === me?.id;

  const handleComment = async (text, media) => {
    setBusy(true);
    await onComment(post.id, text, media);
    setBusy(false);
  };

  return (
    <div className={`${styles.postCard} ${post.pinned?styles.postPinned:''} ${post.flagged&&isAdmin?styles.postFlagged:''}`}>
      <VoteCol score={post.score} myUpvote={post.myUpvote} onUpvote={()=>onUpvote(post.id)}/>

      <div className={styles.postContent}>
        <div className={styles.postMeta}>
          {post.pinned && <span className={styles.pinnedTag}>📌 Pinned</span>}
          <CategoryBadge categoryId={post.category} communityMeta={post.communityMeta} onClick={onCategoryClick} />
          <span className={styles.postBy}>•</span>
          <div className={styles.postAuthorAvatar} style={{background:post.userAvatarColor}}>{post.userInitials}</div>
          <span className={styles.postAuthorName}>{post.userName}</span>
          {ROLE_LABELS[post.userRole] && (
            <span className={styles.postAuthorRole} style={{color:ROLE_COLORS[post.userRole]}}>{ROLE_LABELS[post.userRole]}</span>
          )}
          <span className={styles.postTime}>{timeAgo(post.createdAt)}</span>
          {post.flagged && isAdmin && <span className={styles.flagTag}>🚩 Flagged</span>}
        </div>

        <h3 className={styles.postTitle}>{post.title}</h3>

        <StructuredPostBody media={post.media} text={post.text} />

        {post.media && post.media.type !== 'structured' && (
          <div className={styles.postMedia}><MediaBlock media={post.media}/></div>
        )}

        <div className={styles.postActions}>
          <button className={`${styles.postAction} ${open?styles.postActionOn:''}`}
            onClick={()=>setOpen(v=>!v)}>
            💬 {post.comments.length} Comment{post.comments.length!==1?'s':''}
          </button>
          {(isMe||isAdmin) && <button className={styles.postActionDanger} onClick={()=>onDelPost(post.id)}>🗑 Delete</button>}
          {!isMe && <button className={styles.postAction} onClick={()=>onFlag(post.id)}>⚑ Report</button>}
          {isAdmin && (
            <button className={styles.postAction} onClick={()=>onPin(post.id,!post.pinned)}>
              {post.pinned?'📌 Unpin':'📌 Pin'}
            </button>
          )}
        </div>

        {open && (
          <div className={styles.commentsWrap}>
            <CommentCompose me={me} onSubmit={handleComment} submitting={busy}/>
            {post.comments.length===0 && <p className={styles.noComments}>No comments yet — be first!</p>}
            {post.comments.map(c=>(
              <Comment key={c.id} comment={c} postId={post.id} me={me} isAdmin={isAdmin}
                onUpvote={onVoteComment} onDelete={onDelComment}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FORM HELPERS ──────────────────────────────────────────────────────────────
function FieldRow({ label, children }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function GameSelect({ value, onChange, optional }) {
  return (
    <select className={styles.formSelect} value={value||''} onChange={e=>onChange(e.target.value)}>
      <option value="">{optional ? 'Any game (optional)' : 'Select game…'}</option>
      {GAMES_LIST.map(g=><option key={g} value={g}>{g}</option>)}
    </select>
  );
}

function FieldSelect({ opts, value, onChange }) {
  return (
    <select className={styles.formSelect} value={value||''} onChange={e=>onChange(e.target.value)}>
      <option value="">Select…</option>
      {opts.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function DayPicker({ value=[], onChange }) {
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const toggle = d => onChange(value.includes(d) ? value.filter(x=>x!==d) : [...value, d]);
  return (
    <div className={styles.dayPicker}>
      {DAYS.map(d=>(
        <button key={d} type="button"
          className={`${styles.dayBtn} ${value.includes(d)?styles.dayBtnOn:''}`}
          onClick={()=>toggle(d)}>{d}
        </button>
      ))}
    </div>
  );
}

// ── CATEGORY-SPECIFIC FIELDS ──────────────────────────────────────────────────
function CategoryFields({ catId, fields, set, text, setText, mediaUrl, setMediaUrl, me }) {
  const PLATFORMS = ['PC','Xbox','PlayStation','Cross-Play'];
  const REGIONS   = ['NA-East','NA-West','EU','LATAM','APAC','OCE'];
  const FORMATS   = ['1v1','2v2','3v3','4v4','5v5','6v6'];
  const SEEK_OPTS = ['Competitive Org','Casual Org','Academy Org','Any'];
  const MOVE_OPTS = ['Joins','Departs','Role Change','Pickup','Release'];
  const REVIEW_OPTS = ['Requesting Review','Offering Review'];

  switch (catId) {
    case 'scrims': return (
      <>
        <div className={styles.formRow}>
          <FieldRow label="Game"><GameSelect value={fields.game} onChange={v=>set('game',v)} /></FieldRow>
          <FieldRow label="Format"><FieldSelect opts={FORMATS} value={fields.format} onChange={v=>set('format',v)} /></FieldRow>
        </div>
        <div className={styles.formRow}>
          <FieldRow label="Platform"><FieldSelect opts={PLATFORMS} value={fields.platform} onChange={v=>set('platform',v)} /></FieldRow>
          <FieldRow label="Region"><FieldSelect opts={REGIONS} value={fields.region} onChange={v=>set('region',v)} /></FieldRow>
        </div>
        <FieldRow label="Time Window"><input className={styles.formInput} placeholder="e.g. Today 7–9 PM EST" value={fields.timeWindow||''} onChange={e=>set('timeWindow',e.target.value)} /></FieldRow>
        <FieldRow label="Rank Range"><input className={styles.formInput} placeholder="e.g. Gold — Diamond" value={fields.rankRange||''} onChange={e=>set('rankRange',e.target.value)} /></FieldRow>
        <FieldRow label="Details (optional)"><textarea className={styles.formTextarea} rows={3} placeholder="Additional info, requirements, contact…" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    case 'lft': return (
      <>
        <div className={styles.formRow}>
          <FieldRow label="Game"><GameSelect value={fields.game} onChange={v=>set('game',v)} /></FieldRow>
          <FieldRow label="Rank / SR"><input className={styles.formInput} placeholder="e.g. Diamond 2" value={fields.rank||''} onChange={e=>set('rank',e.target.value)} /></FieldRow>
        </div>
        <FieldRow label="Roles / Position"><input className={styles.formInput} placeholder="e.g. IGL, Entry Fragger" value={fields.roles||''} onChange={e=>set('roles',e.target.value)} /></FieldRow>
        <FieldRow label="Availability (days)"><DayPicker value={fields.days||[]} onChange={v=>set('days',v)} /></FieldRow>
        <FieldRow label="Hours / Timezone"><input className={styles.formInput} placeholder="e.g. Evenings EST, 7–11 PM" value={fields.hours||''} onChange={e=>set('hours',e.target.value)} /></FieldRow>
        <FieldRow label="About Me"><textarea className={styles.formTextarea} rows={3} placeholder="Tell teams about yourself…" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    case 'lfo': return (
      <>
        <div className={styles.formRow}>
          <FieldRow label="Game"><GameSelect value={fields.game} onChange={v=>set('game',v)} /></FieldRow>
          <FieldRow label="Seeking"><FieldSelect opts={SEEK_OPTS} value={fields.seeking} onChange={v=>set('seeking',v)} /></FieldRow>
        </div>
        <div className={styles.formRow}>
          <FieldRow label="Role / Position"><input className={styles.formInput} placeholder="e.g. Support, IGL" value={fields.role||''} onChange={e=>set('role',e.target.value)} /></FieldRow>
          <FieldRow label="Rank / SR"><input className={styles.formInput} placeholder="e.g. Platinum" value={fields.rank||''} onChange={e=>set('rank',e.target.value)} /></FieldRow>
        </div>
        <FieldRow label="Pitch"><textarea className={styles.formTextarea} rows={3} placeholder="Why should an org pick you up?" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    case 'announcements': {
      const canPost = RESTRICTED_ROLES.includes(me?.role);
      if (!canPost) return (
        <div className={styles.restrictedNotice}>
          🔒 Announcements can only be posted by verified Orgs, Clans, Admins, and TOs.
        </div>
      );
      return (
        <FieldRow label="Body">
          <textarea className={styles.formTextarea} rows={6} placeholder="Announcement body…" value={text} onChange={e=>setText(e.target.value)} />
        </FieldRow>
      );
    }
    case 'montages': return (
      <>
        <FieldRow label="Game"><GameSelect value={fields.game} onChange={v=>set('game',v)} /></FieldRow>
        <FieldRow label="Video URL *"><input className={styles.formInput} placeholder="YouTube or Twitch clip URL" value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} /></FieldRow>
        <FieldRow label="Description (optional)"><textarea className={styles.formTextarea} rows={2} placeholder="Describe your montage…" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    case 'vod_review': return (
      <>
        <div className={styles.formRow}>
          <FieldRow label="Game"><GameSelect value={fields.game} onChange={v=>set('game',v)} /></FieldRow>
          <FieldRow label="Type"><FieldSelect opts={REVIEW_OPTS} value={fields.offerType} onChange={v=>set('offerType',v)} /></FieldRow>
        </div>
        <FieldRow label="Video URL"><input className={styles.formInput} placeholder="YouTube or Twitch VOD URL" value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} /></FieldRow>
        <FieldRow label="Focus Areas"><input className={styles.formInput} placeholder="e.g. Rotations, Positioning, Aim" value={fields.focus||''} onChange={e=>set('focus',e.target.value)} /></FieldRow>
        <FieldRow label="Details (optional)"><textarea className={styles.formTextarea} rows={2} placeholder="What do you want analyzed?" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    case 'roster_move': return (
      <>
        <div className={styles.formRow}>
          <FieldRow label="Game"><GameSelect value={fields.game} onChange={v=>set('game',v)} /></FieldRow>
          <FieldRow label="Move Type"><FieldSelect opts={MOVE_OPTS} value={fields.moveType} onChange={v=>set('moveType',v)} /></FieldRow>
        </div>
        <div className={styles.formRow}>
          <FieldRow label="Player / GamerTag"><input className={styles.formInput} placeholder="Player name" value={fields.playerName||''} onChange={e=>set('playerName',e.target.value)} /></FieldRow>
          <FieldRow label="Role / Position"><input className={styles.formInput} placeholder="e.g. IGL, Support" value={fields.role||''} onChange={e=>set('role',e.target.value)} /></FieldRow>
        </div>
        <div className={styles.formRow}>
          <FieldRow label="From Team"><input className={styles.formInput} placeholder="Previous team (if any)" value={fields.fromTeam||''} onChange={e=>set('fromTeam',e.target.value)} /></FieldRow>
          <FieldRow label="To Team"><input className={styles.formInput} placeholder="New team (if any)" value={fields.toTeam||''} onChange={e=>set('toTeam',e.target.value)} /></FieldRow>
        </div>
        <FieldRow label="Details (optional)"><textarea className={styles.formTextarea} rows={2} placeholder="Additional context…" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    case 'discussion': return (
      <>
        <FieldRow label="Game Tag (optional)"><GameSelect value={fields.game} onChange={v=>set('game',v)} optional /></FieldRow>
        <FieldRow label="Body"><textarea className={styles.formTextarea} rows={5} placeholder="What's on your mind?" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    case 'highlight': return (
      <>
        <FieldRow label="Game"><GameSelect value={fields.game} onChange={v=>set('game',v)} /></FieldRow>
        <FieldRow label="Clip URL *"><input className={styles.formInput} placeholder="YouTube, Twitch clip, or Streamable URL" value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} /></FieldRow>
        <FieldRow label="Description (optional)"><textarea className={styles.formTextarea} rows={2} placeholder="Describe your highlight…" value={text} onChange={e=>setText(e.target.value)} /></FieldRow>
      </>
    );
    default: return null;
  }
}

function buildPostMedia(cat, fields, mediaUrl) {
  const videoTypes = ['montages','vod_review','highlight'];
  if (videoTypes.includes(cat.id) && mediaUrl?.trim()) {
    const parsed = socialApi.parseMediaUrl(mediaUrl.trim());
    if (parsed) return { ...parsed, game: fields.game || null };
  }
  const structuredTypes = ['scrims','lft','lfo','roster_move'];
  if (structuredTypes.includes(cat.id)) {
    return { type: 'structured', category: cat.id, data: fields };
  }
  return null;
}

function canSubmit(cat, fields, title, text, mediaUrl, me) {
  if (!cat || !title.trim()) return false;
  if (cat.type === 'community') return !!text.trim();
  if (cat.id === 'announcements' && !RESTRICTED_ROLES.includes(me?.role)) return false;
  if ((cat.id === 'montages' || cat.id === 'highlight') && !mediaUrl.trim()) return false;
  return true;
}

// ── CREATE COMMUNITY MODAL ────────────────────────────────────────────────────
const COMM_ICONS  = ['🎮','⚡','🔥','🏆','💎','🎯','🎬','🎧','🕹️','🌟','🤝','🎪','🦁','🐺','🔮'];
const COMM_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#6366f1','#f97316','#ec4899','#14b8a6'];

function CreateCommunityModal({ me, onClose, onCreate }) {
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [icon, setIcon]     = useState('🎮');
  const [color, setColor]   = useState('#3b82f6');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    const res = await socialApi.createCommunity(me.id, name.trim(), desc.trim(), icon, color);
    setSaving(false);
    if (res.success) { onCreate(res.community); onClose(); }
    else setError(res.error || 'Failed to create community.');
  };

  return (
    <div className={styles.modalBackdrop} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={styles.modal} style={{maxWidth:480}}>
        <div className={styles.modalHead}>
          <span className={styles.modalTitle}>Create Community</span>
          <button className={styles.modalX} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <FieldRow label="Community Name *">
            <input className={styles.formInput} value={name} maxLength={40}
              onChange={e=>setName(e.target.value.slice(0,40))}
              placeholder="e.g. Valorant Hub, Rocket League NA…"/>
          </FieldRow>
          <FieldRow label="Description (optional)">
            <textarea className={styles.formTextarea} rows={2} value={desc} maxLength={120}
              onChange={e=>setDesc(e.target.value.slice(0,120))}
              placeholder="What is this community about?"/>
          </FieldRow>
          <FieldRow label="Icon">
            <div className={styles.iconPicker}>
              {COMM_ICONS.map(ic=>(
                <button key={ic} type="button"
                  className={`${styles.iconBtn} ${icon===ic?styles.iconBtnOn:''}`}
                  onClick={()=>setIcon(ic)}>{ic}</button>
              ))}
            </div>
          </FieldRow>
          <FieldRow label="Color">
            <div className={styles.colorPicker}>
              {COMM_COLORS.map(co=>(
                <button key={co} type="button"
                  className={`${styles.colorBtn} ${color===co?styles.colorBtnOn:''}`}
                  style={{'--cc':co}} onClick={()=>setColor(co)}/>
              ))}
            </div>
          </FieldRow>
          <div className={styles.commPreview} style={{'--cc':color}}>
            <span className={styles.commPreviewIcon}>{icon}</span>
            <span className={styles.commPreviewName}>{name||'Community Name'}</span>
          </div>
          {error && <div className={styles.formErr}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={saving||!name.trim()} onClick={submit}>
            {saving?'Creating…':'Create Community'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QUICK COMPOSE (Twitter-like) ──────────────────────────────────────────────
function QuickCompose({ me, onOpen }) {
  const QUICK_CATS = FEED_CATEGORIES.filter(c => ['scrims','lft','discussion','highlight','announcements'].includes(c.id));
  return (
    <div className={styles.quickCompose} onClick={()=>onOpen(null)}>
      <div className={styles.qcAvatar} style={{background: me?.avatarColor || '#1d4ed8'}}>{me?.initials}</div>
      <div className={styles.qcRight}>
        <div className={styles.qcPlaceholder}>What's happening in the scene?</div>
        <div className={styles.qcShortcuts} onClick={e=>e.stopPropagation()}>
          {QUICK_CATS.map(cat=>(
            <button key={cat.id} className={styles.qcShortcut} style={{'--cc':cat.color}}
              onClick={()=>onOpen(cat)} title={cat.label}>
              {cat.icon} <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CATEGORY PAGE HEADER (Reddit-like) ────────────────────────────────────────
function CategoryPageHeader({ cat, onBack }) {
  return (
    <div className={styles.catPageHeader}>
      <div className={styles.catPageBanner} style={{background:`linear-gradient(135deg,${cat.color}44 0%,${cat.color}11 60%,transparent 100%)`}} />
      <div className={styles.catPageBody}>
        <div className={styles.catPageIcon} style={{background:cat.color+'1a',border:`2px solid ${cat.color}55`}}>
          {cat.icon}
        </div>
        <div className={styles.catPageInfo}>
          <h2 className={styles.catPageName} style={{color:cat.color}}>{cat.label}</h2>
          <p className={styles.catPageDesc}>{cat.description}</p>
        </div>
        <button className={styles.catPageBack} onClick={onBack}>← All Posts</button>
      </div>
    </div>
  );
}

// ── CREATE POST MODAL ─────────────────────────────────────────────────────────
function CreatePostModal({ me, onClose, onPost, initialCategory = null, communities = [], onCreateCommunity }) {
  const [step, setStep]         = useState(initialCategory ? 2 : 1);
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle]       = useState('');
  const [text, setText]         = useState('');
  const [fields, setFields]     = useState({});
  const [mediaUrl, setMediaUrl] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const set = (k, v) => setFields(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    setError(''); setSaving(true);
    const isComm = category.type === 'community';
    const media = isComm ? null : buildPostMedia(category, fields, mediaUrl);
    const communityMeta = isComm
      ? { id: category.id, name: category.name, icon: category.icon, color: category.color }
      : null;
    const res = await socialApi.createForumPost(
      me.id, `${me.firstName} ${me.lastName}`,
      me.role, me.initials, me.avatarColor,
      category.id, title.trim(), text, null, media, communityMeta
    );
    setSaving(false);
    if (res.success) { onPost(res.post); onClose(); }
    else setError(res.error || 'Failed to post.');
  };

  const userComms = communities.filter(c => c.type === 'community');

  if (step === 1) {
    return (
      <div className={styles.modalBackdrop} onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className={styles.modal} style={{maxWidth:620}}>
          <div className={styles.modalHead}>
            <span className={styles.modalTitle}>Create Post — Choose Category</span>
            <button className={styles.modalX} onClick={onClose}>✕</button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.communitySectionLabel}>System Categories</div>
            <div className={styles.categoryGrid}>
              {FEED_CATEGORIES.map(cat => (
                <button key={cat.id} className={styles.categoryCard}
                  style={{'--cc': cat.color}}
                  onClick={() => { setCategory({ ...cat, type: 'system' }); setStep(2); }}>
                  <span className={styles.catCardIcon}>{cat.icon}</span>
                  <span className={styles.catCardLabel}>{cat.label}</span>
                  <span className={styles.catCardDesc}>{cat.description}</span>
                </button>
              ))}
            </div>
            <hr className={styles.communitySectionDivider}/>
            <div className={styles.communityRowLabel}>
              <span className={styles.communitySectionLabel}>Communities</span>
              <button className={styles.createCommBtn} onClick={onCreateCommunity}>+ New</button>
            </div>
            {userComms.length === 0 ? (
              <div className={styles.sidebarEmpty}>No communities yet — create one!</div>
            ) : (
              <div className={styles.categoryGrid}>
                {userComms.map(comm => (
                  <button key={comm.id} className={styles.categoryCard}
                    style={{'--cc': comm.color}}
                    onClick={() => { setCategory(comm); setStep(2); }}>
                    <span className={styles.catCardIcon}>{comm.icon}</span>
                    <span className={styles.catCardLabel}>{comm.name}</span>
                    <span className={styles.catCardDesc}>{comm.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalBackdrop} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
            <button className={styles.backBtn} onClick={()=>setStep(1)}>←</button>
            <span className={styles.catModalLabel} style={{color:category.color}}>
              {category.icon} {category.label || category.name}
            </span>
          </div>
          <button className={styles.modalX} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <FieldRow label={<>Title * <span className={styles.charCount}>{title.length}/200</span></>}>
            <input className={styles.formInput} value={title}
              onChange={e=>setTitle(e.target.value.slice(0,200))} placeholder="Post title…" maxLength={200}/>
          </FieldRow>

          {category.type === 'community' ? (
            <>
              <FieldRow label="Body *">
                <textarea className={styles.formTextarea} rows={6}
                  placeholder="What's on your mind?" value={text} onChange={e=>setText(e.target.value)}/>
              </FieldRow>
              <FieldRow label="Game Tag (optional)">
                <GameSelect value={fields.game} onChange={v=>set('game',v)} optional/>
              </FieldRow>
            </>
          ) : (
            <CategoryFields catId={category.id} fields={fields} set={set}
              text={text} setText={setText} mediaUrl={mediaUrl} setMediaUrl={setMediaUrl} me={me}/>
          )}

          {error && <div className={styles.formErr}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary}
            disabled={saving || !canSubmit(category, fields, title, text, mediaUrl, me)}
            onClick={submit}>
            {saving ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SocialFeed() {
  const { user, userAge } = useAuth();
  const isAdmin = ['admin','head_admin','league_admin'].includes(user?.role);

  // view: 'home' (mixed timeline) | 'category' (subreddit-style page)
  const [view, setView]                 = useState('home');
  const [activeCat, setActiveCat]       = useState(null); // FEED_CATEGORIES item
  const [allPosts, setAllPosts]         = useState([]);
  const [sort, setSort]                 = useState('hot');
  const [loading, setLoading]           = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [allowed, setAllowed]           = useState(true);
  const [createModal, setCreateModal]   = useState(null); // null | category item | 'open'
  const [communities, setCommunities]   = useState([]);
  const [createCommModal, setCreateCommModal] = useState(false);

  const loadPosts = useCallback(async (s = sort) => {
    setPostsLoading(true);
    const res = await socialApi.getFeedPosts(user?.id, userAge, s, null);
    setAllowed(res.allowed !== false);
    setAllPosts(res.posts || []);
    setPostsLoading(false);
    setLoading(false);
  }, [user?.id, userAge, sort]);

  useEffect(() => { loadPosts(sort); }, [sort]);

  useEffect(() => {
    socialApi.getCommunities().then(comms => setCommunities(comms));
  }, []);

  // Posts shown in the current view
  const visiblePosts = view === 'category' && activeCat
    ? allPosts.filter(p => p.category === activeCat.id)
    : allPosts;

  const openCategory = (id) => {
    const cat = FEED_CATEGORIES.find(c => c.id === id);
    if (cat) { setActiveCat({ ...cat, type: 'system' }); setView('category'); return; }
    const comm = communities.find(c => c.id === id);
    if (comm) { setActiveCat(comm); setView('category'); }
  };
  const goHome = () => { setView('home'); setActiveCat(null); };

  const onCommunityCreated = (community) => {
    setCommunities(prev => [...prev, community]);
  };

  const upvote = async (id) => {
    await socialApi.toggleUpvote(id, user.id);
    setAllPosts(p=>p.map(post=>post.id!==id?post:{...post, myUpvote:!post.myUpvote, score:post.myUpvote?post.score-1:post.score+1}));
  };
  const addComment = async (postId, text, media) => {
    const res = await socialApi.addComment(postId, user.id, `${user.firstName} ${user.lastName}`, user.role, user.initials, user.avatarColor, text, userAge, media);
    if (res.success) setAllPosts(p=>p.map(post=>post.id!==postId?post:{...post, comments:[...post.comments,res.comment]}));
  };
  const deletePost = async (id) => { await socialApi.deletePost(id); setAllPosts(p=>p.filter(post=>post.id!==id)); };
  const deleteComment = async (pId,cId) => {
    await socialApi.deleteComment(pId, cId);
    setAllPosts(p=>p.map(post=>post.id!==pId?post:{...post,comments:post.comments.filter(c=>c.id!==cId)}));
  };
  const voteComment = async (pId,cId) => {
    await socialApi.upvoteComment(pId, cId, user.id);
    setAllPosts(p=>p.map(post=>post.id!==pId?post:{...post,comments:post.comments.map(c=>c.id!==cId?c:{...c, upvotes:c.upvotes.includes(user.id)?c.upvotes.filter(x=>x!==user.id):[...c.upvotes,user.id]})}));
  };
  const flagPost = async (id) => { await socialApi.flagPost(id, user.id, 'User report'); setAllPosts(p=>p.map(post=>post.id!==id?post:{...post,flagged:true})); };
  const pinPost  = async (id, pinned) => { await socialApi.pinPost(id, pinned); setAllPosts(p=>p.map(post=>post.id!==id?post:{...post,pinned})); };

  const onPostCreated = (post) => {
    setAllPosts(p => [post, ...p]);
    // If we're not on the right category page, navigate there
    if (view === 'category' && activeCat?.id !== post.category) {
      openCategory(post.category);
    }
  };

  if (!allowed) return (
    <div className={styles.ageLock}>
      <div className={styles.ageLockIcon}>🔞</div>
      <h3>Age Restricted</h3>
      <p>The Social Feed is available to members 16 and older.</p>
    </div>
  );

  const postCardProps = {
    me: {...user, id:user?.id||'guest'}, isAdmin,
    onUpvote:upvote, onComment:addComment,
    onDelPost:deletePost, onDelComment:deleteComment,
    onVoteComment:voteComment, onFlag:flagPost, onPin:pinPost,
    onCategoryClick: openCategory,
  };

  return (
    <div className={styles.wrap}>

      {/* ── TOP BAR ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          {view === 'category' ? (
            <div className={styles.breadcrumb}>
              <button onClick={goHome}>🏠 Feed</button>
              <span>›</span>
              <span style={{color: activeCat.color}}>{activeCat.icon} {activeCat.label}</span>
            </div>
          ) : (
            <h2 className={styles.feedTitle}>🏠 Social Feed</h2>
          )}
        </div>
        <button className={styles.createPostBtn} onClick={()=>setCreateModal('open')}>✏️ Create Post</button>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className={styles.layout}>
        <div className={styles.feed}>

          {/* Category page header (Reddit-like) */}
          {view === 'category' && activeCat && (
            <CategoryPageHeader cat={activeCat} onBack={goHome} />
          )}

          {/* Quick compose bar (Twitter-like) — only on home */}
          {view === 'home' && (
            <QuickCompose me={user} onOpen={(cat) => setCreateModal(cat || 'open')} />
          )}

          {/* Sort bar */}
          <div className={styles.sortBar}>
            {[['hot','🔥 Hot'],['new','✨ New'],['top','🏆 Top']].map(([id,label])=>(
              <button key={id} className={`${styles.sortBtn} ${sort===id?styles.sortBtnOn:''}`}
                onClick={()=>setSort(id)}>{label}</button>
            ))}
            {view === 'home' && (
              <span className={styles.sortMeta}>Showing all categories</span>
            )}
            {view === 'category' && (
              <span className={styles.sortMeta}>{visiblePosts.length} post{visiblePosts.length!==1?'s':''}</span>
            )}
          </div>

          {/* Posts */}
          {loading||postsLoading ? <div className={styles.loadingWrap}><Spinner/></div>
          : visiblePosts.length===0 ? (
            <div className={styles.emptyFeed}>
              <div className={styles.emptyIcon}>{activeCat ? activeCat.icon : '📭'}</div>
              <div className={styles.emptyTitle}>
                {activeCat ? `No ${activeCat.label} posts yet` : 'Feed is empty'}
              </div>
              <p>{activeCat
                ? `Be the first to post in ${activeCat.label}!`
                : 'Create the first post to get things started.'}</p>
              <button className={styles.btnPrimary}
                onClick={()=>setCreateModal(activeCat || 'open')}>
                ✏️ Create a Post
              </button>
            </div>
          ) : (
            <div className={styles.postList}>
              {visiblePosts.map(post=>(
                <PostCard key={post.id} post={post} {...postCardProps} />
              ))}
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <button className={styles.sidebarCreatePost} onClick={()=>setCreateModal('open')}>✏️ Create Post</button>
            {view === 'category' && (
              <button className={styles.sidebarCreateCom} onClick={goHome}>🏠 All Posts</button>
            )}
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitle}>Browse Categories</div>
            {FEED_CATEGORIES.map(cat => (
              <button key={cat.id}
                className={`${styles.catNavItem} ${view==='category'&&activeCat?.id===cat.id ? styles.catNavItemOn : ''}`}
                style={view==='category'&&activeCat?.id===cat.id ? {'--cc': cat.color} : {}}
                onClick={() => openCategory(cat.id)}>
                <span className={styles.catNavIcon}>{cat.icon}</span>
                <div className={styles.catNavInfo}>
                  <span className={styles.catNavLabel}>{cat.label}</span>
                  <span className={styles.catNavDesc}>{cat.description}</span>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitleRow}>
              <span className={styles.sidebarCardTitle}>Communities</span>
              <button className={styles.createCommBtn} onClick={()=>setCreateCommModal(true)}>+ New</button>
            </div>
            {communities.filter(c=>c.type==='community').length === 0 ? (
              <div className={styles.sidebarEmpty}>No communities yet</div>
            ) : communities.filter(c=>c.type==='community').map(comm => (
              <button key={comm.id}
                className={`${styles.catNavItem} ${view==='category'&&activeCat?.id===comm.id ? styles.catNavItemOn : ''}`}
                style={view==='category'&&activeCat?.id===comm.id ? {'--cc': comm.color} : {}}
                onClick={() => openCategory(comm.id)}>
                <span className={styles.catNavIcon}>{comm.icon}</span>
                <div className={styles.catNavInfo}>
                  <span className={styles.catNavLabel}>{comm.name}</span>
                  {comm.description && <span className={styles.catNavDesc}>{comm.description}</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {createModal && (
        <CreatePostModal
          me={user}
          initialCategory={createModal !== 'open' ? createModal : null}
          onClose={()=>setCreateModal(null)}
          onPost={onPostCreated}
          communities={communities}
          onCreateCommunity={()=>{ setCreateModal(null); setCreateCommModal(true); }}
        />
      )}
      {createCommModal && (
        <CreateCommunityModal
          me={user}
          onClose={()=>setCreateCommModal(false)}
          onCreate={onCommunityCreated}
        />
      )}
    </div>
  );
}
