import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { socialApi } from '../api';
import { Spinner } from '../components/UI';
import GiphyPicker from '../components/GiphyPicker';
import styles from './SocialFeed.module.css';

const ROLE_COLORS = { head_admin:'#7c3aed', league_admin:'#f59e0b', admin:'#ef4444', coach:'#1d4ed8', player:'#059669', org_manager:'#6366f1' };
const ROLE_LABELS = { head_admin:'Head Admin', league_admin:'League Admin', admin:'Admin', coach:'Coach', player:'', org_manager:'Org' };
const COMMUNITY_ICONS = ['💬','🎮','🏆','🎯','⚔️','🔫','🎬','🖥️','📈','🌟','🔥','💡','🎲','🏅','🎸','🤝','🧠','🚀','💰','📢'];
const COMMUNITY_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#f97316','#84cc16','#6366f1'];

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

// ── MEDIA ────────────────────────────────────────────────────────────────────
function MediaBlock({ media }) {
  const [err, setErr] = useState(false);
  if (!media?.type) return null;
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

// ── COMMUNITY PILL ───────────────────────────────────────────────────────────
function CommunityPill({ community, onClick }) {
  if (!community) return null;
  return (
    <button className={styles.communityPill} onClick={e=>{e.stopPropagation();onClick?.(community);}}
      style={{'--cp':community.color}}>
      <span>{community.icon}</span>
      <span>c/{community.name}</span>
    </button>
  );
}

// ── VOTE ─────────────────────────────────────────────────────────────────────
function VoteCol({ score, myUpvote, onUpvote }) {
  return (
    <div className={styles.voteCol}>
      <button className={`${styles.upvoteBtn} ${myUpvote?styles.upvoteBtnOn:''}`} onClick={onUpvote}>▲</button>
      <span className={`${styles.voteScore} ${myUpvote?styles.voteScoreOn:''}`}>{score}</span>
      <button className={styles.downvoteBtn}>▼</button>
    </div>
  );
}

// ── COMMENT ──────────────────────────────────────────────────────────────────
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

// ── COMMENT COMPOSE ──────────────────────────────────────────────────────────
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
          <textarea className={styles.ccInput} rows={2} placeholder="Add a comment... (Ctrl+Enter to post)"
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
function PostCard({ post, me, isAdmin, onUpvote, onComment, onDelPost, onDelComment, onVoteComment, onFlag, onPin, onCommunityClick }) {
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(false);
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
        {/* Meta */}
        <div className={styles.postMeta}>
          {post.pinned && <span className={styles.pinnedTag}>📌 Pinned</span>}
          <CommunityPill community={post.community} onClick={onCommunityClick}/>
          <span className={styles.postBy}>•</span>
          <div className={styles.postAuthorAvatar} style={{background:post.userAvatarColor}}>{post.userInitials}</div>
          <span className={styles.postAuthorName}>{post.userName}</span>
          {ROLE_LABELS[post.userRole] && (
            <span className={styles.postAuthorRole} style={{color:ROLE_COLORS[post.userRole]}}>{ROLE_LABELS[post.userRole]}</span>
          )}
          <span className={styles.postTime}>{timeAgo(post.createdAt)}</span>
          {post.flagged && isAdmin && <span className={styles.flagTag}>🚩 Flagged</span>}
        </div>

        {/* Title */}
        <h3 className={styles.postTitle}>{post.title}</h3>

        {/* Body */}
        {post.text && <p className={styles.postText}>{post.text}</p>}

        {/* Media */}
        {post.media && <div className={styles.postMedia}><MediaBlock media={post.media}/></div>}

        {/* Action bar */}
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

        {/* Comments */}
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

// ── CREATE POST MODAL ────────────────────────────────────────────────────────
function CreatePostModal({ communities, me, onClose, onPost }) {
  const [communityId, setCommunityId] = useState('');
  const [title, setTitle]   = useState('');
  const [text, setText]     = useState('');
  const [tab, setTab]       = useState('text');
  const [media, setMedia]   = useState(null);
  const [linkUrl, setLink]  = useState('');
  const [showGif, setGif]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const fileRef             = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => setMedia({type:'image',url:ev.target.result,alt:f.name});
    r.readAsDataURL(f);
  };

  const buildMedia = () => {
    if (tab==='image') return media;
    if (tab==='link' && linkUrl.trim()) return socialApi.parseMediaUrl(linkUrl.trim());
    return null;
  };

  const submit = async () => {
    if (!communityId) { setError('Choose a community.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }
    setError(''); setSaving(true);
    const res = await socialApi.createForumPost(
      me.id, `${me.firstName} ${me.lastName}`,
      me.role, me.initials, me.avatarColor,
      communityId, title, text, null, buildMedia()
    );
    setSaving(false);
    if (res.success) { onPost(res.post); onClose(); }
    else setError(res.error||'Failed to post.');
  };

  const chosen = communities.find(c=>c.id===communityId);

  return (
    <div className={styles.modalBackdrop} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <span className={styles.modalTitle}>Create Post</span>
          <button className={styles.modalX} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>

          {/* Community picker */}
          <div className={styles.field}>
            <label>Community *</label>
            {chosen ? (
              <div className={styles.chosenCommunity} style={{'--cp':chosen.color}}>
                <span>{chosen.icon}</span>
                <span>c/{chosen.name}</span>
                <button onClick={()=>setCommunityId('')}>✕</button>
              </div>
            ) : (
              <div className={styles.communityPickList}>
                {communities.map(c=>(
                  <button key={c.id} className={styles.communityPickItem}
                    style={{'--cp':c.color}} onClick={()=>setCommunityId(c.id)}>
                    <span className={styles.cpiIcon}>{c.icon}</span>
                    <div><div className={styles.cpiName}>c/{c.name}</div>
                    <div className={styles.cpiMeta}>{c.memberCount} members</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className={styles.field}>
            <label>Title * <span className={styles.charCount}>{title.length}/200</span></label>
            <input className={styles.formInput} value={title}
              onChange={e=>setTitle(e.target.value.slice(0,200))} placeholder="Give your post a title..." maxLength={200}/>
          </div>

          {/* Type tabs */}
          <div className={styles.postTypeTabs}>
            {[['text','📝 Text'],['image','🖼️ Image/GIF'],['link','🔗 Link']].map(([id,label])=>(
              <button key={id} className={`${styles.ptt} ${tab===id?styles.pttOn:''}`}
                onClick={()=>{setTab(id);setMedia(null);}}>
                {label}
              </button>
            ))}
          </div>

          {tab==='text' && (
            <textarea className={styles.formTextarea} rows={4} value={text}
              onChange={e=>setText(e.target.value)} placeholder="Body text (optional)..."/>
          )}
          {tab==='image' && (
            <div className={styles.mediaUploadZone}>
              {media ? (
                <div className={styles.mediaPreview}>
                  <img src={media.url} alt="preview"/>
                  <button className={styles.removePrev} onClick={()=>setMedia(null)}>✕ Remove</button>
                </div>
              ) : (
                <div className={styles.mediaUploadBtns}>
                  <button className={styles.uploadBtn} onClick={()=>fileRef.current.click()}>📁 Upload Image</button>
                  <button className={styles.uploadBtn} onClick={()=>setGif(true)}>🎞️ Pick a GIF</button>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
                </div>
              )}
            </div>
          )}
          {tab==='link' && (
            <input className={styles.formInput} value={linkUrl}
              onChange={e=>setLink(e.target.value)} placeholder="https://..."/>
          )}

          {error && <div className={styles.formErr}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={saving||!communityId||!title.trim()} onClick={submit}>
            {saving?'Posting…':'Post'}
          </button>
        </div>
      </div>
      {showGif && <GiphyPicker onSelect={g=>{setMedia(g);setGif(false);}} onClose={()=>setGif(false)}/>}
    </div>
  );
}

// ── CREATE COMMUNITY MODAL ───────────────────────────────────────────────────
function CreateCommunityModal({ me, onClose, onCreated }) {
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [icon, setIcon]     = useState('💬');
  const [color, setColor]   = useState('#3b82f6');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const submit = async () => {
    if (!name.trim()) { setError('Name required.'); return; }
    if (!desc.trim()) { setError('Description required.'); return; }
    setSaving(true);
    const res = await socialApi.createCommunity(me.id, {name, description:desc, icon, color});
    setSaving(false);
    if (res.success) { onCreated(res.community); onClose(); }
    else setError(res.error||'Failed.');
  };

  return (
    <div className={styles.modalBackdrop} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={styles.modal} style={{maxWidth:460}}>
        <div className={styles.modalHead}>
          <span className={styles.modalTitle}>Create Community</span>
          <button className={styles.modalX} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>

          {/* Live preview */}
          <div className={styles.communityPreview} style={{borderColor:color}}>
            <div className={styles.cpIcon} style={{background:color+'22',borderColor:color+'66'}}>{icon}</div>
            <div>
              <div className={styles.cpName} style={{color}}>c/{name||'community-name'}</div>
              <div className={styles.cpSlug}>/{slug||'community-name'}</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>Name * <span className={styles.charCount}>{name.length}/30</span></label>
            <input className={styles.formInput} value={name} onChange={e=>setName(e.target.value.slice(0,30))}
              placeholder="e.g. Rocket League"/>
          </div>
          <div className={styles.field}>
            <label>Description *</label>
            <textarea className={styles.formTextarea} rows={3} value={desc}
              onChange={e=>setDesc(e.target.value.slice(0,300))} placeholder="What is this community about?"/>
          </div>
          <div className={styles.field}>
            <label>Icon</label>
            <div className={styles.iconGrid}>
              {COMMUNITY_ICONS.map(ic=>(
                <button key={ic} className={`${styles.iconOpt} ${icon===ic?styles.iconOptOn:''}`}
                  style={icon===ic?{background:color+'33',borderColor:color}:{}}
                  onClick={()=>setIcon(ic)}>{ic}</button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label>Color</label>
            <div className={styles.colorRow}>
              {COMMUNITY_COLORS.map(c=>(
                <button key={c} className={`${styles.colorDot} ${color===c?styles.colorDotOn:''}`}
                  style={{background:c, outline:color===c?`3px solid ${c}`:'none', outlineOffset:3}}
                  onClick={()=>setColor(c)}/>
              ))}
            </div>
          </div>
          {error && <div className={styles.formErr}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={saving||!name.trim()||!desc.trim()} onClick={submit}>
            {saving?'Creating…':'Create Community'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── COMMUNITY SIDEBAR ITEM ───────────────────────────────────────────────────
function SidebarCommunity({ community, isMember, onJoin, onLeave, onClick, isPinned, onPin }) {
  return (
    <div className={styles.sbCommunity} onClick={()=>onClick(community)}>
      <div className={styles.sbcIcon} style={{background:community.color+'22',borderColor:community.color+'44'}}>{community.icon}</div>
      <div className={styles.sbcInfo}>
        <div className={styles.sbcName}>c/{community.name}</div>
        <div className={styles.sbcMeta}>{community.memberCount} members</div>
      </div>
      <div className={styles.sbcActions}>
        {onPin && (
          <button
            className={`${styles.sbcPin} ${isPinned?styles.sbcPinOn:''}`}
            onClick={e=>{e.stopPropagation(); onPin(community.id);}}
            title={isPinned?'Unpin community':'Pin for quick access'}
          >📌</button>
        )}
        <button className={`${styles.sbcJoin} ${isMember?styles.sbcJoined:''}`}
          style={!isMember?{borderColor:community.color,color:community.color}:{}}
          onClick={e=>{e.stopPropagation(); isMember?onLeave(community.id):onJoin(community.id);}}>
          {isMember?'✓':'Join'}
        </button>
      </div>
    </div>
  );
}

// ── COMMUNITY PAGE HEADER ────────────────────────────────────────────────────
function CommunityHeader({ community, isMember, onJoin, onLeave }) {
  return (
    <div className={styles.communityHeader}>
      <div className={styles.chBanner} style={{background:`linear-gradient(135deg,${community.color}44,${community.color}11)`}}/>
      <div className={styles.chBody}>
        <div className={styles.chIcon} style={{background:community.color+'22',border:`2px solid ${community.color}`}}>{community.icon}</div>
        <div className={styles.chInfo}>
          <h2 className={styles.chName}>c/{community.name}</h2>
          <p className={styles.chDesc}>{community.description}</p>
          <div className={styles.chMeta}>
            <span>{community.memberCount} members</span>
            {community.isOfficial && <span className={styles.officialBadge}>✓ Official</span>}
          </div>
        </div>
        <button className={`${styles.joinBtn} ${isMember?styles.joinBtnOn:''}`}
          style={!isMember?{background:community.color,borderColor:community.color}:{}}
          onClick={()=>isMember?onLeave(community.id):onJoin(community.id)}>
          {isMember?'✓ Joined':'+ Join'}
        </button>
      </div>
      {community.rules?.length>0 && (
        <div className={styles.chRules}>
          <div className={styles.chRulesTitle}>Community Rules</div>
          {community.rules.map((r,i)=>(
            <div key={i} className={styles.chRule}><span className={styles.chRuleNum}>{i+1}</span><span>{r}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function SocialFeed() {
  const { user, userAge } = useAuth();
  const isAdmin = ['admin','head_admin','league_admin'].includes(user?.role);

  const [view, setView]                   = useState('home');
  const [activeCommunity, setActive]      = useState(null);
  const [communities, setCommunities]     = useState([]);
  const [posts, setPosts]                 = useState([]);
  const [sort, setSort]                   = useState('hot');
  const [loading, setLoading]             = useState(true);
  const [postsLoading, setPostsLoading]   = useState(false);
  const [allowed, setAllowed]             = useState(true);
  const [search, setSearch]               = useState('');
  const [showCreatePost, setShowPost]     = useState(false);
  const [showCreateCom,  setShowCom]      = useState(false);
  const [pinnedIds, setPinnedIds]         = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('hcg_pinned_communities') || '[]'); }
    catch { return []; }
  });

  // Load communities once
  useEffect(()=>{ socialApi.getCommunities().then(setCommunities); },[]);

  // Load posts whenever view/sort/community changes
  const loadPosts = useCallback(async (cId=null, s=sort) => {
    setPostsLoading(true);
    const res = await socialApi.getFeedPosts(user?.id, userAge, s, cId);
    setAllowed(res.allowed!==false);
    setPosts(res.posts||[]);
    setPostsLoading(false);
    setLoading(false);
  },[user?.id, userAge, sort]);

  useEffect(()=>{
    if (view==='home')       loadPosts(null, sort);
    else if (view==='community' && activeCommunity) loadPosts(activeCommunity.id, sort);
  },[view, activeCommunity?.id, sort]);

  // Search filter (communities only, client-side)
  const searchResults = search.trim()
    ? communities.filter(c=> c.name.toLowerCase().includes(search.toLowerCase()) ||
                             c.description.toLowerCase().includes(search.toLowerCase()))
    : [];

  const openCommunity = useCallback(async (community) => {
    const full = await socialApi.getCommunity(community.id);
    setActive(full||community);
    setView('community');
    setSearch('');
  },[]);

  const joinCommunity = async (id) => {
    await socialApi.joinCommunity(id, user.id);
    setCommunities(await socialApi.getCommunities());
    if (activeCommunity?.id===id) setActive(await socialApi.getCommunity(id));
  };
  const leaveCommunity = async (id) => {
    await socialApi.leaveCommunity(id, user.id);
    setCommunities(await socialApi.getCommunities());
    if (activeCommunity?.id===id) setActive(await socialApi.getCommunity(id));
  };

  const togglePin = (id) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id];
      try { sessionStorage.setItem('hcg_pinned_communities', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const upvote          = async (id) => {
    await socialApi.toggleUpvote(id, user.id);
    setPosts(p=>p.map(post=>post.id!==id?post:{...post, myUpvote:!post.myUpvote, score:post.myUpvote?post.score-1:post.score+1}));
  };
  const addComment      = async (postId, text, media) => {
    const res = await socialApi.addComment(postId, user.id, `${user.firstName} ${user.lastName}`, user.role, user.initials, user.avatarColor, text, userAge, media);
    if (res.success) setPosts(p=>p.map(post=>post.id!==postId?post:{...post, comments:[...post.comments,res.comment]}));
  };
  const deletePost      = async (id) => { await socialApi.deletePost(id); setPosts(p=>p.filter(post=>post.id!==id)); };
  const deleteComment   = async (pId,cId) => { await socialApi.deleteComment(pId,cId); setPosts(p=>p.map(post=>post.id!==pId?post:{...post,comments:post.comments.filter(c=>c.id!==cId)})); };
  const voteComment     = async (pId,cId) => {
    await socialApi.upvoteComment(pId,cId,user.id);
    setPosts(p=>p.map(post=>post.id!==pId?post:{...post,comments:post.comments.map(c=>c.id!==cId?c:{...c, upvotes:c.upvotes.includes(user.id)?c.upvotes.filter(x=>x!==user.id):[...c.upvotes,user.id]})}));
  };
  const flagPost        = async (id) => { await socialApi.flagPost(id, user.id, 'User report'); setPosts(p=>p.map(post=>post.id!==id?post:{...post,flagged:true})); };
  const pinPost         = async (id, pinned) => { await socialApi.pinPost(id, pinned); setPosts(p=>p.map(post=>post.id!==id?post:{...post,pinned})); };

  const onPostCreated = (post) => {
    const community = communities.find(c=>c.id===post.communityId);
    const enriched = {...post, community: community?{id:community.id,name:community.name,icon:community.icon,color:community.color}:null};
    if (view==='home'||(view==='community'&&activeCommunity?.id===post.communityId)) {
      setPosts(p=>[enriched,...p]);
    }
  };
  const onCommunityCreated = (community) => {
    setCommunities(prev=>[{...community,memberCount:1,postCount:0},...prev]);
  };

  if (!allowed) return (
    <div className={styles.ageLock}>
      <div className={styles.ageLockIcon}>🔞</div>
      <h3>Age Restricted</h3>
      <p>The Social Feed is available to members 16 and older.</p>
    </div>
  );

  const isMember = (id) => communities.find(c=>c.id===id)?.members?.includes(user?.id);
  const myCommunities      = communities.filter(c=>c.members?.includes(user?.id));
  const official           = communities.filter(c=>c.isOfficial);
  const others             = communities.filter(c=>!c.isOfficial);
  const pinnedCommunities  = pinnedIds.map(id=>communities.find(c=>c.id===id)).filter(Boolean);

  return (
    <div className={styles.wrap}>

      {/* ── TOP BAR ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          {view==='community'&&activeCommunity ? (
            <div className={styles.breadcrumb}>
              <button onClick={()=>{setView('home');setActive(null);}}>🏠 Home</button>
              <span>›</span>
              <span style={{color:activeCommunity.color}}>{activeCommunity.icon} c/{activeCommunity.name}</span>
            </div>
          ) : (
            <h2 className={styles.feedTitle}>{view==='search'?'🔍 Find Communities':'🏠 Home Feed'}</h2>
          )}
        </div>
        <div className={styles.searchWrap}>
          <span>🔍</span>
          <input className={styles.searchInput} placeholder="Search communities…"
            value={search}
            onChange={e=>{setSearch(e.target.value); if(e.target.value) setView('search'); else setView(activeCommunity?'community':'home');}}/>
          {search&&<button className={styles.searchX} onClick={()=>{setSearch('');setView(activeCommunity?'community':'home');}}>✕</button>}
        </div>
        <button className={styles.createPostBtn} onClick={()=>setShowPost(true)}>✏️ Create Post</button>
      </div>

      {/* ── SEARCH VIEW ── */}
      {view==='search' && (
        <div className={styles.searchView}>
          <div className={styles.searchViewTitle}>{searchResults.length} result{searchResults.length!==1?'s':''} for "{search}"</div>
          {searchResults.length===0 ? (
            <div className={styles.searchEmpty}>
              <div className={styles.searchEmptyIcon}>🔭</div>
              <div>No communities found</div>
              <button className={styles.btnPrimary} style={{marginTop:'1rem'}} onClick={()=>setShowCom(true)}>
                + Create "{search}"
              </button>
            </div>
          ) : (
            <div className={styles.searchList}>
              {searchResults.map(c=>(
                <div key={c.id} className={styles.searchCard} onClick={()=>openCommunity(c)}>
                  <div className={styles.scardIcon} style={{background:c.color+'22',borderColor:c.color+'55'}}>{c.icon}</div>
                  <div className={styles.scardInfo}>
                    <div className={styles.scardName} style={{color:c.color}}>c/{c.name}</div>
                    <div className={styles.scardDesc}>{c.description}</div>
                    <div className={styles.scardMeta}>{c.memberCount} members · {c.postCount} posts{c.isOfficial?' · ✓ Official':''}</div>
                  </div>
                  <button className={`${styles.sbcJoin} ${isMember(c.id)?styles.sbcJoined:''}`}
                    style={!isMember(c.id)?{borderColor:c.color,color:c.color}:{}}
                    onClick={e=>{e.stopPropagation(); isMember(c.id)?leaveCommunity(c.id):joinCommunity(c.id);}}>
                    {isMember(c.id)?'✓ Joined':'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      {view!=='search' && (
        <div className={styles.layout}>
          <div className={styles.feed}>

            {/* Community page header */}
            {view==='community'&&activeCommunity && (
              <CommunityHeader community={activeCommunity}
                isMember={isMember(activeCommunity.id)}
                onJoin={joinCommunity} onLeave={leaveCommunity}/>
            )}

            {/* Sort bar */}
            <div className={styles.sortBar}>
              {[['hot','🔥 Hot'],['new','✨ New'],['top','🏆 Top']].map(([id,label])=>(
                <button key={id} className={`${styles.sortBtn} ${sort===id?styles.sortBtnOn:''}`}
                  onClick={()=>setSort(id)}>{label}</button>
              ))}
            </div>

            {/* Posts */}
            {loading||postsLoading ? <div className={styles.loadingWrap}><Spinner/></div>
            : posts.length===0 ? (
              <div className={styles.emptyFeed}>
                <div className={styles.emptyIcon}>📭</div>
                <div className={styles.emptyTitle}>{view==='community'?'No posts yet':'Your feed is empty'}</div>
                <p>{view==='community'?'Be the first to post in this community!':'Join communities to see posts here.'}</p>
                <button className={styles.btnPrimary} onClick={()=>setShowPost(true)}>✏️ Create a Post</button>
              </div>
            ) : (
              <div className={styles.postList}>
                {posts.map(post=>(
                  <PostCard key={post.id} post={post}
                    me={{...user, id:user?.id||'guest'}}
                    isAdmin={isAdmin}
                    onUpvote={upvote} onComment={addComment}
                    onDelPost={deletePost} onDelComment={deleteComment}
                    onVoteComment={voteComment}
                    onFlag={flagPost} onPin={pinPost}
                    onCommunityClick={openCommunity}/>
                ))}
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <button className={styles.sidebarCreatePost} onClick={()=>setShowPost(true)}>✏️ Create Post</button>
              <button className={styles.sidebarCreateCom} onClick={()=>setShowCom(true)}>🏘️ Create Community</button>
            </div>

            {myCommunities.length>0 && (
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardTitle}>My Communities</div>
                {myCommunities.slice(0,5).map(c=>(
                  <SidebarCommunity key={c.id} community={c} isMember={true}
                    onJoin={joinCommunity} onLeave={leaveCommunity} onClick={openCommunity}
                    isPinned={pinnedIds.includes(c.id)} onPin={togglePin}/>
                ))}
              </div>
            )}

            <div className={styles.sidebarCard}>
              <div className={styles.sidebarCardTitle}>✓ Official</div>
              {official.map(c=>(
                <SidebarCommunity key={c.id} community={c} isMember={isMember(c.id)}
                  onJoin={joinCommunity} onLeave={leaveCommunity} onClick={openCommunity}
                  isPinned={pinnedIds.includes(c.id)} onPin={togglePin}/>
              ))}
            </div>

            {/* ── PINNED COMMUNITIES ── */}
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarCardTitle}>
                <span>📌 Pinned</span>
                {pinnedCommunities.length > 0 && (
                  <span className={styles.pinnedCount}>{pinnedCommunities.length}</span>
                )}
              </div>
              {pinnedCommunities.length === 0 ? (
                <div className={styles.pinnedEmpty}>
                  <div className={styles.pinnedEmptyIcon}>📌</div>
                  <div className={styles.pinnedEmptyText}>Pin communities for quick access</div>
                  <div className={styles.pinnedEmptyHint}>Click the 📌 next to any community</div>
                </div>
              ) : (
                <div className={styles.pinnedList}>
                  {pinnedCommunities.map(c => (
                    <div key={c.id} className={styles.pinnedItem} onClick={()=>openCommunity(c)}>
                      <div className={styles.pinnedItemIcon} style={{background:c.color+'22', borderColor:c.color+'55'}}>{c.icon}</div>
                      <div className={styles.pinnedItemInfo}>
                        <div className={styles.pinnedItemName}>c/{c.name}</div>
                        <div className={styles.pinnedItemMeta}>{c.memberCount} members</div>
                      </div>
                      <button
                        className={styles.pinnedUnpin}
                        onClick={e=>{e.stopPropagation(); togglePin(c.id);}}
                        title="Unpin"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {others.length>0 && (
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardTitle}>All Communities</div>
                {others.map(c=>(
                  <SidebarCommunity key={c.id} community={c} isMember={isMember(c.id)}
                    onJoin={joinCommunity} onLeave={leaveCommunity} onClick={openCommunity}
                    isPinned={pinnedIds.includes(c.id)} onPin={togglePin}/>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {showCreatePost && (
        <CreatePostModal communities={communities} me={user}
          onClose={()=>setShowPost(false)} onPost={onPostCreated}/>
      )}
      {showCreateCom && (
        <CreateCommunityModal me={user}
          onClose={()=>setShowCom(false)} onCreated={onCommunityCreated}/>
      )}
    </div>
  );
}
