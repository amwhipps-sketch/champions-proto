// #SECTION: APP CONFIG & GLOBAL STATE
// ═══════════════════════════════════════
// APP CONFIG & GLOBAL STATE
// Supabase config, auth state, global app data,
// filters, and shared runtime variables.
// ═══════════════════════════════════════

var API='https://hrxqhhjkhhlpafhfarbl.supabase.co',ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeHFoaGpraGhscGFmaGZhcmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDAzNjYsImV4cCI6MjA5MTY3NjM2Nn0.AALRUAOd3WVj1vmu42RvDV-RGHCpa8ymplkXsx_NSW0';
var tk=null,refreshTk=null,sessionExp=0,usr=null,allPkmn=[],allBuilds=[],allTeams=[],uDex={},uShinyDex={},activeType=null,activeForm=null,showShiny=false,obtFilter='all',shinyCards={},authMode='login';
// Drop E: Move index (name → meta) and per-species learnset cache
var allMoveIndex={},learnsetCache={};

// #SECTION: POKÉMON TYPE CONSTANTS & MATCHUP DATA
// ═══════════════════════════════════════
// POKÉMON TYPE CONSTANTS & MATCHUP DATA
// Type colours, type list, and effectiveness chart.
// Used for badges, gradients, matchups, and coverage.
// ═══════════════════════════════════════

var TC={Normal:{m:'#A8A77A',l:'#D3D3B8',d:'#6D6D4E'},Fire:{m:'#EE8130',l:'#F5AC78',d:'#9C531F'},Water:{m:'#6390F0',l:'#9DB7F5',d:'#445E9C'},Electric:{m:'#F7D02C',l:'#FAE078',d:'#A1871F'},Grass:{m:'#7AC74C',l:'#A7DB8D',d:'#4E8234'},Ice:{m:'#96D9D6',l:'#BCE6E6',d:'#638D8D'},Fighting:{m:'#C22E28',l:'#D67873',d:'#7D1F1A'},Poison:{m:'#A33EA1',l:'#C183C1',d:'#6B2A6B'},Ground:{m:'#E2BF65',l:'#EBD69D',d:'#927D44'},Flying:{m:'#A98FF3',l:'#C6B7F5',d:'#6D5E9C'},Psychic:{m:'#F95587',l:'#FA92B2',d:'#A13959'},Bug:{m:'#A6B91A',l:'#C6D16E',d:'#6D7815'},Rock:{m:'#B6A136',l:'#D1C17D',d:'#786824'},Ghost:{m:'#735797',l:'#A292BC',d:'#4C3A65'},Dragon:{m:'#6F35FC',l:'#A27DFA',d:'#4924A1'},Dark:{m:'#705746',l:'#A29288',d:'#49392F'},Steel:{m:'#B7B7CE',l:'#D1D1E0',d:'#787887'},Fairy:{m:'#D685AD',l:'#F4BDC9',d:'#9B6470'}};
var ALL_T=Object.keys(TC);
var TCHART={Normal:{Rock:.5,Ghost:0,Steel:.5},Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},Dragon:{Dragon:2,Steel:.5,Fairy:0},Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}};

// #SECTION: SHARED HELPERS
// ═══════════════════════════════════════
// SHARED HELPERS
// Reusable utility functions for icons, toasts,
// DOM helpers, API requests, inserts, deletes, etc.
// ═══════════════════════════════════════

function pb(s){return'<svg width="'+s+'" height="'+s+'" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#EF4444"/><path d="M5 50A45 45 0 0 0 95 50Z" fill="white"/><circle cx="50" cy="50" r="45" fill="none" stroke="#1E293B" stroke-width="4"/><line x1="5" y1="50" x2="95" y2="50" stroke="#1E293B" stroke-width="4"/><circle cx="50" cy="50" r="12" fill="white" stroke="#1E293B" stroke-width="4"/><circle cx="50" cy="50" r="5" fill="#1E293B"/></svg>'}
function toast(m,t){
  var host=document.getElementById('toasts');
  if(!host)return;
  var kind=t||'ok';
  var iconClass=kind==='err'?'ph-warning-circle':kind==='info'?'ph-info':'ph-check-circle';
  var card=document.createElement('div');
  card.className='toast toast-'+kind;
  card.setAttribute('role','status');
  card.setAttribute('aria-live','polite');
  var iconEl=document.createElement('i');
  iconEl.className='ph-fill '+iconClass+' toast-icon';
  var msgEl=document.createElement('span');
  msgEl.className='toast-msg';
  msgEl.textContent=m;
  var closeBtn=document.createElement('button');
  closeBtn.type='button';
  closeBtn.className='toast-close';
  closeBtn.setAttribute('aria-label','Dismiss');
  closeBtn.textContent='✕';
  var removed=false;
  function dismiss(){
    if(removed)return;removed=true;
    card.classList.add('toast-out');
    setTimeout(function(){if(card.parentNode)card.parentNode.removeChild(card)},200);
  }
  closeBtn.onclick=dismiss;
  card.appendChild(iconEl);
  card.appendChild(msgEl);
  card.appendChild(closeBtn);
  host.appendChild(card);
  while(host.children.length>4){host.removeChild(host.children[0]);}
  var timer=setTimeout(dismiss,4200);
  card.onmouseenter=function(){clearTimeout(timer)};
  card.onmouseleave=function(){timer=setTimeout(dismiss,2200)};
}
function h(a){return{'apikey':ANON,'Content-Type':'application/json','Authorization':'Bearer '+(a&&tk?tk:ANON)}}

// #SECTION: DEV SESSION PERSISTENCE
// ═══════════════════════════════════════
// DEV ONLY: Persist the signed-in session in localStorage so the app
// stays logged in across refreshes during development.
// This is convenient for local testing, but it is not a production-
// grade auth/session approach.
// ═══════════════════════════════════════

function saveSession(){
  try{
    if(tk&&refreshTk&&usr){localStorage.setItem('champions_session',JSON.stringify({tk:tk,refreshTk:refreshTk,sessionExp:sessionExp,usr:usr}))}
    else{localStorage.removeItem('champions_session')}
  }catch(e){}
}

// DEV ONLY: Restore the locally saved development session on page load.
// This should be revisited later if the app moves to a more secure
// production auth flow.


function restoreSession(){
  try{
    var raw=localStorage.getItem('champions_session');
    if(!raw)return false;
    var s=JSON.parse(raw);
    if(!s||!s.tk||!s.refreshTk||!s.usr)return false;
    tk=s.tk;
    refreshTk=s.refreshTk;
    sessionExp=s.sessionExp||0;
    usr=s.usr;
    return true;
  }catch(e){
    localStorage.removeItem('champions_session');
    return false;
  }
}
function clearSessionState(){
  tk=null;
  refreshTk=null;
  sessionExp=0;
  usr=null;
}

function setSessionFromAuth(d){
  tk=d.access_token||null;
  refreshTk=d.refresh_token||refreshTk||null;
  usr=d.user||usr||null;
  sessionExp=Date.now()+Math.max(((d.expires_in||3600)-30)*1000,30000);
  saveSession();
}

function sessionLooksExpired(){
  return !tk||!sessionExp||Date.now()>=sessionExp;
}

async function refreshSession(){
  if(!refreshTk)throw new Error('No refresh token available');
  var r=await fetch(API+'/auth/v1/token?grant_type=refresh_token',{
    method:'POST',
    headers:{'apikey':ANON,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:refreshTk})
  });
  var d=await r.json().catch(function(){return{}});
  if(!r.ok)throw new Error(d.error_description||d.msg||'Session refresh failed');
  setSessionFromAuth(d);
  return true;
}

async function ensureSession(){
  if(!usr)return false;
  if(!sessionLooksExpired())return true;
  try{
    await refreshSession();
    return true;
  }catch(e){
    handleAuthExpired();
    throw e;
  }
}

function handleAuthExpired(){
  clearSessionState();
  saveSession();
  updAuth();
  renderDash();
  renderDex();
  renderItems();
  renderBuilds();
  renderTeams();
  renderProfile();
  updProfileNavIcon();
  authMode='login';
  showLoginModal('Your session expired. Please sign in again.');
  toast('Session expired. Please sign in again.','err');
}

async function authFetch(url,options,needsAuth){
  if(needsAuth)await ensureSession();
  var opts=options||{};
  opts.headers=opts.headers||{};
  var res=await fetch(url,opts);

  if(res.status===401&&needsAuth){
    try{
      await refreshSession();
      opts.headers=Object.assign({},opts.headers,h(true));
      res=await fetch(url,opts);
    }catch(e){
      handleAuthExpired();
      throw e;
    }
    if(res.status===401){
      handleAuthExpired();
      throw new Error('Session expired');
    }
  }

  return res;
}
async function q(t,p,a){var u=new URL(API+'/rest/v1/'+t);if(p)Object.entries(p).forEach(function(e){u.searchParams.set(e[0],e[1])});var r=await authFetch(u.toString(),{headers:h(a)},a);if(!r.ok)throw new Error(t+': '+r.status);return r.json()}
async function ins(t,b,a){var r=await authFetch(API+'/rest/v1/'+t,{method:'POST',headers:Object.assign(h(a),{'Prefer':'return=representation'}),body:JSON.stringify(b)},a);if(!r.ok){var e=await r.json().catch(function(){return{}});throw new Error(e.message||r.status)}return r.json()}
async function rm(t,m,a){var u=new URL(API+'/rest/v1/'+t);Object.entries(m).forEach(function(e){u.searchParams.set(e[0],e[1])});var r=await authFetch(u.toString(),{method:'DELETE',headers:h(a)},a);if(!r.ok)throw new Error(r.status)}

// #SECTION: THEME
// ═══════════════════════════════════════
// THEME
// Light / dark mode handling.
// ═══════════════════════════════════════


function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('tbLight').classList.toggle('active',t==='light');
  document.getElementById('tbDark').classList.toggle('active',t==='dark');
  var ml=document.getElementById('msTbLight'),md=document.getElementById('msTbDark');
  if(ml)ml.classList.toggle('active',t==='light');
  if(md)md.classList.toggle('active',t==='dark');
  try{localStorage.setItem('champions_theme',t);}catch(e){}
}

// #SECTION: SIDEBAR & PAGE NAVIGATION
// ═══════════════════════════════════════
// SIDEBAR & PAGE NAVIGATION
// Sidebar collapse/expand and switching between pages.
// ═══════════════════════════════════════


var sbC=false;

// ── Navigation context ────────────────────────────────────
// Tracks where a detail view was opened from so the back
// button can return to the right place.
// source values: 'list' (default) | 'home' (dashboard feed)
var appNavContext={buildSource:'list',teamSource:'list'};

function togSb(){sbC=!sbC;document.getElementById('sb').classList.toggle('c',sbC);document.getElementById('sbTog').textContent=sbC?'▶':'◀'}
document.querySelectorAll('.sb-item').forEach(function(i){
  i.addEventListener('click',function(){
    var target=i.dataset.p;

    // Items without data-p (e.g. the mobile "More" button) handle their own click via onclick
    if(!target) return;

    if(!usr&&['builds','teams'].indexOf(target)!==-1){
  showLoginModal('Sign in to view your saved builds, teams, and collection progress.');
  return;
}

    // Close home sheets on sidebar nav (fixes z-index issue blocking confirm modal)
    var _no=document.getElementById('homeNotifOv');if(_no)_no.classList.remove('show');
    var _so=document.getElementById('homeSearchOv');if(_so)_so.classList.remove('show');
    document.querySelectorAll('.sb-item').forEach(function(n){n.classList.remove('active')});
    i.classList.add('active');
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('show')});
    document.getElementById('pg-'+target).classList.add('show');
    // Bottom nav smart reset: tapping Builds/Teams while in detail returns to list
    if(target==='builds'&&typeof buildView!=='undefined'&&buildView==='detail'){buildView='list';renderBuilds();}
    if(target==='teams'&&typeof teamView!=='undefined'&&teamView==='detail'){teamView='list';renderTeams();}
  })
});

// ═══════════════════════════════════════
// MORE SHEET (mobile overflow navigation)
// Opens a bottom sheet with Items / Natures / Profile.
// Desktop shows these as regular sidebar items (.sb-desktop), so the sheet is never opened there.
// ═══════════════════════════════════════
function openMoreSheet(){document.getElementById('moreSheetOv').classList.add('open')}
function closeMoreSheet(){document.getElementById('moreSheetOv').classList.remove('open')}
function sheetNav(page){
  // Gate protected pages just like the main click handler does
  if(!usr&&['builds','teams'].indexOf(page)!==-1){
    closeMoreSheet();
    showLoginModal('Sign in to view your saved builds, teams, and collection progress.');
    return;
  }
  // Switch page + highlight "More" as active anchor (so user always knows how they got there)
  document.querySelectorAll('.sb-item').forEach(function(n){n.classList.remove('active')});
  var more=document.getElementById('sbMore'); if(more) more.classList.add('active');
  // Also activate the hidden desktop sb-item for this page so desktop active-state stays correct
  var deskItem=document.querySelector('.sb-item[data-p='+page+']'); if(deskItem) deskItem.classList.add('active');
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('show')});
  var pg=document.getElementById('pg-'+page); if(pg) pg.classList.add('show');
  closeMoreSheet();
}
// Backdrop click dismisses the sheet
document.addEventListener('click',function(e){
  var ov=document.getElementById('moreSheetOv');
  if(ov&&e.target===ov)closeMoreSheet();
});
// Escape key dismisses the sheet
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMoreSheet()});

// #SECTION: AUTH
// ═══════════════════════════════════════
// AUTH
// Login, logout, and auth UI state.
// ═══════════════════════════════════════


async function login(){
  var emailEl=document.getElementById('loginEmail')||document.getElementById('profileEmail')||document.getElementById('eIn');
  var passEl=document.getElementById('loginPass')||document.getElementById('profilePass')||document.getElementById('pIn');
  var e=emailEl?emailEl.value:'';
  var p=passEl?passEl.value:'';
  if(!e||!p){toast('Enter your email and password','err');return}
  try{
    var r=await fetch(API+'/auth/v1/token?grant_type=password',{
      method:'POST',
      headers:{'apikey':ANON,'Content-Type':'application/json'},
      body:JSON.stringify({email:e,password:p})
    });
    var d=await r.json();
    if(!r.ok)throw new Error(d.error_description||d.msg||'Failed');
    setSessionFromAuth(d);updAuth();
    closeCm();
    await loadUser();
    renderDash();renderDex();renderItems();renderBuilds();renderTeams();renderProfile();
    toast('Welcome back!');
  }catch(x){toast(x.message,'err')}
}

async function signup(){
  var emailEl=document.getElementById('loginEmail')||document.getElementById('profileEmail')||document.getElementById('eIn');
  var passEl=document.getElementById('loginPass')||document.getElementById('profilePass')||document.getElementById('pIn');
  var e=emailEl?emailEl.value.trim():'';
  var p=passEl?passEl.value:'';
  if(!e||!p){toast('Enter your email and password','err');return}
  try{
    var r=await fetch(API+'/auth/v1/signup',{
      method:'POST',
      headers:{'apikey':ANON,'Content-Type':'application/json'},
      body:JSON.stringify({email:e,password:p})
    });
    var d=await r.json().catch(function(){return{}});
    if(!r.ok)throw new Error(d.error_description||d.msg||'Failed to sign up');
    if(d.access_token&&d.user){
      // Grab username field before closing modal (DOM cleared on closeCm)
      var unEl=document.getElementById('loginUsername');
      var signupUn=unEl?unEl.value.trim().toLowerCase():'';
      setSessionFromAuth(d);
      updAuth();
      closeCm();
      await loadUser();
      // Save username if provided and valid format
      if(signupUn&&/^[a-zA-Z0-9_-]{3,20}$/.test(signupUn)){
        try{
          if(typeof upd==='function')await upd('user_profiles',{'user_id':'eq.'+usr.id},{username:signupUn},true);
          if(userProfile)userProfile.username=signupUn;
        }catch(e){/* non-fatal: user can set it later from profile */}
      }
      renderDash();renderDex();renderItems();renderBuilds();renderTeams();renderProfile();
      toast('Account created!');
      // Show onboarding guide on first signup
      setTimeout(function(){if(!localStorage.getItem('cf_onboarded')&&typeof showOnboarding==='function')showOnboarding();},600);
    }else if(r.ok){
      // Account exists (previously unconfirmed) or autoconfirm variant — log in directly
      try{
        var lr=await fetch(API+'/auth/v1/token?grant_type=password',{
          method:'POST',
          headers:{'apikey':ANON,'Content-Type':'application/json'},
          body:JSON.stringify({email:e,password:p})
        });
        var ld=await lr.json();
        if(!lr.ok)throw new Error(ld.error_description||ld.msg||'Sign in manually');
        setSessionFromAuth(ld);updAuth();closeCm();await loadUser();
        renderDash();renderDex();renderItems();renderBuilds();renderTeams();renderProfile();
        toast('Welcome to Champions Forge! 🎉');
      }catch(le){
        authMode='login';
        toast('Account ready — tap Sign In to continue');
        showLoginModal();
      }
    }
  }catch(x){toast(x.message,'err')}
}
function logout(){
  clearSessionState();allBuilds=[];allTeams=[];uDex={};uShinyDex={};uItems={};userProfile=null;
  saveSession();
  updAuth();renderDash();renderDex();renderItems();renderBuilds();renderTeams();renderProfile();updProfileNavIcon();
  toast('Signed out');
}
function updProfileNavIcon(){
  var el=document.getElementById('profileNavIcon');
  if(!el)return;
  var avatar=userProfile&&userProfile.avatar_url?userProfile.avatar_url:'';
  if(avatar){
    el.innerHTML='<img src="'+avatar+'" alt="Profile" onerror="this.parentNode.innerHTML=\'<div class=&quot;sb-profile-fallback&quot;>⚡</div>\'">';
  }else{
    el.innerHTML='<div class="sb-profile-fallback">⚡</div>';
  }
}
function updAuth(){
  var el=document.getElementById('authEl');
  if(usr){
    var avUrl=userProfile&&userProfile.avatar_url?userProfile.avatar_url:'';
    var avHtml=avUrl
      ?'<img src="'+avUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.outerHTML=\'⚡\'">'
      :'⚡';
    var avStyle=avUrl?'padding:0;overflow:hidden':'';
    var displayName=(userProfile&&(userProfile.display_name||userProfile.username))||usr.email;
    el.innerHTML='<div class="user-p"><div class="user-av" style="'+avStyle+'">'+avHtml+'</div><span style="overflow:hidden;text-overflow:ellipsis;flex:1;font-weight:600">'+displayName+'</span></div>'+
      '<button class="ab ab-ghost sb-signout" onclick="logout()" style="margin-top:3px;display:flex;align-items:center;gap:.38rem"><i class="ph-bold ph-sign-out"></i><span class="sb-signout-label">Sign Out</span></button>';
  }else{
    el.innerHTML='<div style="display:flex;flex-direction:column;gap:.35rem"><button class="ab ab-red" onclick="authMode=\'login\';showLoginModal()" style="width:100%">Sign In</button><button class="ab ab-ghost" onclick="authMode=\'signup\';showLoginModal()" style="width:100%">Sign Up</button></div>';
  }
  updProfileNavIcon();
}

// #SECTION: CORE DATA LOADING
// ═══════════════════════════════════════
// CORE DATA LOADING
// Load user data, Pokémon, builds, teams, and Pokédex progress.
// ═══════════════════════════════════════

async function loadUser(){await Promise.all([loadBuilds(),loadTeams(),loadUDex()]);renderDash();renderDex()}
async function loadPkmn(){try{allPkmn=await q('pokemon',{order:'dex_number.asc,form.asc',limit:'1000'});document.getElementById('nc0').textContent=allPkmn.length;renderTypeF();renderFormF();renderDex();renderDash()}catch(e){document.getElementById('dexGrid').innerHTML='<div class="empty"><div class="em">⚠️</div>'+e.message+'</div>'}}

// Drop E: Lightweight global move lookup (name → full meta). Powers build-detail gradients
// and acts as a fallback for the picker. Only in_champions moves (~494 rows).
async function loadMoveIndex(){
  try{
    var rows=await q('moves',{select:'name,type,category,power,accuracy,pp,priority,short_description,champions_power,champions_accuracy,champions_pp,in_champions',in_champions:'eq.true',limit:'1000'});
    rows.forEach(function(m){
      allMoveIndex[m.name]={
        name:m.name,type:m.type,category:m.category,
        power:(m.champions_power!=null?m.champions_power:m.power)||0,
        accuracy:(m.champions_accuracy!=null?m.champions_accuracy:m.accuracy),
        pp:(m.champions_pp!=null?m.champions_pp:m.pp)||0,
        priority:m.priority||0,
        short:m.short_description||m.description||''
      };
    });
    if(typeof renderBuilds==='function'&&document.getElementById('pg-builds')&&document.getElementById('pg-builds').classList.contains('show'))renderBuilds();
  }catch(e){console.log('loadMoveIndex failed:',e)}
}

// Drop G.3: All pokemon_abilities rows (546, loaded once at boot).
// Enables instant ability legality checks without per-Pokémon API calls.
var allPkmnAbilities=[];
async function loadAllPkmnAbilities(){
  try{var rows=await q('pokemon_abilities',{select:'pokemon_id,ability_id,slot',limit:'600'});allPkmnAbilities=rows;}
  catch(e){allPkmnAbilities=[];}
}

// Drop G.3: Ability legality state for a stored ability name on a given species.
// States: 'empty' | 'legal' | 'pending' (data not loaded) | 'unknown' | 'illegal'
function abilityLegalityState(name,pokemonId){
  if(!name)return 'empty';
  if(!pokemonId)return 'legal';
  if(!allPkmnAbilities.length)return 'pending';
  var abl=(window.allAbilities||[]).find(function(a){return a.name===name;});
  if(!abl)return 'unknown';
  return allPkmnAbilities.some(function(pa){return pa.pokemon_id===pokemonId&&pa.ability_id===abl.id;})?'legal':'illegal';
}

// Drop E: Legality state for a move on a given species. Used for transition
// flags on legacy free-text builds so users can see which of their existing
// picks are unknown (typo / not-in-champions) or illegal (not in learnset).
// States: 'empty' | 'legal' | 'pending' (learnset not loaded) | 'unknown' | 'illegal'
function moveLegalityState(name,pokemonId){
  if(!name)return 'empty';
  if(!allMoveIndex[name])return 'unknown';
  if(!pokemonId)return 'legal';
  var ls=learnsetCache[pokemonId];
  if(!ls)return 'pending';
  for(var i=0;i<ls.length;i++){if(ls[i].name===name)return 'legal'}
  return 'illegal';
}

// Drop E: Species-scoped legal moveset, dedup by name, filtered to in_champions,
// alphabetical. Cached per pokemon_id for the session.
async function loadLearnset(pokemonId){
  if(!pokemonId)return[];
  if(learnsetCache[pokemonId])return learnsetCache[pokemonId];
  try{
    var rows=await q('pokemon_moves',{pokemon_id:'eq.'+pokemonId,select:'move_id,moves(name,type,category,power,accuracy,pp,priority,short_description,champions_power,champions_accuracy,champions_pp,in_champions)',limit:'1000'});
    var seen={},out=[];
    rows.forEach(function(row){
      var m=row.moves;if(!m)return;
      if(m.in_champions===false)return;
      if(seen[m.name])return;
      seen[m.name]=1;
      out.push({
        name:m.name,type:m.type,category:m.category,
        power:(m.champions_power!=null?m.champions_power:m.power)||0,
        accuracy:(m.champions_accuracy!=null?m.champions_accuracy:m.accuracy),
        pp:(m.champions_pp!=null?m.champions_pp:m.pp)||0,
        priority:m.priority||0,
        short:m.short_description||m.description||''
      });
    });
    out.sort(function(a,b){return a.name.localeCompare(b.name)});
    learnsetCache[pokemonId]=out;
    return out;
  }catch(e){console.log('loadLearnset failed:',e);return[]}
}
async function loadBuilds(){if(!tk)return;try{allBuilds=await q('build_details',{order:'created_at.desc',limit:'200'},true);document.getElementById('nc1').textContent=allBuilds.length;renderDash()}catch(e){}}
async function loadTeams(){if(!tk)return;try{allTeams=await q('teams',{order:'created_at.desc'},true);document.getElementById('nc2').textContent=allTeams.length;renderDash()}catch(e){}}
async function loadUDex(){if(!tk)return;try{var rows=await q('user_pokedex',{select:'pokemon_id,obtained,shiny_obtained'},true);uDex={};uShinyDex={};rows.forEach(function(r){if(r.obtained)uDex[r.pokemon_id]=true;if(r.shiny_obtained)uShinyDex[r.pokemon_id]=true});renderDex();renderDash()}catch(e){}}
