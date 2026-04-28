// #SECTION: DASHBOARD / HOME
// ═══════════════════════════════════════
// HOME — Activity Feed (Drop I.3)
// Stat cards, quick actions, social activity feed,
// notifications sheet, search sheet.
// ═══════════════════════════════════════

// Pokéball SVG for Collection card watermark
var POKEBALL_ICON='<svg viewBox="0 0 100 100" fill="currentColor"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="5"/><path d="M5 50A45 45 0 0 1 95 50" fill="currentColor"/><circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" stroke-width="5"/></svg>';

// Avatar colour palette — deterministic from user id / username
var _AV_COLS=['#ef4444','#3b82f6','#10b981','#f59e0b','#a78bfa','#fb923c','#fb7185','#14b8a6'];
function _avCol(s){var n=0;for(var i=0;i<(s||'').length;i++)n=(n*31+s.charCodeAt(i))&0xffff;return _AV_COLS[n%_AV_COLS.length];}
function _avLetter(s){return(s||'?')[0].toUpperCase();}

// Relative time helper: "2m", "1h", "3d", "2w"
function _relTime(ts){
  var d=Math.floor((Date.now()-new Date(ts).getTime())/1000);
  if(d<120)return 'now';
  if(d<3600)return Math.floor(d/60)+'m';
  if(d<86400)return Math.floor(d/3600)+'h';
  if(d<604800)return Math.floor(d/86400)+'d';
  return Math.floor(d/604800)+'w';
}

// HTML escape helper
function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Navigation helper (unchanged) ────────────────────────
function dashNav(page){
  // Close home sheets on any navigation — prevents z-index 320 sheets covering modal-ov
  var _no=document.getElementById('homeNotifOv');if(_no)_no.classList.remove('show');
  var _so=document.getElementById('homeSearchOv');if(_so)_so.classList.remove('show');
  document.querySelectorAll('.sb-item').forEach(function(n){n.classList.remove('active')});
  var tgt=document.querySelector('[data-p='+page+']');if(tgt)tgt.classList.add('active');
  if(['items','natures','profile'].indexOf(page)!==-1){
    var more=document.getElementById('sbMore');if(more)more.classList.add('active');
  }
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('show')});
  document.getElementById('pg-'+page).classList.add('show');
}

// ── Main render ───────────────────────────────────────────
function renderDash(){
  var c=document.getElementById('dashContent');
  if(!c)return;
  var obt=Object.keys(uDex).length,total=allPkmn.length||261;
  var friendCount=allFriends.filter(function(f){return f.status==='accepted';}).length;
  var shinyCount=Object.keys(uShinyDex).length;

  // Stat cards — Friends replaces Shiny Dex (4th card); shiny count tucked into Collection card
  var stats='<div class="da-stats">'+
    '<div class="da-stat da-collection"><div class="da-stat-label">Collection</div><div class="da-stat-val">'+obt+' <span class="da-stat-sub">/ '+total+'</span></div>'+(shinyCount?'<div class="da-stat-shiny-row"><span style="color:var(--purple)">✦</span> '+shinyCount+' shiny</div>':'')+'<div class="da-stat-glow">'+POKEBALL_ICON+'</div></div>'+
    '<div class="da-stat da-builds"><div class="da-stat-label">Active Builds</div><div class="da-stat-val">'+allBuilds.length+'</div><div class="da-stat-glow"><i class="ph-duotone ph-sword"></i></div></div>'+
    '<div class="da-stat da-teams"><div class="da-stat-label">Teams</div><div class="da-stat-val">'+allTeams.length+'</div><div class="da-stat-glow"><i class="ph-duotone ph-trophy"></i></div></div>'+
    '<div class="da-stat da-friends"><div class="da-stat-label">Friends</div><div class="da-stat-val">'+friendCount+'</div><div class="da-stat-glow"><i class="ph-duotone ph-users-three"></i></div></div>'+
  '</div>';

  // Update notification pip after allFriends is available
  _updateNotifPip();

  // Signed-out state
  if(!usr){
    c.innerHTML=stats+
      '<div class="da-signout-wrap">'+
        '<div class="da-signout-main">'+
          '<div class="card da-signout-card">'+
            '<div class="da-signout-icon">⚔️</div>'+
            '<h3 class="da-signout-title">Start your journey</h3>'+
            '<p class="da-signout-desc">Sign in or create an account to save your builds, teams, items, and Pokédex progress. Free to play.</p>'+
            '<div class="da-signout-btns">'+
              '<button class="btn btn-red" onclick="authMode=\'login\';showLoginModal()">Sign In</button>'+
              '<button class="btn btn-ghost" onclick="authMode=\'signup\';showLoginModal()">Create Account</button>'+
              '<button class="btn btn-dex" onclick="dashNav(\'dex\')"><i class="ph-bold ph-book-open-text"></i> Browse Pokédex →</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="da-signout-feats">'+
          '<div class="da-signout-feat">'+
            '<div class="da-signout-feat-icon" style="color:var(--red)"><i class="ph-bold ph-book-open-text"></i></div>'+
            '<div class="da-signout-feat-title">Pokédex</div>'+
            '<div class="da-signout-feat-desc">Track 261 Pokémon including Megas, Regionals and shiny variants</div>'+
          '</div>'+
          '<div class="da-signout-feat">'+
            '<div class="da-signout-feat-icon" style="color:var(--blue)"><i class="ph-bold ph-sword"></i></div>'+
            '<div class="da-signout-feat-title">Builds</div>'+
            '<div class="da-signout-feat-desc">Create competitive builds with full SP allocation and stat calculator</div>'+
          '</div>'+
          '<div class="da-signout-feat">'+
            '<div class="da-signout-feat-icon" style="color:var(--gold)"><i class="ph-bold ph-trophy"></i></div>'+
            '<div class="da-signout-feat-title">Teams</div>'+
            '<div class="da-signout-feat-desc">Assemble 6-Pokémon rosters and analyse your type coverage</div>'+
          '</div>'+
          '<div class="da-signout-feat">'+
            '<div class="da-signout-feat-icon" style="color:var(--purple)"><i class="ph-bold ph-users-three"></i></div>'+
            '<div class="da-signout-feat-title">Community</div>'+
            '<div class="da-signout-feat-desc">Share builds, follow friends and discover the meta</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="da-section"><div class="da-section-title">👀 Featured Builds</div></div>'+
      '<div class="da-fb-list" id="daFeaturedBuilds"><div class="empty" style="padding:.75rem 0"><div class="em" style="font-size:1.1rem">⏳</div></div></div>';
    _loadFeaturedBuilds();
    return;
  }

  // Quick actions — compact single row (replaces 2×2 grid)
  var quick=
    '<div class="da-section"><div class="da-section-title">🚀 Quick Actions</div></div>'+
    '<div class="da-quick-row">'+
      '<button class="da-qrow-btn" onclick="showBuildEditor();dashNav(\'builds\')"><div class="da-qrow-icon">⚔️</div><div class="da-qrow-lbl">New Build</div></button>'+
      '<button class="da-qrow-btn" onclick="showTeamEditor();dashNav(\'teams\')"><div class="da-qrow-icon">🏆</div><div class="da-qrow-lbl">New Team</div></button>'+
      '<button class="da-qrow-btn" onclick="dashNav(\'dex\')"><div class="da-qrow-icon">📖</div><div class="da-qrow-lbl">Browse Dex</div></button>'+
      '<button class="da-qrow-btn" onclick="dashNav(\'profile\')"><div class="da-qrow-icon">👤</div><div class="da-qrow-lbl">Profile</div></button>'+
    '</div>';

  // Activity feed shell — populated async after render
  var feed=
    '<div class="da-section"><div class="da-section-title">⚡ Activity</div></div>'+
    '<div id="daFeedBody" style="padding:0 1rem .5rem">'+
      '<div class="empty" style="padding:1.5rem 0"><div class="em">⏳</div>Loading…</div>'+
    '</div>';

  c.innerHTML=stats+'<div class="da-body"><div class="da-col-side">'+quick+'</div><div class="da-col-main">'+feed+'</div></div>';

  // Kick off async feed load (non-blocking)
  _loadActivityFeed();
}

// ── Activity feed ─────────────────────────────────────────
async function _loadActivityFeed(){
  var body=document.getElementById('daFeedBody');
  if(!body||!usr)return;

  var accepted=allFriends.filter(function(f){return f.status==='accepted';});
  var friendIds=accepted.map(function(f){return f.friend_id;});

  if(!friendIds.length){
    // No friends yet — show own recent activity + Discover section
    var ownEvs=[];
    allBuilds.slice(0,5).forEach(function(b){
      ownEvs.push({type:'build',ts:b.created_at,data:b,who:'You',whoKey:'you',whoId:usr.id});
    });
    allTeams.slice(0,3).forEach(function(t){
      ownEvs.push({type:'team',ts:t.created_at,data:t,who:'You',whoKey:'you',whoId:usr.id});
    });
    ownEvs.sort(function(a,b){return new Date(b.ts)-new Date(a.ts);});

    var ownHtml=ownEvs.length?
      '<div class="da-feed-section">Your Activity</div>'+ownEvs.map(function(ev){return _renderFeedRow(ev);}).join(''):
      '<div class="da-feed-section">Your Activity</div>'+
        '<div style="font-size:.78rem;color:var(--muted);padding:.4rem .1rem .8rem">No builds or teams yet — create your first!</div>';

    body.innerHTML=ownHtml+
      '<div class="da-feed-section" style="margin-top:.3rem">🔍 Discover</div>'+
      '<div id="daDiscoverBody"><div class="empty" style="padding:.8rem 0"><div class="em">⏳</div></div></div>';
    _loadDiscover();
    return;
  }

  var fInStr='('+friendIds.join(',')+')';
  var myBuildIds=allBuilds.map(function(b){return b.id;});
  var myTeamIds=allTeams.map(function(t){return t.id;});

  // Parallel fetches against existing tables
  var res=await Promise.allSettled([
    // 1 — Friends' public builds
    authFetch(API+'/rest/v1/builds?user_id=in.'+fInStr+'&is_public=eq.true'+
      '&select=id,pokemon_name,build_name,battle_format,image_url,shiny_url,is_shiny,created_at,share_code,user_id'+
      '&order=created_at.desc&limit=8',{headers:h(false)}).then(function(r){return r.json();}),
    // 2 — Friends' public teams
    authFetch(API+'/rest/v1/teams?user_id=in.'+fInStr+'&is_public=eq.true'+
      '&select=id,name,created_at,share_code,user_id'+
      '&order=created_at.desc&limit=8',{headers:h(false)}).then(function(r){return r.json();}),
    // 3 — Likes on my builds
    myBuildIds.length?
      authFetch(API+'/rest/v1/build_likes?build_id=in.('+myBuildIds.join(',')+')'+'&select=id,created_at,build_id,user_id,user_profiles(username,display_name)&order=created_at.desc&limit=10',{headers:h(true)}).then(function(r){return r.json();}):
      Promise.resolve([]),
    // 4 — Likes on my teams
    myTeamIds.length?
      authFetch(API+'/rest/v1/team_likes?team_id=in.('+myTeamIds.join(',')+')'+'&select=id,created_at,team_id,user_id,user_profiles(username,display_name)&order=created_at.desc&limit=10',{headers:h(true)}).then(function(r){return r.json();}):
      Promise.resolve([]),
    // 5 — My recent achievements
    authFetch(API+'/rest/v1/user_achievements?user_id=eq.'+usr.id+'&select=achievement_id,unlocked_at&order=unlocked_at.desc&limit=8',{headers:h(true)}).then(function(r){return r.json();}),
    // 6 — Friends' achievements
    authFetch(API+'/rest/v1/user_achievements?user_id=in.'+fInStr+'&select=user_id,achievement_id,unlocked_at&order=unlocked_at.desc&limit=8',{headers:h(true)}).then(function(r){return r.json();})
  ]);

  var _ok=function(r){return r.status==='fulfilled'&&Array.isArray(r.value)&&!r.value.error;};
  var fBuilds=_ok(res[0])?res[0].value:[];
  var fTeams=_ok(res[1])?res[1].value:[];
  var likesB=_ok(res[2])?res[2].value:[];
  var likesT=_ok(res[3])?res[3].value:[];
  var myAchs=_ok(res[4])?res[4].value:[];
  var fAchs=_ok(res[5])?res[5].value:[];

  // userId → friend object lookup
  var fMap={};
  accepted.forEach(function(f){fMap[f.friend_id]=f;});

  var events=[];

  fBuilds.forEach(function(b){
    var f=fMap[b.user_id]||{};
    events.push({type:'build',ts:b.created_at,data:b,
      who:f.display_name||f.username||'Trainer',whoKey:f.username||f.display_name||'?',whoId:b.user_id});
  });
  fTeams.forEach(function(t){
    var f=fMap[t.user_id]||{};
    events.push({type:'team',ts:t.created_at,data:t,
      who:f.display_name||f.username||'Trainer',whoKey:f.username||f.display_name||'?',whoId:t.user_id});
  });
  likesB.forEach(function(l){
    if(l.user_id===usr.id)return;
    var p=l.user_profiles||{};
    var b=allBuilds.find(function(x){return x.id===l.build_id;})||{};
    events.push({type:'liked_build',ts:l.created_at,data:{build:b},
      who:p.display_name||p.username||'Someone',whoKey:p.username||p.display_name||'?',whoId:l.user_id});
  });
  likesT.forEach(function(l){
    if(l.user_id===usr.id)return;
    var p=l.user_profiles||{};
    var t=allTeams.find(function(x){return x.id===l.team_id;})||{};
    events.push({type:'liked_team',ts:l.created_at,data:{team:t},
      who:p.display_name||p.username||'Someone',whoKey:p.username||p.display_name||'?',whoId:l.user_id});
  });
  myAchs.forEach(function(ua){
    var a=(allAch||[]).find(function(x){return x.id===ua.achievement_id;});
    if(a)events.push({type:'my_ach',ts:ua.unlocked_at,data:{ach:a},who:'You',whoKey:'you',whoId:usr.id});
  });
  fAchs.forEach(function(ua){
    var a=(allAch||[]).find(function(x){return x.id===ua.achievement_id;});
    if(!a)return;
    var f=fMap[ua.user_id]||{};
    events.push({type:'friend_ach',ts:ua.unlocked_at,data:{ach:a},
      who:f.display_name||f.username||'Trainer',whoKey:f.username||f.display_name||'?',whoId:ua.user_id});
  });
  // New accepted friends (last 5, sorted by created_at)
  accepted.slice().sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);}).slice(0,5).forEach(function(f){
    events.push({type:'new_friend',ts:f.created_at,data:{friend:f},
      who:f.display_name||f.username||'Trainer',whoKey:f.username||f.display_name||'',whoId:f.friend_id});
  });

  events.sort(function(a,b){return new Date(b.ts)-new Date(a.ts);});
  events=events.slice(0,30);

  body=document.getElementById('daFeedBody');
  if(!body)return;

  if(!events.length){
    body.innerHTML='<div class="empty" style="padding:1.5rem 0;text-align:center">'+
      '<div class="em">😴</div><div style="font-size:.8rem;color:var(--muted)">No activity yet — share some builds!</div></div>'+
      '<div class="da-feed-section" style="margin-top:.3rem">🔍 Discover</div>'+
      '<div id="daDiscoverBody"><div class="empty" style="padding:.8rem 0"><div class="em">⏳</div></div></div>';
    _loadDiscover();
    return;
  }
  body.innerHTML=
    events.map(function(ev){return _renderFeedRow(ev);}).join('')+
    '<div class="da-feed-section" style="margin-top:.3rem">🔍 Discover</div>'+
    '<div id="daDiscoverBody"><div class="empty" style="padding:.8rem 0"><div class="em">⏳</div></div></div>';
  _loadDiscover();
}

// ── Discover section ──────────────────────────────────────
async function _loadDiscover(){
  var body=document.getElementById('daDiscoverBody');
  if(!body||!usr)return;

  var res=await Promise.allSettled([
    // Public builds — exclude own, newest first (proxy for popular until we have a likes_count column)
    authFetch(API+'/rest/v1/builds?is_public=eq.true&user_id=neq.'+usr.id+
      '&select=id,pokemon_name,build_name,image_url,shiny_url,is_shiny,created_at,user_profiles(display_name,username)'+
      '&order=created_at.desc&limit=5',{headers:h(false)}).then(function(r){return r.json();}),
    // Public teams — exclude own
    authFetch(API+'/rest/v1/teams?is_public=eq.true&user_id=neq.'+usr.id+
      '&select=id,name,created_at,user_profiles(display_name,username)'+
      '&order=created_at.desc&limit=3',{headers:h(false)}).then(function(r){return r.json();})
  ]);

  var dBuilds=res[0].status==='fulfilled'&&Array.isArray(res[0].value)?res[0].value:[];
  var dTeams=res[1].status==='fulfilled'&&Array.isArray(res[1].value)?res[1].value:[];

  var discEvs=[];
  dBuilds.forEach(function(b){
    var p=b.user_profiles||{};
    discEvs.push({type:'build',ts:b.created_at,data:b,
      who:p.display_name||p.username||'Trainer',whoKey:p.username||p.display_name||'?',whoId:''});
  });
  dTeams.forEach(function(t){
    var p=t.user_profiles||{};
    discEvs.push({type:'team',ts:t.created_at,data:t,
      who:p.display_name||p.username||'Trainer',whoKey:p.username||p.display_name||'?',whoId:''});
  });
  discEvs.sort(function(a,b){return new Date(b.ts)-new Date(a.ts);});

  body=document.getElementById('daDiscoverBody');
  if(!body)return;

  if(!discEvs.length){
    body.innerHTML='<div style="font-size:.75rem;color:var(--muted);padding:.3rem .1rem .8rem">Nothing public yet — be the first to share!</div>';
    return;
  }
  body.innerHTML=discEvs.map(function(ev){return _renderFeedRow(ev);}).join('');
}

// ── Feed row renderer ────────────────────────────────────
function _renderFeedRow(ev){
  var ts=_relTime(ev.ts);
  var col=_avCol(ev.whoId||ev.whoKey||'');
  var ltr=_avLetter(ev.who||'?');

  function _av(emoji,bg){return '<div class="da-feed-av" style="background:'+bg+'">'+emoji+'</div>';}
  function _imgAv(src){return '<img class="da-feed-img" src="'+_esc(src)+'" onerror="this.style.opacity=\'0.2\'">';}
  function _row(av,name,sub,ts2,extra,onclick){
    var tap=onclick?'class="da-feed-row tappable" onclick="'+onclick+'"':'class="da-feed-row"';
    return '<div '+tap+'>'+av+
      '<div class="da-feed-text">'+
        '<div class="da-feed-name">'+name+'</div>'+
        '<div class="da-feed-sub">'+sub+'</div>'+
      '</div>'+
      '<div class="da-feed-right"><div class="da-feed-ts">'+ts2+'</div></div>'+
      (extra||'')+
    '</div>';
  }

  if(ev.type==='build'){
    var b=ev.data;
    var img=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');
    var av=img?_imgAv(img):_av(ltr,col);
    var name=_esc(b.pokemon_name||'?')+(b.is_shiny?' <span style="color:var(--purple)">✦</span>':'');
    var sub='<span style="color:var(--muted)">@'+_esc(ev.whoKey)+'</span> shared · '+_esc(b.build_name||'');
    return _row(av,name,sub,ts,'<span class="da-feed-chevron">›</span>','_openFeedBuild(\''+b.id+'\')');
  }
  if(ev.type==='team'){
    var t=ev.data;
    var av2=_av(ltr,col);
    return _row(av2,_esc(t.name||'Team'),'<span style="color:var(--muted)">@'+_esc(ev.whoKey)+'</span> shared a team',ts,'<span class="da-feed-chevron">›</span>','_openFeedTeam(\''+t.id+'\')');
  }
  if(ev.type==='liked_build'){
    var b2=ev.data.build||{};
    return _row(_av('♥','#fb7185'),'@'+_esc(ev.whoKey)+' liked your build','"'+_esc(b2.build_name||b2.pokemon_name||'Build')+'"',ts,'');
  }
  if(ev.type==='liked_team'){
    var t2=ev.data.team||{};
    return _row(_av('♥','#fb7185'),'@'+_esc(ev.whoKey)+' liked your team','"'+_esc(t2.name||'Team')+'"',ts,'');
  }
  if(ev.type==='my_ach'){
    var a=ev.data.ach;
    return _row(_av('🏆','var(--gold)'),(a.icon||'🌟')+' '+_esc(a.name||'Achievement'),'You earned an achievement',ts,'');
  }
  if(ev.type==='friend_ach'){
    var a2=ev.data.ach;
    return _row(_av(ltr,'var(--purple)'),(a2.icon||'🏅')+' '+_esc(a2.name||'Achievement'),'@'+_esc(ev.whoKey)+' earned an achievement',ts,'');
  }
  if(ev.type==='new_friend'){
    var f=ev.data.friend;
    return _row(_av('🤝','var(--green)'),'New friend!',
      'You and <span style="color:var(--green)">@'+_esc(f.username||f.display_name||'Trainer')+'</span> are now friends',ts,'');
  }
  return '';
}

// Tap handlers — open existing detail views
function _openFeedBuild(id){
  if(allBuilds.find(function(x){return x.id===id;})){showBuildDetail(id,'home');dashNav('builds');}
  else if(typeof showPublicBuildById==='function')showPublicBuildById(id);
}
function _openFeedTeam(id){
  if(allTeams.find(function(x){return x.id===id;})){showTeamDetail(id,'home');dashNav('teams');}
  else if(typeof showPublicTeamById==='function')showPublicTeamById(id);
}

// ── Notification pip ──────────────────────────────────────
function _updateNotifPip(){
  var pip=document.getElementById('daNotifPip');
  if(!pip)return;
  var has=allFriends.some(function(f){return f.status==='pending'&&!f.i_am_requester;});
  pip.classList.toggle('show',has);
}

// ── Notifications sheet ───────────────────────────────────
function openNotifSheet(){
  var ov=document.getElementById('homeNotifOv');
  if(!ov)return;
  ov.classList.add('show');
  _renderNotifSheet();
}
function closeNotifSheet(){
  var ov=document.getElementById('homeNotifOv');
  if(ov)ov.classList.remove('show');
}
function _renderNotifSheet(){
  var body=document.getElementById('homeNotifBody');
  if(!body)return;
  if(!usr){body.innerHTML='<div class="empty" style="padding:1.5rem 0">Sign in to see notifications</div>';return;}

  var rows=[];
  // Pending friend requests (actionable)
  allFriends.filter(function(f){return f.status==='pending'&&!f.i_am_requester;}).forEach(function(f){
    rows.push({icon:'🤝',bg:'var(--green)',name:(f.display_name||f.username||'Someone')+' sent you a friend request',sub:'Go to Profile → Friends to accept',ts:f.created_at,unread:true});
  });

  if(!rows.length){
    body.innerHTML='<div class="empty" style="padding:1.5rem 0;text-align:center">'+
      '<div class="em">🔔</div>'+
      '<div style="font-size:.8rem;color:var(--muted)">No pending notifications — likes and activity show up in the feed below.</div>'+
    '</div>';
    return;
  }
  body.innerHTML=rows.map(function(r){
    return '<div class="home-notif-row">'+
      (r.unread?'<div class="home-notif-unread"></div>':'')+
      '<div class="home-notif-av" style="background:'+r.bg+'">'+r.icon+'</div>'+
      '<div class="home-notif-text">'+
        '<div class="home-notif-name">'+_esc(r.name)+'</div>'+
        '<div class="home-notif-sub">'+_esc(r.sub)+'</div>'+
      '</div>'+
      '<div class="home-notif-ts">'+_relTime(r.ts)+'</div>'+
    '</div>';
  }).join('');
}

// ── Search sheet ──────────────────────────────────────────
var _searchTab='all',_searchTimer=null;

function openSearchSheet(){
  var ov=document.getElementById('homeSearchOv');
  if(!ov)return;
  ov.classList.add('show');
  setTimeout(function(){var inp=document.getElementById('homeSearchInput');if(inp)inp.focus();},200);
}
function closeSearchSheet(){
  var ov=document.getElementById('homeSearchOv');
  if(ov)ov.classList.remove('show');
}
function _homeSearchTab(btn,tab){
  _searchTab=tab;
  document.querySelectorAll('.home-stab').forEach(function(b){b.classList.remove('active');});
  if(btn)btn.classList.add('active');
  var q=(document.getElementById('homeSearchInput')||{}).value||'';
  if(q.trim())_doHomeSearch(q.trim());
}
function _onHomeSearch(q){
  clearTimeout(_searchTimer);
  if(!q.trim()){
    var body=document.getElementById('homeSearchBody');
    if(body)body.innerHTML='<div class="empty" style="padding:2rem 0;text-align:center"><div class="em" style="font-size:1.5rem">🔍</div><div style="font-size:.78rem;color:var(--muted)">Type to search…</div></div>';
    return;
  }
  _searchTimer=setTimeout(function(){_doHomeSearch(q.trim());},350);
}
async function _doHomeSearch(q){
  var body=document.getElementById('homeSearchBody');
  if(!body)return;
  body.innerHTML='<div class="empty" style="padding:1.5rem 0"><div class="em">⏳</div>Searching…</div>';
  var enc=encodeURIComponent(q),tab=_searchTab;

  var fetches=[];
  if(tab==='all'||tab==='builds')
    fetches.push({key:'builds',p:authFetch(API+'/rest/v1/builds?is_public=eq.true&or=(pokemon_name.ilike.*'+enc+'*,build_name.ilike.*'+enc+'*)&select=id,pokemon_name,build_name,image_url,shiny_url,is_shiny&order=created_at.desc&limit=8',{headers:h(false)}).then(function(r){return r.json();})});
  if(tab==='all'||tab==='teams')
    fetches.push({key:'teams',p:authFetch(API+'/rest/v1/teams?is_public=eq.true&name=ilike.*'+enc+'*&select=id,name&order=created_at.desc&limit=8',{headers:h(false)}).then(function(r){return r.json();})});
  if(tab==='all'||tab==='trainers')
    fetches.push({key:'trainers',p:authFetch(API+'/rest/v1/user_profiles?or=(username.ilike.*'+enc+'*,display_name.ilike.*'+enc+'*)&select=user_id,username,display_name&limit=8',{headers:h(false)}).then(function(r){return r.json();})});

  var settled=await Promise.allSettled(fetches.map(function(f){return f.p;}));
  var results={};
  fetches.forEach(function(f,i){results[f.key]=(settled[i].status==='fulfilled'&&Array.isArray(settled[i].value))?settled[i].value:[];});

  body=document.getElementById('homeSearchBody');
  if(!body)return;

  var html='<div style="padding:0 1rem .5rem">';
  (results.builds||[]).forEach(function(b){
    var img=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');
    html+='<div class="da-feed-row tappable" onclick="closeSearchSheet();_openFeedBuild(\''+b.id+'\')">'+
      (img?'<img class="da-feed-img" src="'+_esc(img)+'" onerror="this.style.opacity=\'0.2\'">':'<div class="da-feed-av" style="background:var(--red)">⚔</div>')+
      '<div class="da-feed-text"><div class="da-feed-name">'+_esc(b.pokemon_name||'?')+(b.is_shiny?' <span style="color:var(--purple)">✦</span>':'')+'</div>'+
      '<div class="da-feed-sub">Build · '+_esc(b.build_name||'')+'</div></div>'+
      '<div class="da-feed-right"><div class="da-feed-ts" style="color:var(--blue);font-weight:800">Build</div></div></div>';
  });
  (results.teams||[]).forEach(function(t){
    html+='<div class="da-feed-row tappable" onclick="closeSearchSheet();_openFeedTeam(\''+t.id+'\')">'+
      '<div class="da-feed-av" style="background:var(--blue)">👥</div>'+
      '<div class="da-feed-text"><div class="da-feed-name">'+_esc(t.name||'Team')+'</div>'+
      '<div class="da-feed-sub">Team</div></div>'+
      '<div class="da-feed-right"><div class="da-feed-ts" style="color:var(--blue);font-weight:800">Team</div></div></div>';
  });
  (results.trainers||[]).forEach(function(p){
    var col=_avCol(p.user_id||'');
    html+='<div class="da-feed-row">'+
      '<div class="da-feed-av" style="background:'+col+'">'+_avLetter(p.display_name||p.username||'?')+'</div>'+
      '<div class="da-feed-text"><div class="da-feed-name">'+_esc(p.display_name||'Trainer')+'</div>'+
      '<div class="da-feed-sub">'+(p.username?'@'+_esc(p.username):'')+'</div></div>'+
      '<div class="da-feed-right"><div class="da-feed-ts" style="color:var(--purple);font-weight:800">Trainer</div></div></div>';
  });
  html+='</div>';

  if(html==='<div style="padding:0 1rem .5rem"></div>')
    html='<div class="empty" style="padding:1.5rem 0;text-align:center"><div class="em">😶</div><div style="font-size:.78rem;color:var(--muted)">No results for "'+_esc(q)+'"</div></div>';
  body.innerHTML=html;
}

// ── Featured Builds (signed-out home) ─────────────────────
async function _loadFeaturedBuilds(){
  var el=document.getElementById('daFeaturedBuilds');
  if(!el)return;
  try{
    var rows=await fetch(API+'/rest/v1/builds?is_public=eq.true&select=id,name,pokemon_name,type_1,type_2,image_url,is_shiny,shiny_url,battle_format,move_1,move_2,share_code&order=created_at.desc&limit=4',
      {headers:{'apikey':ANON,'Content-Type':'application/json'}}).then(function(r){return r.json()}).catch(function(){return[]});
    if(!rows||!rows.length){el.innerHTML='<div class="empty" style="padding:.75rem 0;font-size:.78rem;color:var(--muted)">No public builds yet — be the first!</div>';return}
    el.innerHTML=rows.map(function(b){
      var t1=TC[b.type_1]||TC.Normal;var t2=b.type_2?TC[b.type_2]:null;
      var img=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');
      var grad=t2?'linear-gradient(135deg,'+t1.m+'66,'+t2.m+'66)':'linear-gradient(135deg,'+t1.m+'55,'+t1.d+'66)';
      var moves=[b.move_1,b.move_2].filter(Boolean).map(function(m){return'<span class="da-fb-move">'+m+'</span>'}).join('');
      var click=b.share_code?'onclick="location.hash=\'#/b/'+b.share_code+'\'"':'';
      return'<div class="da-fb-card" '+click+' style="background:'+grad+'">'+
        (img?'<img class="da-fb-sprite" src="'+img+'" onerror="this.style.opacity=\'0.15\'" loading="lazy">':'<div style="width:52px;flex-shrink:0"></div>')+
        '<div class="da-fb-info">'+
          '<div class="da-fb-name">'+b.name+'</div>'+
          '<div class="da-fb-pkmn">'+b.pokemon_name+(b.battle_format?' · '+b.battle_format:'')+'</div>'+
          '<div class="da-fb-moves">'+moves+'</div>'+
        '</div>'+
      '</div>';
    }).join('');
  }catch(e){el.innerHTML='';}
}

// ── Onboarding Guide (Drop I.5) ───────────────────────────
var _obStep=0;
var _obSteps=[
  {icon:'⚔️',title:'Welcome to Champions Forge',type:'hl',
   desc:'The team builder made specifically for Pokémon Champions — build optimised sets, assemble rosters and share with the community.',
   hl:[
    {icon:'🎮',bg:'var(--red-bg)',col:'var(--red)',strong:'Built for Champions rules',span:'Level 50, maxed IVs, SP-based stat system'},
    {icon:'✓',bg:'var(--green-bg)',col:'var(--green)',strong:'Free, no ads, no grind',span:'Everything is available from the start'}
   ]},
  {icon:'📊',title:'What are SP Points?',type:'hl',
   desc:'SP is Champions\' equivalent of EVs — simpler maths, same strategy.',
   hl:[
    {icon:'=',bg:'var(--purple-bg)',col:'var(--purple)',strong:'1 SP = +1 to that stat',span:'No ÷4 conversion — what you see is what you get'},
    {icon:'📈',bg:'var(--gold-bg)',col:'var(--gold)',strong:'66 SP total, max 32 per stat',span:'Like 508 EVs / 252 cap but cleaner'},
    {icon:'⚡',bg:'var(--red-bg)',col:'var(--red)',strong:'Level 50, IVs always maxed',span:'No breeding, no grinding — just strategy'}
   ]},
  {icon:'🗺️',title:'What can you do?',type:'feats',
   desc:'Everything you need to compete, all in one place.',
   feats:[
    {icon:'⚔️',bg:'var(--red-bg)',col:'var(--red)',strong:'Build competitive sets',span:'SP allocator, stat calc, move picker, ability + item'},
    {icon:'🏆',bg:'var(--blue-bg)',col:'var(--blue)',strong:'Assemble your team',span:'6-Pokémon roster with type coverage analysis'},
    {icon:'👥',bg:'var(--purple-bg)',col:'var(--purple)',strong:'Share &amp; discover',span:'Public builds, friend system, community feed'},
    {icon:'📖',bg:'var(--green-bg)',col:'var(--green)',strong:'Track your Pokédex',span:'261 Pokémon including Megas, Regionals &amp; Shinies'}
   ]},
  {icon:'🚀',title:'Ready to build?',type:'cta',
   desc:'Create your first competitive build — pick a Pokémon, allocate your SP, choose your moves and share it with the community.'}
];
function showOnboarding(){
  _obStep=0;
  var mod=document.getElementById('onboardingMod');if(!mod)return;
  mod.classList.add('open');_renderObStep();
}
function _renderObStep(){
  var s=_obSteps[_obStep];var total=_obSteps.length;
  var dots='';for(var i=0;i<total;i++)dots+='<div class="ob-dot'+(i===_obStep?' active':'')+'"></div>';
  document.getElementById('obDots').innerHTML=dots;
  var body='<span class="ob-icon">'+s.icon+'</span><div class="ob-title">'+s.title+'</div><div class="ob-desc">'+s.desc+'</div>';
  if(s.type==='hl'){
    body+='<div class="ob-hl">'+s.hl.map(function(r){
      return'<div class="ob-hl-row"><div class="ob-hl-icon" style="background:'+r.bg+';color:'+r.col+'">'+r.icon+'</div><div class="ob-hl-text"><strong>'+r.strong+'</strong><span>'+r.span+'</span></div></div>';
    }).join('')+'</div>';
  }else if(s.type==='feats'){
    body+='<div class="ob-feats">'+s.feats.map(function(f){
      return'<div class="ob-feat"><div class="ob-feat-icon" style="background:'+f.bg+';color:'+f.col+'">'+f.icon+'</div><div class="ob-feat-txt"><strong>'+f.strong+'</strong><span>'+f.span+'</span></div></div>';
    }).join('')+'</div>';
  }
  document.getElementById('obBody').innerHTML=body;
  var btn=document.getElementById('obNextBtn');var skip=document.getElementById('obSkipBtn');
  if(_obStep===total-1){
    btn.innerHTML='⚔️ Create my first build';btn.classList.add('ob-finish');skip.textContent='Maybe later';
  }else{
    btn.innerHTML='Next <i class="ph-bold ph-arrow-right"></i>';btn.classList.remove('ob-finish');skip.textContent='Skip guide';
  }
}
function obNext(){if(_obStep<_obSteps.length-1){_obStep++;_renderObStep();}else{obFinish();}}
function obSkip(){localStorage.setItem('cf_onboarded','1');document.getElementById('onboardingMod').classList.remove('open');}
function obFinish(){
  localStorage.setItem('cf_onboarded','1');
  document.getElementById('onboardingMod').classList.remove('open');
  if(typeof dashNav==='function')dashNav('builds');
  if(typeof showBuildEditor==='function')showBuildEditor();
}
