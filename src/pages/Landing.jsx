import { useState, useEffect, useRef } from 'react';
import { publicApi } from '../api';
import { SectionHeader, ContactLink } from '../components/UI';
import styles from './Landing.module.css';


// ── TOPOGRAPHIC MAP BACKGROUND ────────────────────────────────────
// Generates organic contour lines in the HCEA navy/blue palette
function TopoBackground() {
  // Each path is a closed contour line at a different "elevation"
  // Coordinates are SVG viewBox 0 0 1440 900 (matches typical hero viewport)
  return (
    <svg
      className={styles.topoSvg}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Fade mask — topo fades out toward right where content panels sit */}
        <linearGradient id="topoFade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="white" stopOpacity="1" />
          <stop offset="50%"  stopColor="white" stopOpacity="0.6" />
          <stop offset="75%"  stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="topoMask">
          <rect width="1440" height="900" fill="url(#topoFade)" />
        </mask>
        {/* Radial glow at the center-left "peak" */}
        <radialGradient id="topoPeak" cx="28%" cy="55%" r="40%">
          <stop offset="0%"  stopColor="#1d4ed8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#080f1c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="topoPeak2" cx="12%" cy="75%" r="25%">
          <stop offset="0%"  stopColor="#3b82f6" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#080f1c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base glow blobs behind the contours */}
      <rect width="1440" height="900" fill="url(#topoPeak)" />
      <rect width="1440" height="900" fill="url(#topoPeak2)" />

      {/* Contour lines — group masked to fade right */}
      <g mask="url(#topoMask)">

        {/* Outermost / lowest elevation — widest rings */}
        <path className={styles.topoLine} style={{'--delay':'0s','--dur':'18s'}}
          d="M -60 820 C 80 760, 200 700, 340 680 C 480 660, 560 720, 680 740 C 800 760, 920 780, 1060 760 C 1200 740, 1340 700, 1500 680"
          fill="none" />
        <path className={styles.topoLine} style={{'--delay':'1.5s','--dur':'22s'}}
          d="M -60 780 C 60 720, 160 650, 310 620 C 460 590, 550 660, 680 690 C 810 720, 940 730, 1080 710 C 1220 690, 1360 650, 1500 630"
          fill="none" />
        <path className={styles.topoLine} style={{'--delay':'0.8s','--dur':'20s'}}
          d="M -60 860 C 100 820, 240 780, 390 770 C 540 760, 620 800, 740 820 C 860 840, 1000 850, 1140 840 C 1280 830, 1400 810, 1500 800"
          fill="none" />

        {/* Mid elevation */}
        <path className={styles.topoLineMid} style={{'--delay':'0.3s','--dur':'25s'}}
          d="M -60 740 C 40 670, 140 590, 280 550 C 420 510, 520 580, 640 620 C 760 660, 890 670, 1030 645 C 1170 620, 1320 575, 1500 550"
          fill="none" />
        <path className={styles.topoLineMid} style={{'--delay':'2s','--dur':'19s'}}
          d="M -60 700 C 30 620, 110 530, 250 480 C 390 430, 500 510, 610 560 C 720 610, 850 620, 990 590 C 1130 560, 1290 510, 1500 480"
          fill="none" />
        <path className={styles.topoLineMid} style={{'--delay':'1s','--dur':'23s'}}
          d="M -80 660 C 20 580, 120 490, 240 440 C 360 390, 470 455, 580 505 C 690 555, 820 570, 960 540 C 1100 510, 1270 458, 1500 430"
          fill="none" />
        <path className={styles.topoLineMid} style={{'--delay':'3s','--dur':'21s'}}
          d="M -80 610 C 10 530, 100 445, 220 395 C 340 345, 450 410, 555 458 C 660 506, 795 520, 930 492 C 1065 464, 1240 410, 1500 385"
          fill="none" />

        {/* Inner / high elevation — tighter, brighter */}
        <path className={styles.topoLineHigh} style={{'--delay':'0.5s','--dur':'28s'}}
          d="M -80 560 C -10 475, 80 385, 185 335 C 290 285, 395 350, 490 398 C 585 446, 715 465, 845 438 C 975 411, 1160 360, 1400 330"
          fill="none" />
        <path className={styles.topoLineHigh} style={{'--delay':'1.8s','--dur':'24s'}}
          d="M -80 510 C -20 420, 60 330, 160 278 C 260 226, 360 290, 450 340 C 540 390, 670 410, 795 385 C 920 360, 1110 308, 1380 275"
          fill="none" />
        <path className={styles.topoLineHigh} style={{'--delay':'0.2s','--dur':'30s'}}
          d="M -60 465 C 0 378, 70 285, 162 234 C 254 183, 348 244, 432 292 C 516 340, 640 360, 762 336 C 884 312, 1080 260, 1360 228"
          fill="none" />
        <path className={styles.topoLineHigh} style={{'--delay':'2.5s','--dur':'26s'}}
          d="M -40 418 C 18 334, 82 242, 166 192 C 250 142, 338 200, 416 248 C 494 296, 614 318, 732 295 C 850 272, 1050 220, 1340 192"
          fill="none" />

        {/* Summit lines — very tight, highest elevation, most glow */}
        <path className={styles.topoLinePeak} style={{'--delay':'0.7s','--dur':'32s'}}
          d="M -40 372 C 28 288, 88 198, 162 152 C 236 106, 318 158, 390 204 C 462 250, 574 274, 686 253 C 798 232, 1000 182, 1300 155"
          fill="none" />
        <path className={styles.topoLinePeak} style={{'--delay':'2.2s','--dur':'27s'}}
          d="M -20 328 C 42 246, 96 158, 162 114 C 228 70, 304 120, 372 165 C 440 210, 546 235, 652 216 C 758 197, 960 148, 1280 122"
          fill="none" />
        <path className={styles.topoLinePeak} style={{'--delay':'1.2s','--dur':'35s'}}
          d="M 0 290 C 52 210, 102 124, 160 82 C 218 40, 290 86, 354 130 C 418 174, 518 200, 618 182 C 718 164, 920 116, 1260 90"
          fill="none" />

        {/* Cross contours — horizontal "latitude" lines for depth */}
        <path className={styles.topoLineFaint} style={{'--delay':'4s','--dur':'40s'}}
          d="M -80 480 C 120 460, 300 490, 480 510 C 660 530, 800 500, 960 475 C 1120 450, 1300 430, 1500 445"
          fill="none" />
        <path className={styles.topoLineFaint} style={{'--delay':'5s','--dur':'38s'}}
          d="M -80 380 C 100 358, 260 388, 420 405 C 580 422, 720 398, 880 372 C 1040 346, 1230 328, 1500 340"
          fill="none" />
        <path className={styles.topoLineFaint} style={{'--delay':'3.5s','--dur':'42s'}}
          d="M -80 580 C 130 556, 310 584, 490 600 C 670 616, 820 590, 980 564 C 1140 538, 1310 522, 1500 535"
          fill="none" />

        {/* Elevation tick marks along contours */}
        {[
          [180, 428], [260, 390], [340, 352], [200, 510],
          [290, 475], [370, 442], [140, 580], [240, 548],
          [320, 516], [160, 640], [260, 612], [150, 690],
          [80, 720], [100, 660], [120, 598]
        ].map(([x, y], i) => (
          <line key={i}
            x1={x} y1={y - 6} x2={x} y2={y + 6}
            className={styles.topoTick}
            style={{ '--delay': `${(i * 0.3) % 4}s` }}
          />
        ))}

      </g>
    </svg>
  );
}

export default function Landing({ onLoginClick, onJoinClick }) {

  // Scroll reveal
  const revealRefs = useRef([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add(styles.visible); observer.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    revealRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (el) => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };

  // Hero panel data
  const [topPosts, setTopPosts]         = useState([]);
  const [upcomingTournament, setUpcomingTournament] = useState(null);
  const [activeLeague, setActiveLeague] = useState(null);
  const [topTeam, setTopTeam]           = useState(null);

  useEffect(() => {
    Promise.all([
      publicApi.getTopPosts(),
      publicApi.getUpcomingTournament(),
      publicApi.getActiveleague(),
      publicApi.getTopTeam(),
    ]).then(([posts, tourn, league, team]) => {
      setTopPosts(posts);
      setUpcomingTournament(tourn);
      setActiveLeague(league);
      setTopTeam(team);
    });
  }, []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    alert('Thanks! We\'ll be in touch shortly.');
  };

  return (
    <div className={styles.landing}>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <TopoBackground />

        <div className={styles.heroRow}>

          {/* LEFT — Main title block */}
          <div className={styles.heroContent}>
            <div className={`${styles.heroTag} fade-up`}>The All-In-One Competitive Gaming Platform</div>
            <h1 className={`${styles.h1} fade-up-1`}>
              <span className={styles.h1Line1}>HIGH</span>
              <em className={styles.h1Accent}>CALIBER</em>
              <span className={styles.h1Line3}>GAMING</span>
            </h1>
            <div className={styles.heroDivider} />
            <p className={`${styles.heroSub} fade-up-2`}>Building the next generation of esports competitors one season at a time. You're premiere location for season leagues, ladders, money matches, clans, esports social media and much more to come!</p>
            <div className={`${styles.heroActions} fade-up-3`}>
              <button className="btn btn-primary btn-lg" onClick={onJoinClick}>Join HCG Free</button>
              <a href="#hcea" className="btn btn-ghost btn-lg">🎓 HCEA Academy</a>
            </div>
            <div className={`${styles.heroStats} fade-up-4`}>
              {[['15','Esports Titles'],['50+','Yearly Tournaments'],['18+','Cash Matches'],['15','Seasonal Ladders']].map(([n,l]) => (
                <div key={l}><div className={styles.statNum}>{n}</div><div className={styles.statLabel}>{l}</div></div>
              ))}
            </div>
            <div className={`${styles.heroStats} fade-up-4`}>
              {[['Every Program and feature supports our future generation of esports competitors!','Sign Up Today!']].map(([n,l]) => (
                <div key={l}><div className={styles.statNum}>{n}</div><div className={styles.statLabel}>{l}</div></div>
              ))}
            </div>
          </div>

          {/* CENTER — Community Feed top posts */}
          <div className={`${styles.heroPanel} ${styles.heroPanelFeed} fade-up-2`}>
            <div className={styles.heroPanelHeader}>
              <span className={styles.heroPanelDot} />
              <span className={styles.heroPanelTitle}>Community Feed</span>
              <span className={styles.heroPanelBadge}>LIVE</span>
            </div>
            <div className={styles.feedList}>
              {topPosts.length === 0 ? (
                <div className={styles.feedEmpty}>Loading community posts...</div>
              ) : topPosts.map(post => (
                <div key={post.id} className={`${styles.feedPost} ${post.pinned ? styles.feedPostPinned : ''}`}>
                  {post.pinned && <span className={styles.feedPin}>📌</span>}
                  <div className={styles.feedAvatar} style={{ background: post.userAvatarColor }}>
                    {post.userInitials}
                  </div>
                  <div className={styles.feedPostBody}>
                    <div className={styles.feedPostMeta}>
                      <span className={styles.feedUser}>{post.userName}</span>
                      <span className={styles.feedRole}>{post.userRole}</span>
                    </div>
                    {post.text && <div className={styles.feedText}>{post.text}</div>}

                    {/* ── Media rendering ── */}
                    {post.media && (() => {
                      const m = post.media;
                      if (m.type === 'youtube' || m.type === 'twitch') {
                        return (
                          <div className={styles.feedEmbed}>
                            <iframe
                              src={m.embedUrl}
                              title={m.title || 'Video'}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        );
                      }
                      if (m.type === 'images' && m.images?.length) {
                        return (
                          <div className={`${styles.feedImgGrid} ${styles[`feedImgGrid${Math.min(m.images.length, 4)}`]}`}>
                            {m.images.slice(0, 4).map((img, i) => (
                              <img key={i} src={img.url} alt={img.alt || ''} className={styles.feedImg} loading="lazy" />
                            ))}
                          </div>
                        );
                      }
                      if (m.type === 'gif') {
                        return (
                          <div className={styles.feedGifWrap}>
                            <img src={m.url} alt={m.alt || 'GIF'} className={styles.feedImg} loading="lazy" />
                            <span className={styles.feedGifBadge}>GIF</span>
                          </div>
                        );
                      }
                      if (m.type === 'link') {
                        return (
                          <a href={m.url} target="_blank" rel="noreferrer" className={styles.feedLinkCard}>
                            <div className={styles.feedLinkDomain}>{m.domain}</div>
                            <div className={styles.feedLinkTitle}>{m.title}</div>
                            {m.description && <div className={styles.feedLinkDesc}>{m.description}</div>}
                          </a>
                        );
                      }
                      return null;
                    })()}

                    <div className={styles.feedFooter}>
                      <span className={styles.feedScore}>▲ {post.score}</span>
                      <span className={styles.feedComments}>💬 {post.comments?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.heroPanelFooter}>Sign in to join the conversation →</div>
          </div>

          {/* RIGHT — Spotlight panel */}
          <div className={`${styles.heroPanel} ${styles.heroPanelSpotlight} fade-up-3`}>
            <div className={styles.heroPanelHeader}>
              <span className={styles.heroPanelDot} style={{ background:'#f59e0b' }} />
              <span className={styles.heroPanelTitle}>What's Happening</span>
            </div>

            {/* Upcoming Tournament */}
            {upcomingTournament && (
              <div className={styles.spotlightCard}>
                <div className={styles.spotlightCardEyebrow}>🏆 Upcoming Tournament</div>
                <div className={styles.spotlightCardTitle}>{upcomingTournament.name}</div>
                <div className={styles.spotlightCardMeta}>
                  <span>{upcomingTournament.game}</span>
                  <span>{upcomingTournament.date}</span>
                </div>
                <div className={styles.spotlightCardRow}>
                  <span className={styles.spotlightCardLabel}>Prize</span>
                  <span className={styles.spotlightCardValue} style={{ color:'#f59e0b' }}>{upcomingTournament.prize}</span>
                </div>
                <div className={styles.spotlightCardRow}>
                  <span className={styles.spotlightCardLabel}>Teams</span>
                  <span className={styles.spotlightCardValue}>{upcomingTournament.registeredTeams?.length || 0} / {upcomingTournament.maxTeams}</span>
                </div>
                <div className={styles.spotlightCardBadge} style={{ background:'rgba(29,78,216,0.12)', borderColor:'rgba(59,130,246,0.3)', color:'#3b82f6' }}>
                  {upcomingTournament.phase?.toUpperCase()}
                </div>
              </div>
            )}

            {/* Active League */}
            {activeLeague && (
              <div className={styles.spotlightCard}>
                <div className={styles.spotlightCardEyebrow}>🏅 Seasonal League</div>
                <div className={styles.spotlightCardTitle}>{activeLeague.name}</div>
                <div className={styles.spotlightCardMeta}>
                  <span>{activeLeague.game}</span>
                  <span>{activeLeague.season}</span>
                </div>
                <div className={styles.spotlightCardRow}>
                  <span className={styles.spotlightCardLabel}>Ends</span>
                  <span className={styles.spotlightCardValue}>{activeLeague.endDate}</span>
                </div>
                <div className={styles.spotlightCardRow}>
                  <span className={styles.spotlightCardLabel}>Groups</span>
                  <span className={styles.spotlightCardValue}>{activeLeague.groups?.length || 0} divisions</span>
                </div>
                <div className={styles.spotlightCardBadge} style={{ background:'rgba(16,185,129,0.1)', borderColor:'rgba(16,185,129,0.3)', color:'#10b981' }}>
                  {activeLeague.status?.toUpperCase()}
                </div>
              </div>
            )}

            {/* Top Team */}
            {topTeam && (
              <div className={`${styles.spotlightCard} ${styles.spotlightCardTop}`}>
                <div className={styles.spotlightCardEyebrow}>🥇 This Week's Top Team</div>
                <div className={styles.spotlightCardTitle}>{topTeam.teamName}</div>
                <div className={styles.spotlightCardMeta}>
                  <span>{topTeam.leagueName}</span>
                </div>
                <div className={styles.topTeamRecord}>
                  <div className={styles.topTeamStat}><span>{topTeam.wins}</span><small>Wins</small></div>
                  <div className={styles.topTeamDivider} />
                  <div className={styles.topTeamStat}><span>{topTeam.losses}</span><small>Losses</small></div>
                  <div className={styles.topTeamDivider} />
                  <div className={styles.topTeamStat}><span>{topTeam.points}</span><small>Points</small></div>
                </div>
                <div className={styles.spotlightCardBadge} style={{ background:'rgba(245,158,11,0.1)', borderColor:'rgba(245,158,11,0.4)', color:'#f59e0b' }}>
                  🔥 {topTeam.streak} STREAK
                </div>
              </div>
            )}

            <div className={styles.heroPanelFooter}>Sign in to register →</div>
          </div>

        </div>{/* end heroRow */}
      </section>

      <div className="divider" />

      {/* ── HCG FEATURES ── */}
      <section id="compete" className={styles.section}>
        <div ref={addRef} className={styles.reveal}>
          <SectionHeader eyebrow="Platform Features" title="Everything You Need to" titleAccent="Compete & Connect" />
        </div>
        <div className={styles.progGrid}>
          {[
            ['01','💬','Social Feed','Gaming-only social feed with post categories: Scrims, LFT, LFO, Roster Moves, Highlights, Montages, VoD Reviews, Announcements, and Discussion. No politics. Pure gaming.','16+ · Community'],
            ['02','🏆','Tournaments & Ladders','Full bracket engine (Single/Double Elimination, Round Robin, Swiss), persistent skill-based ladders, and season leagues. TO Admin application-gated for quality events.','All Skill Levels'],
            ['03','💰','Cash Matches','Skill-based wager matches with escrow hold, dual-result verification, and automated payout. Platform rake on completed matches. KYC required. 18+ only.','18+ · Verified'],
            ['04','🎓','Coaching Marketplace','Verified coaches set rates and availability. Book 1-on-1 sessions, VOD reviews, or written game plans. Google Calendar export, persistent lesson notes, session reviews.','All Games'],
            ['05','🏢','Orgs & Clans','Every team gets a customizable landing page: roster, announcements, stream embeds, sponsor slots, trophy showcases, and clan battle challenges. Esports Orgs are staff-verified.','Teams & Orgs'],
            ['06','👤','Player Profiles','Profiles are trophy cases, resumes, and social pages. Game account linking, HCG ELO ranking, achievement badges, login streaks, sponsor logos, and premium customization.','Your Identity'],
          ].map(([num, icon, title, desc, tag]) => (
            <div ref={addRef} key={num} className={`${styles.reveal} ${styles.progCard}`}>
              <div className={styles.progNum}>{num}</div>
              <div className={styles.progIcon}>{icon}</div>
              <div className={styles.progTitle}>{title}</div>
              <p className={styles.progDesc}>{desc}</p>
              <span className={styles.progTag}>{tag}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ── MEMBERSHIP ── */}
      <section id="membership" className={`${styles.section} ${styles.sectionDark}`}>
        <div ref={addRef} className={styles.reveal}>
          <SectionHeader eyebrow="Join HCG" title="Membership &" titleAccent="Pricing" />
        </div>
        <div className={styles.membershipWrap}>
          {/* Monthly plan */}
          <div ref={addRef} className={`${styles.reveal} ${styles.memCard}`}>
            <div className={styles.memPlanLabel}>Monthly</div>
            <div className={styles.memPrice}><sup>$</sup>12.50</div>
            <div className={styles.memPeriod}>/ Month · $150 billed annually</div>
            <ul className={styles.memFeatures}>
              {['Full access to Social Feed & post all categories','Compete in HCG Leagues, Ladders & Tournaments','Discounted fees and hourly rates for money matches and coaching sessions.','Priority access to prize pool tournaments','Discounted classes, youth summer camp, and access to Academy Summer League.','Discounted tournament entry fees','Verified member badge on your player profile'].map(f => (
                <li key={f}><span>✦</span>{f}</li>
              ))}
            </ul>
            <button className={`btn ${styles.memCtaGhost}`} onClick={onJoinClick}>Get Monthly →</button>
          </div>
          {/* Annual plan */}
          <div ref={addRef} className={`${styles.reveal} ${styles.memCard} ${styles.memCardFeatured}`}>
            <div className={styles.memBestValue}>Best Value · Save $25</div>
            <div className={styles.memPlanLabel}>Annual</div>
            <div className={styles.memPrice}><sup>$</sup>125</div>
            <div className={styles.memPeriod}>/ Year · $10.42/mo</div>
            <ul className={styles.memFeatures}>
              {['Everything in Monthly membership','Group rates for high school & college teams'].map(f => (
                <li key={f}><span>✦</span>{f}</li>
              ))}
            </ul>
            <button className={`btn btn-primary ${styles.memCta}`} onClick={onJoinClick}>Join Annual →</button>
          </div>
          {/* Member benefits */}
          <div ref={addRef} className={`${styles.reveal} ${styles.benefitsSide}`}>
            <h3>Member Benefits</h3>
            <div className={styles.benefitsList}>
              {[
                { icon:'🏅', title:'Free Seasonal Leagues', desc:'All members get full access to every seasonal league, including group standings, weekly matches, and playoff brackets.' },
                { icon:'🎓', title:'Discounted Coaching', desc:'Members receive reduced rates on all 1-on-1 and group coaching sessions with HCG-verified coaches.' },
                { icon:'🏆', title:'Exclusive Prize Tournaments', desc:'Members-only prize tournaments with cash, merchandise, and in-game currency prize pools throughout the year.' },
                { icon:'🎖️', title:'Member Badge & ELO Boost', desc:'Verified member badge on your player profile, priority tournament seeding, and early access to new platform features and events.' },
              ].map(b => (
                <div key={b.title} className={styles.benefitItem}>
                  <span className={styles.benefitIcon}>{b.icon}</span>
                  <div><div className={styles.benefitTitle}>{b.title}</div><div className={styles.benefitDesc}>{b.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── TOURNAMENTS ── */}
      <section id="tournaments" className={styles.section}>
        <div ref={addRef} className={styles.reveal}>
          <SectionHeader eyebrow="Compete & Win" title="Upcoming" titleAccent="Tournaments" />
        </div>
        <div className={styles.tournGrid}>
          <div ref={addRef} className={`${styles.reveal} ${styles.tournFeatured}`}>
            <span className={styles.tournBadge}>⭐ Featured Event</span>
            <div className={styles.tournName}>Team Fight Tactics<br />Tournament</div>
            <div className={styles.tournMeta}>
              <div><label>Date</label><span>February 24</span></div>
              <div><label>Time</label><span>5 PM PST / 8 PM EST</span></div>
              <div><label>Prize Pool</label><span className={styles.prize}>3,500 RP</span></div>
              <div><label>Platform</label><span>Start.gg</span></div>
            </div>
            <a href="https://www.start.gg/hub/high-caliber-academy" target="_blank" rel="noreferrer" className="btn btn-primary">Register on Start.gg →</a>
          </div>
          <div ref={addRef} className={`${styles.reveal} ${styles.tournList}`}>
            {[['Spring Valorant Cup','March 15 · Members Discounted','Open'],['Rocket League Doubles','March 29 · Free Entry','Open'],['Smash Bros. Invitational','April 12 · Members Only','Members'],['HCG Summer League','June – August · Included','Membership']].map(([title, date, tag]) => (
              <div key={title} className={styles.tournMini}>
                <div><div className={styles.miniTitle}>{title}</div><div className={styles.miniDate}>{date}</div></div>
                <span className={styles.miniTag}>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>



      <div className="divider" />

      {/* ── PARTNERS ── */}
      <section className={`${styles.section} ${styles.centered}`}>
        <div ref={addRef} className={styles.reveal}>
          <SectionHeader eyebrow="Nonprofit Partnerships" title="Our" titleAccent="Partners" />
        </div>
        <div className={styles.partnersList}>
          {['Fenworks','Minnesota Varsity League','Pierre Area Boys & Girls Club','Sioux Falls Boys & Girls Clubs','Watertown Boys & Girls Clubs','Boys & Girls Clubs of the Black Hills','Box Elder YMCA','Club for Boys — Rapid City'].map(p => (
            <div ref={addRef} key={p} className={`${styles.reveal} ${styles.partnerPill}`}>{p}</div>
          ))}
        </div>
      </section>

      <div className="divider" />

      <div className="divider" />

      {/* ── HCEA ACADEMY SECTION ── */}
      <section id="hcea" className={`${styles.section} ${styles.sectionHcea}`}>
        <div ref={addRef} className={styles.reveal}>
          <SectionHeader
            eyebrow="Powered by HCG · Built for Youth"
            title="High Caliber"
            titleAccent="Esports Academy"
          />
        </div>
        <div ref={addRef} className={`${styles.reveal} ${styles.hceaIntro}`}>
          <p>High Caliber Esports Academy (HCEA) is the youth-focused branch of High Caliber Gaming — a nonprofit-partnered esports development program serving students across South Dakota. HCEA operates within the HCG platform with dedicated tools for schools, youth organizations, and coaches building the next generation of players.</p>
        </div>
        <div className={styles.hceaGrid}>
          {[
            { icon:'🏫', title:'School & Org Partnerships', desc:'HCEA partners with Boys & Girls Clubs, YMCAs, and K–12 schools to bring structured esports programs to youth. Org managers get dedicated dashboards, player rosters, team management, and tournament access.', tag:'Nonprofit Ready' },
            { icon:'🏅', title:'HCEA Summer League', desc:'8-week summer esports league split into high school and college divisions. Free for HCEA members. Focus on free-to-play titles: Fortnite, Marvel Rivals, Rocket League, Valorant, and Smash Bros.', tag:'June – August' },
            { icon:'🎓', title:'Scholarship Programs', desc:'Two dedicated scholarship funds — the Terrance C. Walters Memorial Scholarship and the Higher Caliber Scholarship Fund — are available exclusively to HCEA members. Full details, requirements, and applications are inside the HCEA section of your HCG portal.', tag:'HCEA Members Only' },
            { icon:'🏕️', title:'Youth Summer Camp', desc:'One-week esports camp for ages 10–16 (brackets 10–13 and 14–16). Focuses on esports fundamentals combined with physical team-bonding activities that teach leadership, communication, and resilience.', tag:'Ages 10–16' },
            { icon:'📡', title:'Career & STEM Classes', desc:'Classes on tournament production, IT fundamentals, PC building, streaming, marketing, entrepreneurship in esports, strategy & analysis, and social-emotional learning through gaming.', tag:'Career Ready' },
            { icon:'🔒', title:'Age-Safe Platform', desc:'HCEA players under 16 have access to all competitive features — tournaments, leagues, coaching, and teams — while social feed access and cash matches are appropriately age-gated for their protection.', tag:'Safe for Youth' },
          ].map(card => (
            <div ref={addRef} key={card.title} className={`${styles.reveal} ${styles.hceaCard}`}>
              <div className={styles.hceaCardIcon}>{card.icon}</div>
              <div className={styles.hceaCardTitle}>{card.title}</div>
              <p className={styles.hceaCardDesc}>{card.desc}</p>
              <span className={styles.hceaCardTag}>{card.tag}</span>
            </div>
          ))}
        </div>
        <div className={styles.hceaPartners}>
          <div className={styles.hceaPartnersLabel}>Current HCEA Partners</div>
          <div className={styles.hceaPartnerList}>
            {['Fenworks','Minnesota Varsity League','Pierre Area Boys & Girls Club','Sioux Falls Boys & Girls Clubs','Watertown Boys & Girls Clubs','Boys & Girls Clubs of the Black Hills','Box Elder YMCA'].map(p => (
              <div key={p} className={styles.hceaPartnerBadge}>{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COACHING ── */}
      <section id="coaching" className={`${styles.section} ${styles.sectionDark}`}>
        <div ref={addRef} className={styles.reveal}>
          <SectionHeader eyebrow="1-on-1 Skill Development" title="Book a" titleAccent="Coaching Session" />
          <p className={styles.coachingIntro}>
            Work directly with HCG-verified coaches on your game. Pick your focus area, choose a time, and level up — all in a few clicks.
          </p>
        </div>

        {/* How it works — reveal wraps the grid, grid is on inner div */}
        <div ref={addRef} className={styles.reveal}>
          <div className={styles.coachingStepsWrap}>
            <div className={styles.coachingSteps}>
            {[
              { num:'01', icon:'🎮', title:'Choose Your Game', desc:'Select from League of Legends, Valorant, Rocket League, Fortnite, TFT, and more.' },
              { num:'02', icon:'🧑‍🏫', title:'Pick a Coach', desc:'Browse verified coaches, see ratings, experience, and specialties. Find your fit.' },
              { num:'03', icon:'📅', title:'Schedule a Session', desc:'Pick a date and time that works for you. Sessions from 1 to 2 hours.' },
              { num:'04', icon:'🚀', title:'Level Up', desc:'Get personalized coaching, VOD review, game plans, and persistent session notes.' },
            ].map(step => (
              <div key={step.num} className={styles.coachingStep}>
                <div className={styles.coachingStepNum}>{step.num}</div>
                <div className={styles.coachingStepIcon}>{step.icon}</div>
                <div className={styles.coachingStepTitle}>{step.title}</div>
                <div className={styles.coachingStepDesc}>{step.desc}</div>
              </div>
            ))}
            </div>{/* end coachingSteps */}
          </div>{/* end coachingStepsWrap */}
        </div>{/* end reveal */}

        {/* Rates + features + CTA */}
        <div ref={addRef} className={styles.reveal}>
          <div className={styles.coachingBottom}>

          {/* Rate table */}
          <div className={styles.coachingRates}>
            <div className={styles.coachingRatesTitle}>Session Rates</div>
            <div className={styles.rateTable}>
              <div className={styles.rateTableHead}>
                <span>Duration</span>
                <span>Standard</span>
                <span>Member</span>
              </div>
              {[
                { dur:'1 Hour',    std:'$60',  mem:'$51'  },
                { dur:'1.5 Hours', std:'$90',  mem:'$77'  },
                { dur:'2 Hours',   std:'$120', mem:'$102' },
              ].map(r => (
                <div key={r.dur} className={styles.rateTableRow}>
                  <span className={styles.rateTableDur}>{r.dur}</span>
                  <span className={styles.rateTableStd}>{r.std}</span>
                  <span className={styles.rateTableMem}>{r.mem} <span className={styles.rateMemTag}>15% off</span></span>
                </div>
              ))}
            </div>
            <div className={styles.rateNote}>
              💡 Members save 15% on every session. <a href="#membership" className={styles.rateNoteLink}>See membership →</a>
            </div>
          </div>

          {/* Session features */}
          <div className={styles.coachingFeatures}>
            {[
              { icon:'🎮', text:'VOD reviews & replay analysis' },
              { icon:'📋', text:'Custom game plans & homework' },
              { icon:'📅', text:'Google Calendar export' },
              { icon:'📝', text:'Persistent session notes' },
              { icon:'⭐', text:'Post-session ratings & reviews' },
              { icon:'🔒', text:'Verified coaches only' },
            ].map(f => (
              <div key={f.text} className={styles.coachingFeature}>
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className={styles.coachingCtaWrap}>
            <button className={`btn btn-primary ${styles.coachingCta}`} onClick={onJoinClick}>
              Book a Session →
            </button>
            <div className={styles.coachingCtaSub}>Create a free account or log in to book</div>
          </div>
        </div>{/* end coachingBottom */}
        </div>{/* end reveal */}
      </section>

      <div className="divider" />

      {/* ── CONTACT ── */}
      <section id="contact" className={styles.section}>
        <div ref={addRef} className={styles.reveal}>
          <SectionHeader eyebrow="Get In Touch" title="Let's" titleAccent="Connect" />
        </div>
        <div className={styles.contactWrap}>
          <div ref={addRef} className={styles.reveal}>
            <h3 className={styles.contactH3}>Ready to bring esports to your organization?</h3>
            <p className={styles.contactP}>Whether you're a school, nonprofit, parent, or student — High Caliber Gaming and the HCEA Academy are ready to partner with you.</p>
            <ContactLink icon="✉️" href="mailto:coachhylian@gmail.com">coachhylian@gmail.com</ContactLink>
            <ContactLink icon="🎮" href="https://www.start.gg/hub/high-caliber-academy">start.gg/hub/high-caliber-academy</ContactLink>
          </div>
          <form ref={addRef} className={`${styles.reveal} ${styles.cform}`} onSubmit={handleContactSubmit}>
            <div className={styles.formRow}>
              <div className="fg"><label>First Name</label><input placeholder="John" /></div>
              <div className="fg"><label>Last Name</label><input placeholder="Doe" /></div>
            </div>
            <div className="fg"><label>Email</label><input type="email" placeholder="you@example.com" /></div>
            <div className="fg">
              <label>I'm interested in...</label>
              <select>
                <option value="">Select an option</option>
                {['Membership / Summer League','Coaching Sessions','Program Consulting (K–12)','Program Consulting (Nonprofit)','Tournaments','Youth Camp','HCEA Scholarships','Other'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="fg"><label>Message</label><textarea placeholder="Tell us about your organization or goals..." /></div>
            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '0.8rem 2rem' }}>Send Message</button>
          </form>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div>
          <div className={styles.footerLogo}>High <em>Caliber</em> Gaming</div>
          <div className={styles.footerSub}>including HCEA — High Caliber Esports Academy</div>
          <p>© 2025 High Caliber Gaming · Rapid City, SD</p>
        </div>
        <nav className={styles.footerLinks}>
          {[['#programs','Programs'],['#membership','Membership'],['#scholarships','Scholarships'],['#contact','Contact']].map(([href,label]) => (
            <a key={label} href={href}>{label}</a>
          ))}
        </nav>
        <button className="btn btn-primary" onClick={onJoinClick}>Member Portal →</button>
      </footer>
    </div>
  );
}
