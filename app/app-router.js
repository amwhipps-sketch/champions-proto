// #SECTION: HASH ROUTER (Drop F.1)
// ═══════════════════════════════════════
// HASH ROUTER
// Parses URL hash and dispatches to public view renderers.
// Routes:
//   #/b/<code>   public build   (4-6 char base62)
//   #/t/<code>   public team
//   #/u/<name>   public profile (stub placeholder for F.3+)
// Invalid / empty hash falls through to normal signed-in app UI.
// ═══════════════════════════════════════

var _pubRoute=null;         // {kind:'build'|'team'|'profile', code?, name?} | null
var _pubRouteSticky=false;  // true once a public route has been rendered (controls whether we hide sidebar on signed-out)

function parseHash(hash){
  if(!hash||hash==='#'||hash==='#/')return null;
  var path=hash.replace(/^#/,'');
  var m;
  if(m=path.match(/^\/b\/([0-9a-zA-Z]{4,8})$/))return{kind:'build',code:m[1]};
  if(m=path.match(/^\/t\/([0-9a-zA-Z]{4,8})$/))return{kind:'team',code:m[1]};
  if(m=path.match(/^\/u\/([a-zA-Z0-9_-]{3,20})$/))return{kind:'profile',name:m[1].toLowerCase()};
  return null;
}

function handleHashRoute(){
  var route=parseHash(location.hash);
  _pubRoute=route;
  if(!route){
    hidePublicPage();
    return false;
  }
  _pubRouteSticky=true;
  showPublicPage();
  if(route.kind==='build')renderPublicBuild(route.code);
  else if(route.kind==='team')renderPublicTeam(route.code);
  else if(route.kind==='profile')renderPublicProfile(route.name);
  return true;
}

function showPublicPage(){
  // Hide all normal pages
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('show')});
  // Show public container
  var pg=document.getElementById('pg-public');
  if(pg)pg.classList.add('show');
  // Clear sidebar active state (no app-page selected)
  document.querySelectorAll('.sb-item.active').forEach(function(i){i.classList.remove('active')});
  // On public route, hide sidebar for signed-out visitors (no nav target anyway).
  // Signed-in viewers keep the sidebar so they can get back to their own app.
  document.body.classList.add('pub-route');
  if(usr){document.body.classList.add('pub-route-authed')}
  else{document.body.classList.remove('pub-route-authed')}
}

function hidePublicPage(){
  var pg=document.getElementById('pg-public');
  if(pg){pg.classList.remove('show');pg.innerHTML=''}
  document.body.classList.remove('pub-route');
  document.body.classList.remove('pub-route-authed');
  // If this is the first load and no other page is active, fall back to dashboard
  var anyActive=document.querySelector('.page.show');
  if(!anyActive){
    var dash=document.getElementById('pg-dash');if(dash)dash.classList.add('show');
    var dashItem=document.querySelector('.sb-item[data-p="dash"]');if(dashItem)dashItem.classList.add('active');
  }
}

// #SECTION: SHARE CODE GENERATOR
// ═══════════════════════════════════════
// SHARE CODE GENERATOR
// Base62 (0-9a-zA-Z), fixed 5 chars. 916M combos — comfortable headroom for
// early user counts. Collision retry happens at insert time via ensureShareCode.
// ═══════════════════════════════════════

var SHARE_ALPHA='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function genShareCode(len){
  len=len||5;
  var out='';
  // Prefer crypto for better distribution; fall back to Math.random if unavailable (very old browsers).
  if(typeof crypto!=='undefined'&&crypto.getRandomValues){
    var buf=new Uint32Array(len);
    crypto.getRandomValues(buf);
    for(var i=0;i<len;i++)out+=SHARE_ALPHA.charAt(buf[i]%SHARE_ALPHA.length);
  }else{
    for(var j=0;j<len;j++)out+=SHARE_ALPHA.charAt(Math.floor(Math.random()*SHARE_ALPHA.length));
  }
  return out;
}

// ensureShareCode(kind, id) — returns the row's share_code.
// If NULL in DB, generates a fresh base62 code and PATCHes the row, retrying on
// unique violation (PostgREST surfaces Postgres 23505 as HTTP 409 when Prefer
// returns representation; body will contain { code: '23505', message: ... }).
// kind: 'build' | 'team'
async function ensureShareCode(kind,id){
  var table=kind==='build'?'builds':'teams';
  // Fetch current share_code
  var rows=await q(table,{id:'eq.'+id,select:'share_code'},true);
  if(rows&&rows.length&&rows[0].share_code)return rows[0].share_code;

  // Generate with retry on unique violation
  for(var attempt=0;attempt<8;attempt++){
    var code=genShareCode(5);
    var r=await authFetch(API+'/rest/v1/'+table+'?id=eq.'+id,{
      method:'PATCH',
      headers:Object.assign(h(true),{'Prefer':'return=representation'}),
      body:JSON.stringify({share_code:code})
    },true);
    if(r.ok){
      return code;
    }
    // Parse error; look for unique_violation
    var err={};try{err=await r.json()}catch(_){}
    if(r.status===409||err.code==='23505'){
      // Collision — try again with a new code
      continue;
    }
    throw new Error(err.message||('ensureShareCode failed: '+r.status));
  }
  throw new Error('ensureShareCode: retry exhausted (8 attempts)');
}

// #SECTION: PUBLIC RENDERERS (Drop F.2 — full detail)
// ═══════════════════════════════════════
// PUBLIC RENDERERS
// Full read-only detail layout with share_fields customisation support.
// Each renderer fetches exactly what it needs (doesn't rely on allPkmn being
// loaded), because the router can fire before reference data is ready.
// ═══════════════════════════════════════

function pubEscape(s){
  if(s==null)return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Build a "by @handle" byline. If no username, show Unknown trainer.
function pubByline(author){
  if(author&&author.username){
    var u=pubEscape(author.username);
    return 'by <a href="#/u/'+u+'">@'+u+'</a>';
  }
  return 'by <span style="opacity:.7">Unknown trainer</span>';
}

// Build type-chip HTML from a pokemon row. Uses TC (type colour) table.
function pubTypeChips(p){
  if(!p||!p.type_1)return '';
  var types=[p.type_1];if(p.type_2)types.push(p.type_2);
  var html='<div class="pub-types">';
  types.forEach(function(t){
    var col=TC[t];if(!col)return;
    html+='<span class="pub-type-chip" style="background:linear-gradient(135deg,'+col.m+','+col.d+')">'+pubEscape(t)+'</span>';
  });
  html+='</div>';
  return html;
}

// Compute radial glow style from a Pokémon's types. For shiny variants,
// callers substitute a gold→red gradient via CSS .shiny modifier.
function pubGlowStyle(p){
  if(!p||!p.type_1||!TC[p.type_1])return '';
  var c1=TC[p.type_1];
  var c2=p.type_2&&TC[p.type_2]?TC[p.type_2]:c1;
  function hexToRgb(hex){
    var h=hex.replace('#','');
    if(h.length===3)h=h.split('').map(function(ch){return ch+ch}).join('');
    return[parseInt(h.substring(0,2),16),parseInt(h.substring(2,4),16),parseInt(h.substring(4,6),16)];
  }
  var rgb1=hexToRgb(c1.m),rgb2=hexToRgb(c2.m);
  return 'background:radial-gradient(circle,rgba('+rgb1.join(',')+',.35) 0%,rgba('+rgb2.join(',')+',.18) 40%,transparent 70%);';
}

// Read share_fields JSONB with safe defaults. NULL = all visible. For builds,
// {moves,ability,stats,item} default to true when key absent. For teams,
// {type_coverage} defaults to false.
function pubGetShareFields(raw,kind){
  if(kind==='team'){
    var t={type_coverage:false};
    if(raw&&typeof raw==='object'){
      if(raw.type_coverage===true)t.type_coverage=true;
    }
    return t;
  }
  // build
  var b={moves:true,ability:true,stats:true,item:true};
  if(raw&&typeof raw==='object'){
    if(raw.moves===false)b.moves=false;
    if(raw.ability===false)b.ability=false;
    if(raw.stats===false)b.stats=false;
    if(raw.item===false)b.item=false;
  }
  return b;
}

// Nature-mod stat name map (app-core DB uses 'attack','defense','sp_attack','sp_defense','speed','hp')
var PUB_NAT_MAP={hp:'hp',attack:'atk',defense:'def',sp_attack:'spa',sp_defense:'spd',speed:'spe'};

// Level 50 Champions stat calc (mirrors bsCalcStatFor). Kept local so the
// renderer doesn't depend on app-builds being loaded first.
function pubCalcStat(key,base,spVal,natureRow){
  var m=1;
  if(natureRow){
    if(PUB_NAT_MAP[natureRow.increased_stat]===key)m=1.1;
    if(PUB_NAT_MAP[natureRow.decreased_stat]===key)m=0.9;
  }
  if(key==='hp')return Math.floor((2*base+31)*50/100)+60+spVal;
  return Math.floor((Math.floor((2*base+31)*50/100)+5)*m)+spVal;
}

// Pretty-print stat names for nature chip
function pubStatShort(dbName){
  var map={attack:'Atk',defense:'Def',sp_attack:'SpA',sp_defense:'SpD',speed:'Spe',hp:'HP'};
  return map[dbName]||dbName;
}

// Render an info card (label + value + optional sub) for the 2-col grid
function pubInfoCard(label,val,subHtml){
  return (
    '<div class="pub-info-card">'+
      '<div class="label">'+pubEscape(label)+'</div>'+
      '<div class="val">'+pubEscape(val)+'</div>'+
      (subHtml?'<div class="val-sub">'+subHtml+'</div>':'')+
    '</div>'
  );
}

// Render the nature card with ▲ / ▼ stat chips
function pubNatureCard(nature){
  if(!nature)return pubInfoCard('Nature','—','');
  var upHtml='',downHtml='';
  if(nature.increased_stat&&nature.increased_stat!==nature.decreased_stat){
    upHtml='<span class="nat-up">▲ '+pubStatShort(nature.increased_stat)+'</span>';
  }
  if(nature.decreased_stat&&nature.increased_stat!==nature.decreased_stat){
    downHtml='<span class="nat-down">▼ '+pubStatShort(nature.decreased_stat)+'</span>';
  }
  var sub=upHtml+' '+downHtml;
  if(!upHtml&&!downHtml)sub='Neutral';
  return pubInfoCard('Nature',nature.name||'—',sub);
}

// Render the held item row (full-width with sprite + description)
function pubItemRow(item){
  if(!item||!item.name){
    return '<div class="pub-info-row empty"><div class="val">— None —</div></div>';
  }
  var img=item.sprite_url?'<img class="item-img" src="'+pubEscape(item.sprite_url)+'" alt="">':'<span class="item-img" style="display:inline-flex;align-items:center;justify-content:center;font-size:1rem">🎒</span>';
  var desc=item.short_description||item.description||'';
  return (
    '<div class="pub-info-row">'+
      img+
      '<div class="item-text">'+
        '<div class="name">'+pubEscape(item.name)+'</div>'+
        (desc?'<div class="desc">'+pubEscape(desc)+'</div>':'')+
      '</div>'+
    '</div>'
  );
}

// Drop F.2.1: Full stat section — Bars/Hex toggle + per-stat SP tags, matching
// the in-app build detail. Reuses the `.bs-*` classes already styled for the
// editor + detail view and the globally-defined helpers `bsGetCalcStatsFor`
// (app-builds.js) and `bdBuildHex` (app-builds.js). BST total and SP-used bar
// intentionally omitted — user wanted just the stat spread visible.
var pubStatView='bars'; // 'bars' | 'hex'

function pubToggleStatView(view){
  if(view!=='bars'&&view!=='hex')return;
  pubStatView=view;
  // Toggle active class on the two view containers + buttons
  var bars=document.getElementById('pub-barsView');
  var hex=document.getElementById('pub-hexView');
  if(bars)bars.classList.toggle('active',view==='bars');
  if(hex)hex.classList.toggle('active',view==='hex');
  document.querySelectorAll('.pub-stats-section .bs-view-btn').forEach(function(btn){
    btn.classList.toggle('active',btn.getAttribute('data-view')===view);
  });
}

function pubStatsSection(pk,sp,nature){
  if(!pk)return '';
  // Map our spObj to the shape bsGetCalcStatsFor expects: {hp,atk,def,spa,spd,spe}
  var spObj={
    hp:(sp&&sp.hp_sp)||0,
    atk:(sp&&sp.atk_sp)||0,
    def:(sp&&sp.def_sp)||0,
    spa:(sp&&sp.spa_sp)||0,
    spd:(sp&&sp.spd_sp)||0,
    spe:(sp&&sp.spe_sp)||0
  };
  var stats;
  // Prefer the shared helper (consistent math with editor + in-app detail).
  if(typeof bsGetCalcStatsFor==='function'){
    stats=bsGetCalcStatsFor(pk,spObj,nature);
  }else{
    // Defensive fallback — shouldn't hit since app-builds loads first.
    stats=['hp','atk','def','spa','spd','spe'].map(function(k){
      var dbCol={hp:'base_hp',atk:'base_atk',def:'base_def',spa:'base_spa',spd:'base_spd',spe:'base_spe'}[k];
      var base=pk[dbCol]||0;var spVal=spObj[k]||0;
      return{key:k,base:base,sp:spVal,calc:pubCalcStat(k,base,spVal,nature),natMod:1};
    });
  }

  // Fallback to our own colour/name maps if the globals haven't loaded (shouldn't happen)
  var BSCm=(typeof BSC!=='undefined')?BSC:{hp:'#a78bfa',atk:'#f97316',def:'#3b82f6',spa:'#fdba74',spd:'#7dd3fc',spe:'#fb7185'};
  var BSNm=(typeof BSN!=='undefined')?BSN:{hp:'HP',atk:'Atk',def:'Def',spa:'SpA',spd:'SpD',spe:'Spe'};

  // Bars HTML — mirrors renderBuildDetail's bars exactly so visuals match.
  var barsHtml='<div class="bs-grid">'+stats.map(function(st){
    var spVal=spObj[st.key]||0;
    var pct=Math.min(st.calc/300*100,100);
    var natInd=st.natMod>1?'<span style="color:var(--green)">▲</span>':st.natMod<1?'<span style="color:var(--red)">▼</span>':'';
    return (
      '<div class="bs-row">'+
        '<span class="bs-label">'+BSNm[st.key]+'</span>'+
        '<div class="bs-track"><div class="bs-fill" style="width:'+pct+'%;background:'+BSCm[st.key]+'"></div></div>'+
        '<span class="bs-val" style="color:'+BSCm[st.key]+'">'+st.calc+'</span>'+
        '<span class="bs-sp-tag'+(spVal>0?' has-sp':'')+'">+'+spVal+'</span>'+
        '<span class="bs-nat-ind">'+natInd+'</span>'+
      '</div>'
    );
  }).join('')+'</div>';

  // Hex — use the existing helper from app-builds.js for consistency
  var hexHtml=(typeof bdBuildHex==='function')?bdBuildHex(pk,stats):'<div style="padding:1rem;color:var(--muted);font-size:.78rem;text-align:center">Hex view unavailable</div>';

  return (
    '<div class="pub-stats-section">'+
      '<div class="bs-view-toggle">'+
        '<button class="bs-view-btn'+(pubStatView==='bars'?' active':'')+'" data-view="bars" onclick="pubToggleStatView(\'bars\')">📊 Bars</button>'+
        '<button class="bs-view-btn'+(pubStatView==='hex'?' active':'')+'" data-view="hex" onclick="pubToggleStatView(\'hex\')">⬢ Hex</button>'+
      '</div>'+
      '<div class="bs-view'+(pubStatView==='bars'?' active':'')+'" id="pub-barsView">'+barsHtml+'</div>'+
      '<div class="bs-view'+(pubStatView==='hex'?' active':'')+'" id="pub-hexView">'+hexHtml+'</div>'+
    '</div>'
  );
}

// Render a 2x2 move card grid. `movesMeta` is a map from name → row from the
// moves table. Missing metadata (typo'd move names, non-in_champions) falls
// back to a muted card.
function pubMoveCards(moveNames,movesMeta){
  var names=(moveNames||[]).filter(function(m){return m&&m.trim()});
  if(!names.length){
    return '<div class="pub-empty-moves">No moves set</div>';
  }
  var html='<div class="pub-moves">';
  names.forEach(function(name){
    var meta=movesMeta[name]||null;
    var type=meta?meta.type:'Normal';
    var cat=meta?meta.category:'—';
    var power=meta?(meta.champions_power!=null?meta.champions_power:meta.power):null;
    var priority=meta?meta.priority:0;
    var catShort=(cat||'').toLowerCase()==='physical'?'PHY':(cat||'').toLowerCase()==='special'?'SPC':(cat||'').toLowerCase()==='status'?'STATUS':'—';
    // Footer varies by move type: status shows description snippet or "+Atk/Spe"-style; damage shows BP + priority
    var footRight='';
    if(catShort==='STATUS'){
      // Use description if available; try to summarise for known stat-boost moves
      var desc=meta?(meta.short_description||meta.description||''):'';
      // Quick pattern for Dragon Dance / Swords Dance / etc: "Raises the user's X and Y by 1"
      var sm=desc.match(/Raises? the user's ([A-Za-z]+)(?:\s+and\s+([A-Za-z]+))?/i);
      if(sm){
        var s1=sm[1];var s2=sm[2];
        footRight='+'+s1.substring(0,3)+(s2?'/'+s2.substring(0,3):'');
      }else if(desc.length>0){
        footRight=desc.length>20?desc.substring(0,18)+'…':desc;
      }else{
        footRight='—';
      }
    }else{
      if(power&&power>0){
        footRight=power+' BP';
        if(priority&&priority>0)footRight+=' · +'+priority+' prio';
        else if(priority&&priority<0)footRight+=' · '+priority+' prio';
      }else{
        footRight=priority&&priority!==0?(priority>0?'+':'')+priority+' prio':'—';
      }
    }
    var typeClass='t-'+pubEscape(type);
    html+=(
      '<div class="pub-move '+typeClass+'">'+
        '<div class="pub-move-name">'+pubEscape(name)+'</div>'+
        '<div class="pub-move-foot"><span class="pub-move-cat">'+catShort+'</span><span class="pub-move-power">'+pubEscape(footRight)+'</span></div>'+
      '</div>'
    );
  });
  html+='</div>';
  return html;
}

// Team type coverage: for each of 18 attacking types, multiply effectiveness
// across all 6 members' defensive types. Return grouped by bucket.
function pubTeamCoverage(members){
  if(!members||!members.length||typeof TCHART!=='object')return null;
  var buckets={weak:[],resist:[]};
  // For each attacking type, compute the team's aggregate multiplier average
  // Simpler: count how many members are weak / resist to each type, show strongest
  ALL_T.forEach(function(attackType){
    var weakCount=0,resistCount=0,immuneCount=0;
    members.forEach(function(m){
      if(!m.type_1)return;
      var mult=1;
      var vs1=TCHART[attackType]&&TCHART[attackType][m.type_1];
      if(vs1!==undefined)mult=vs1;
      if(m.type_2){
        var vs2=TCHART[attackType]&&TCHART[attackType][m.type_2];
        if(vs2!==undefined)mult*=vs2;
      }
      if(mult>=2)weakCount++;
      else if(mult>0&&mult<=0.5)resistCount++;
      else if(mult===0)immuneCount++;
    });
    // Team is "weak to X" if majority of members are weak (3+)
    if(weakCount>=3)buckets.weak.push(attackType);
    // Team "resists X" if majority resist or are immune (3+)
    if(resistCount+immuneCount>=3)buckets.resist.push(attackType);
  });
  return buckets;
}

function pubTeamCoverageHtml(members){
  var cov=pubTeamCoverage(members);if(!cov)return '';
  function pillList(types){
    if(!types.length)return '<span class="pt-cov-none">—</span>';
    return types.map(function(t){
      var col=TC[t];if(!col)return '';
      // Ice/Steel/Fairy light backgrounds need dark text for contrast
      var textCol=(t==='Ice'||t==='Steel'||t==='Fairy')?'color:#1e293b':'color:#fff';
      return '<span class="pt-cov-pill" style="background:linear-gradient(135deg,'+col.m+','+col.d+');'+textCol+'">'+pubEscape(t)+'</span>';
    }).join('');
  }
  return (
    '<div class="pub-section">'+
      '<div class="pub-section-head"><span>Type Coverage</span></div>'+
      '<div class="pt-coverage">'+
        '<div class="pt-cov-row"><span class="pt-cov-label">Resists</span><div class="pt-cov-bar">'+pillList(cov.resist)+'</div></div>'+
        '<div class="pt-cov-row"><span class="pt-cov-label">Weak to</span><div class="pt-cov-bar">'+pillList(cov.weak)+'</div></div>'+
      '</div>'+
    '</div>'
  );
}

async function renderPublicBuild(code){
  var host=document.getElementById('pg-public');if(!host)return;
  host.innerHTML=
    '<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
    '<div class="pub-wrap"><div class="pub-card"><div class="pub-loading">⏳ Loading build…</div></div></div>';

  try{
    // Anon path uses apikey-only headers; authenticated users get authFetch.
    var needsAuth=!!tk;
    // Full fetch — one round trip. Uses the builds table (not build_details view)
    // for predictable column names.
    var rows=await q('builds',{
      share_code:'eq.'+code,
      is_public:'eq.true',
      select:'id,name,user_id,pokemon_id,is_shiny,battle_format,archetype,ability,item_id,nature_id,move_1,move_2,move_3,move_4,hp_sp,atk_sp,def_sp,spa_sp,spd_sp,spe_sp,share_fields,created_at'
    },needsAuth);

    if(!rows||!rows.length){host.innerHTML=pubNotFoundHtml('build');return}
    var b=rows[0];
    var sf=pubGetShareFields(b.share_fields,'build');

    // Parallel fetch: author profile, pokemon, item (if set), nature (if set), moves
    var profilesP=q('user_profiles',{user_id:'eq.'+b.user_id,select:'username,display_name'},needsAuth).catch(function(){return[]});
    var pkP=q('pokemon',{id:'eq.'+b.pokemon_id,select:'id,name,type_1,type_2,image_url,shiny_url,is_mega,base_hp,base_atk,base_def,base_spa,base_spd,base_spe'},needsAuth).catch(function(){return[]});
    var itemP=b.item_id?q('items',{id:'eq.'+b.item_id,select:'name,sprite_url,short_description,description'},needsAuth).catch(function(){return[]}):Promise.resolve([]);
    var natureP=b.nature_id?q('natures',{id:'eq.'+b.nature_id,select:'name,increased_stat,decreased_stat'},needsAuth).catch(function(){return[]}):Promise.resolve([]);
    var moveNames=[b.move_1,b.move_2,b.move_3,b.move_4].filter(function(m){return m&&m.trim()});
    var movesP=moveNames.length?q('moves',{
      name:'in.('+moveNames.map(function(n){return '"'+n.replace(/"/g,'\\"')+'"'}).join(',')+')',
      select:'name,type,category,power,accuracy,pp,priority,short_description,champions_power,champions_accuracy,champions_pp'
    },needsAuth).catch(function(){return[]}):Promise.resolve([]);

    // Likes — always fetch (anon can read likes on public content per RLS)
    var likesP=q('build_likes',{build_id:'eq.'+b.id,select:'user_id'},false).catch(function(){return[]});

    var results=await Promise.all([profilesP,pkP,itemP,natureP,movesP,likesP]);
    var author=results[0]&&results[0][0]?results[0][0]:{};
    var pk=results[1]&&results[1][0]?results[1][0]:null;
    var item=results[2]&&results[2][0]?results[2][0]:null;
    var nature=results[3]&&results[3][0]?results[3][0]:null;
    var movesMeta={};(results[4]||[]).forEach(function(m){movesMeta[m.name]=m});
    var likeRows=results[5]||[];
    var likeData={id:b.id,ownerId:b.user_id,count:likeRows.length,liked:!!(usr&&likeRows.some(function(r){return r.user_id===usr.id}))};

    host.innerHTML=pubBuildFullHtml(b,author,pk,item,nature,movesMeta,sf,likeData);
  }catch(e){
    console.log('renderPublicBuild failed:',e);
    host.innerHTML=pubErrorHtml('build',e.message||'Unknown error');
  }
}

async function renderPublicTeam(code){
  var host=document.getElementById('pg-public');if(!host)return;
  host.innerHTML=
    '<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
    '<div class="pub-wrap"><div class="pub-card"><div class="pub-loading">⏳ Loading team…</div></div></div>';

  try{
    var needsAuth=!!tk;
    var rows=await q('teams',{
      share_code:'eq.'+code,
      is_public:'eq.true',
      select:'id,name,user_id,format,share_fields,roster_size,created_at'
    },needsAuth);
    if(!rows||!rows.length){host.innerHTML=pubNotFoundHtml('team');return}
    var t=rows[0];
    var sf=pubGetShareFields(t.share_fields,'team');

    // Parallel: author profile + team_builds join to get all member builds
    // team_builds RLS lets anon read when parent team is public — then we
    // nested-select the build + pokemon in one round trip.
    var profilesP=q('user_profiles',{user_id:'eq.'+t.user_id,select:'username,display_name'},needsAuth).catch(function(){return[]});
    var membersP=q('team_builds',{
      team_id:'eq.'+t.id,
      select:'slot_position,builds(id,name,is_public,share_code,is_shiny,pokemon_id,pokemon(id,name,type_1,type_2,image_url,shiny_url,is_mega))',
      order:'slot_position.asc'
    },needsAuth).catch(function(){return[]});

    var likesP=q('team_likes',{team_id:'eq.'+t.id,select:'user_id'},false).catch(function(){return[]});

    var results=await Promise.all([profilesP,membersP,likesP]);
    var author=results[0]&&results[0][0]?results[0][0]:{};
    var memberRows=results[1]||[];
    var likeRows=results[2]||[];
    var likeData={id:t.id,ownerId:t.user_id,count:likeRows.length,liked:!!(usr&&likeRows.some(function(r){return r.user_id===usr.id}))};

    // Flatten the nested structure for the renderer
    var members=memberRows.map(function(row){
      var build=row.builds||{};
      var pk=build.pokemon||{};
      return {
        slot:row.slot_position,
        build_id:build.id,
        build_name:build.name,
        build_is_public:!!build.is_public,
        build_share_code:build.share_code||null,
        is_shiny:!!build.is_shiny,
        pk_id:pk.id,
        pk_name:pk.name,
        type_1:pk.type_1,
        type_2:pk.type_2,
        image_url:pk.image_url,
        shiny_url:pk.shiny_url
      };
    }).filter(function(m){return m.pk_id});

    host.innerHTML=pubTeamFullHtml(t,author,members,sf,likeData);
  }catch(e){
    console.log('renderPublicTeam failed:',e);
    host.innerHTML=pubErrorHtml('team',e.message||'Unknown error');
  }
}

async function renderPublicProfile(username){
  var host=document.getElementById('pg-public');if(!host)return;
  host.innerHTML='<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
    '<div class="pub-wrap"><div class="pub-loading">Loading @'+pubEscape(username)+'…</div></div>'+pubCtaHtml();
  try{
    var profiles=await fetch(API+'/rest/v1/user_profiles?username=eq.'+encodeURIComponent(username)+'&select=user_id,display_name,username,avatar_url',{headers:{'apikey':ANON}}).then(function(r){return r.json()});
    if(!profiles||!profiles.length){
      host.innerHTML='<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
        '<div class="pub-wrap"><div class="pub-card"><div class="pub-404">👤</div><div class="pub-name">@'+pubEscape(username)+'</div><div class="pub-author">Trainer not found</div></div></div>'+pubCtaHtml();
      return;
    }
    var profile=profiles[0];var uid=profile.user_id;
    var builds=await fetch(API+'/rest/v1/build_details?user_id=eq.'+uid+'&is_public=eq.true&order=created_at.desc&limit=10',{headers:{'apikey':ANON}}).then(function(r){return r.json()}).catch(function(){return[];});
    if(!Array.isArray(builds))builds=[];
    var fs=typeof getFriendStatus==='function'&&usr?getFriendStatus(uid):{status:'none',rowId:null,iAmReq:false};
    var isOwn=usr&&usr.id===uid;
    var av=profile.avatar_url?'<img src="'+pubEscape(profile.avatar_url)+'" style="width:52px;height:52px;border-radius:14px;object-fit:cover" onerror="this.style.display=\'none\'">':'<span style="font-size:1.5rem">👤</span>';
    var afBtn='';
    if(usr&&!isOwn){
      var afCls=fs.status==='accepted'?'pub-add-friend-btn friends':fs.status==='pending'?'pub-add-friend-btn pending':'pub-add-friend-btn';
      var afTxt=fs.status==='accepted'?'✓ Friends':fs.status==='pending'&&fs.iAmReq?'⏳ Request Sent':fs.status==='pending'&&!fs.iAmReq?'Accept →':'Add Friend';
      var afClick=fs.status==='accepted'?'':fs.status==='pending'&&!fs.iAmReq?'pubAcceptFriend(\''+fs.rowId+'\')':'pubSendFriendRequest(\''+uid+'\')';
      afBtn='<button class="'+afCls+'" id="pubAfBtn" onclick="'+afClick+'">'+afTxt+'</button>';
    }
    var buildsHtml='';
    if(builds.length){
      buildsHtml='<div class="pub-section"><div class="pub-section-head">Public Builds</div>'+
        builds.map(function(b){
          var img=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');
          return'<div class="pub-build-row" onclick="location.hash=\'#/b/'+pubEscape(b.share_code||'')+'\'">'+
            (img?'<img class="pub-build-thumb" src="'+pubEscape(img)+'" onerror="this.style.opacity=.2">':'<div class="pub-build-thumb"></div>')+
            '<div class="pub-build-info"><div class="pub-build-name">'+pubEscape(b.build_name||'Unnamed')+'</div><div class="pub-build-sub">'+pubEscape(b.type_1||'')+(b.type_2?' · '+pubEscape(b.type_2):'')+' · '+(b.battle_format||'Singles')+'</div></div>'+
            '<span class="pub-chevron">›</span>'+
          '</div>';
        }).join('')+
      '</div>';
    }else{buildsHtml='<div class="pub-section" style="text-align:center;padding:1.5rem 0;color:var(--muted);font-size:.82rem">No public builds yet</div>';}
    host.innerHTML=
      '<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
      '<div class="pub-wrap">'+
        '<div class="pub-profile-header">'+
          '<div class="pub-av-wrap">'+av+'</div>'+
          '<div class="pub-profile-info">'+
            '<div class="pub-name">'+pubEscape(profile.display_name||'Trainer')+'</div>'+
            '<div class="pub-un-row">@'+pubEscape(profile.username||username)+'</div>'+
            '<div style="font-size:.72rem;color:var(--muted);margin-top:3px">'+builds.length+' public build'+(builds.length!==1?'s':'')+'</div>'+
          '</div>'+
        '</div>'+
        (afBtn?'<div class="pub-af-row">'+afBtn+'</div>':'')+
        buildsHtml+
      '</div>'+
      pubCtaHtml();
  }catch(e){
    host.innerHTML='<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
      '<div class="pub-wrap"><div class="pub-card"><div class="pub-404">⚠️</div><div class="pub-author">Failed to load profile</div></div></div>'+pubCtaHtml();
  }
}
async function pubSendFriendRequest(toId){
  if(!usr){showLoginModal('Sign in to add friends');return;}
  var btn=document.getElementById('pubAfBtn');if(!btn)return;
  btn.disabled=true;btn.textContent='Sending…';
  try{
    await authFetch(API+'/rest/v1/friends',{method:'POST',headers:Object.assign(h(true),{'Prefer':'return=representation'}),body:JSON.stringify({requester_id:usr.id,addressee_id:toId,status:'pending'})});
    btn.className='pub-add-friend-btn pending';btn.textContent='⏳ Request Sent';btn.disabled=true;
    if(typeof allFriends!=='undefined'&&!allFriends.find(function(f){return f.friend_id===toId;}))
      allFriends.push({id:'local-'+Date.now(),friend_id:toId,status:'pending',i_am_requester:true,display_name:'',username:'',avatar_url:''});
    toast('Friend request sent! 👥');
  }catch(e){btn.disabled=false;btn.textContent='Add Friend';toast('Failed to send request','err');}
}
async function pubAcceptFriend(rowId){
  if(!usr)return;
  var btn=document.getElementById('pubAfBtn');if(!btn)return;
  btn.disabled=true;
  try{
    await authFetch(API+'/rest/v1/friends?id=eq.'+rowId,{method:'PATCH',headers:Object.assign(h(true),{'Prefer':'return=minimal'}),body:JSON.stringify({status:'accepted'})});
    var f=typeof allFriends!=='undefined'?allFriends.find(function(x){return x.id===rowId;}):null;
    if(f)f.status='accepted';
    btn.className='pub-add-friend-btn friends';btn.textContent='✓ Friends';
    toast('Friend added! 👥');
    if(typeof updProfileNavBadge==='function')updProfileNavBadge();
  }catch(e){btn.disabled=false;toast('Could not accept','err');}
}

// ═══════════════════════════════════════
// HTML BUILDERS — FULL PUBLIC DETAIL
// ═══════════════════════════════════════

function pubBuildFullHtml(b,author,pk,item,nature,movesMeta,sf,likeData){
  var name=b.name||(pk?pk.name:'Unnamed build');
  var isShiny=!!b.is_shiny;
  var spriteUrl=pk?(isShiny&&pk.shiny_url?pk.shiny_url:pk.image_url):'';
  var spriteHtml=spriteUrl?'<img class="pub-sprite" src="'+pubEscape(spriteUrl)+'" alt="'+pubEscape(pk.name||'')+'">':'';
  var shinyBadge=isShiny?'<div class="pub-shiny-badge"><span class="star">✦</span><span>SHINY</span></div>':'';
  var glow=pubGlowStyle(pk);
  var cardClass='pub-card'+(isShiny?' shiny':'');

  // Meta chips row: format + archetype (both always-shared)
  var metaChips='';
  if(b.battle_format)metaChips+='<span class="pub-meta-chip"><strong>'+pubEscape(b.battle_format)+'</strong></span>';
  if(b.archetype)metaChips+='<span class="pub-meta-chip">'+pubEscape(b.archetype)+'</span>';

  // Ability + Nature in 2-col grid
  var abilityCard='';
  if(sf.ability){
    var abilityVal=b.ability&&b.ability.trim()?b.ability.trim():'—';
    abilityCard=pubInfoCard('Ability',abilityVal,'');
  }
  var natureCard=pubNatureCard(nature); // Nature always shared

  var infoGridHtml='';
  if(sf.ability){
    infoGridHtml='<div class="pub-section"><div class="pub-2col">'+abilityCard+natureCard+'</div></div>';
  }else{
    // Just nature, full-width
    infoGridHtml='<div class="pub-section"><div class="pub-section-head">Nature</div><div class="pub-info-row" style="display:flex;flex-direction:column;gap:.15rem;align-items:flex-start"><div class="val" style="font-size:.88rem;color:var(--text);font-weight:700">'+pubEscape(nature?nature.name:'—')+'</div>'+(nature?'<div class="val-sub" style="display:flex;gap:.35rem;font-size:.66rem">'+(nature.increased_stat!==nature.decreased_stat?'<span class="nat-up" style="color:var(--green);font-weight:800">▲ '+pubStatShort(nature.increased_stat)+'</span> <span class="nat-down" style="color:#fb7185;font-weight:800">▼ '+pubStatShort(nature.decreased_stat)+'</span>':'<span>Neutral</span>')+'</div>':'')+'</div></div>';
  }

  // Item row (if toggle on)
  var itemSectionHtml='';
  if(sf.item){
    itemSectionHtml=
      '<div class="pub-section">'+
        '<div class="pub-section-head">Held Item</div>'+
        pubItemRow(item)+
      '</div>';
  }

  // Stats section — full parity with in-app: bars/hex toggle + per-stat SP tags
  var statsSectionHtml='';
  if(sf.stats){
    var sp={hp_sp:b.hp_sp||0,atk_sp:b.atk_sp||0,def_sp:b.def_sp||0,spa_sp:b.spa_sp||0,spd_sp:b.spd_sp||0,spe_sp:b.spe_sp||0};
    statsSectionHtml=
      '<div class="pub-section">'+
        '<div class="pub-section-head">Stat Allocation <span class="sub">· Lv 50</span></div>'+
        pubStatsSection(pk,sp,nature)+
      '</div>';
  }

  // Moves section
  var movesSectionHtml='';
  if(sf.moves){
    var moveNames=[b.move_1,b.move_2,b.move_3,b.move_4];
    movesSectionHtml=
      '<div class="pub-section">'+
        '<div class="pub-section-head">Moves</div>'+
        pubMoveCards(moveNames,movesMeta)+
      '</div>';
  }

  return (
    '<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
    '<div class="scroll-area">'+
      '<div class="pub-hero">'+
        '<div class="'+cardClass+'">'+
          (glow?'<div class="pub-glow" style="'+glow+'"></div>':'<div class="pub-glow"></div>')+
          '<div class="pub-sprite-wrap">'+
            spriteHtml+
            shinyBadge+
          '</div>'+
          pubTypeChips(pk)+
          '<div class="pub-name">'+pubEscape(name)+'</div>'+
          '<div class="pub-author">'+pubByline(author)+'</div>'+
          (metaChips?'<div class="pub-meta-row">'+metaChips+'</div>':'')+
        '</div>'+
      '</div>'+
      infoGridHtml+
      itemSectionHtml+
      statsSectionHtml+
      movesSectionHtml+
      pubSocialRowHtml('build',likeData)+
    '</div>'+
    pubCtaHtml()
  );
}

function pubTeamFullHtml(t,author,members,sf,likeData){
  var rosterSize=Math.max(members.length,Math.min(6,t.roster_size||6));
  var visibleMembers=members.slice(0,rosterSize);
  var memberCardsHtml='';
  visibleMembers.forEach(function(m){
    var spriteUrl=m.is_shiny&&m.shiny_url?m.shiny_url:m.image_url;
    var sprite=spriteUrl?'<img class="pt-mem-sprite" src="'+pubEscape(spriteUrl)+'" alt="'+pubEscape(m.pk_name||'')+'">':'';
    var t1=m.type_1,t2=m.type_2;
    var typeChips='<div class="pt-mem-types">';
    if(t1&&TC[t1])typeChips+='<span class="pt-mem-type-chip" style="background:linear-gradient(135deg,'+TC[t1].m+','+TC[t1].d+')">'+pubEscape(t1)+'</span>';
    if(t2&&TC[t2])typeChips+='<span class="pt-mem-type-chip" style="background:linear-gradient(135deg,'+TC[t2].m+','+TC[t2].d+')">'+pubEscape(t2)+'</span>';
    typeChips+='</div>';

    // Corner badge: arrow-up-right for tappable (public member build), lock for private
    var isTappable=m.build_is_public&&m.build_share_code;
    var cornerBadge=isTappable
      ?'<div class="pt-mem-link" title="Tap to view this build"><i class="ph-bold ph-arrow-up-right"></i></div>'
      :'<div class="pt-mem-lock" title="Build not shared individually"><i class="ph-bold ph-lock"></i></div>';
    var onclickAttr=isTappable?' onclick="location.hash=\'#/b/'+pubEscape(m.build_share_code)+'\'"':'';
    var cardClass='pt-mem'+(isTappable?' tappable':' private');

    memberCardsHtml+=(
      '<div class="'+cardClass+'"'+onclickAttr+'>'+
        cornerBadge+
        sprite+
        '<div class="pt-mem-name">'+pubEscape(m.pk_name||'—')+'</div>'+
        typeChips+
      '</div>'
    );
  });
  for(var i=visibleMembers.length;i<rosterSize;i++){
    memberCardsHtml+='<div class="pt-mem pt-mem-empty-slot"><span class="pt-mem-empty-icon">+</span></div>';
  }
  if(!memberCardsHtml){
    memberCardsHtml='<div class="pt-empty">No members</div>';
  }

  // Type coverage — only if toggle enabled
  var coverageHtml=sf.type_coverage?pubTeamCoverageHtml(members):'';

  return (
    '<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
    '<div class="scroll-area">'+
      '<div class="pt-hero">'+
        '<div class="pt-hero-card">'+
          '<div class="pt-hero-glow"></div>'+
          '<span class="pt-hero-emoji">🏆</span>'+
          '<div class="pt-hero-name">'+pubEscape(t.name||'Unnamed team')+'</div>'+
          '<div class="pt-hero-meta">'+
            (t.format?'<span class="pt-hero-chip"><strong>'+pubEscape(t.format)+'</strong></span>':'')+
            '<span class="pt-hero-chip">'+visibleMembers.length+' member'+(visibleMembers.length===1?'':'s')+'</span>'+
          '</div>'+
          '<div class="pub-author">'+pubByline(author)+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="pub-section">'+
        '<div class="pub-section-head"><span>Roster</span><span class="count">'+visibleMembers.length+' / '+rosterSize+'</span></div>'+
        '<div class="pt-roster">'+memberCardsHtml+'</div>'+
      '</div>'+
      coverageHtml+
      pubSocialRowHtml('team',likeData)+
    '</div>'+
    pubCtaHtml('team')
  );
}

function pubNotFoundHtml(kind){
  var label=kind.charAt(0).toUpperCase()+kind.slice(1);
  return (
    '<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
    '<div class="pub-wrap">'+
      '<div class="pub-card">'+
        '<div class="pub-404">🔎</div>'+
        '<div class="pub-name">'+label+' not found</div>'+
        '<div class="pub-author" style="margin-bottom:0">This link may be private or no longer exist</div>'+
      '</div>'+
    '</div>'+
    '<button class="pub-cta" onclick="pubBackToApp()"><span>Back to app</span><span class="cta-arrow">→</span></button>'
  );
}

function pubErrorHtml(kind,msg){
  return (
    '<div class="pub-brand"><div class="pub-brand-mark">⚡</div><span>Champions Forge</span></div>'+
    '<div class="pub-wrap">'+
      '<div class="pub-card">'+
        '<div class="pub-404">⚠️</div>'+
        '<div class="pub-name">Failed to load '+pubEscape(kind)+'</div>'+
        '<div class="pub-author" style="margin-bottom:0">'+pubEscape(msg)+'</div>'+
      '</div>'+
    '</div>'+
    '<button class="pub-cta" onclick="pubBackToApp()"><span>Back to app</span><span class="cta-arrow">→</span></button>'
  );
}

function pubCtaHtml(kind){
  // Signed-out visitors: "Create your build/team" (signup CTA).
  // Signed-in viewers: "Back to my app".
  var label=kind==='team'?'Create your team':'Create your build';
  if(usr){
    return '<button class="pub-cta" onclick="pubBackToApp()"><span>Back to my app</span><span class="cta-arrow">→</span></button>';
  }
  return '<button class="pub-cta" onclick="pubSignupCta()"><span>'+label+'</span><span class="cta-arrow">→</span></button>';
}

function pubSignupCta(){
  if(usr){pubBackToApp();return}
  authMode='signup';
  if(typeof showLoginModal==='function')showLoginModal('Sign up to create and share your own competitive Pokémon builds.');
}

// ═══════════════════════════════════════
// SOCIAL ROW HELPERS (Drop F.3)
// Likes + Copy-to-my-builds/teams on public detail views.
// Visible only to signed-in viewers who are NOT the content owner.
// ═══════════════════════════════════════

function pubSocialRowHtml(kind,likeData){
  // Only show for signed-in users viewing someone else's content
  if(!usr||!likeData)return '';
  if(usr.id===likeData.ownerId)return '';
  var liked=likeData.liked;
  var count=likeData.count;
  var id=likeData.id;
  var heartFill=liked?'#ef4444':'none';
  var heartStroke=liked?'#ef4444':'currentColor';
  var likedClass=liked?' liked':'';
  var heartSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="'+heartFill+'" stroke="'+heartStroke+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  var copySvg='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  var copyLabel=kind==='team'?'Copy to my teams':'Copy to my builds';
  var toggleFn=kind==='team'?'toggleTeamLike':'toggleBuildLike';
  var copyFn=kind==='team'?'copyTeam':'copyBuild';
  return (
    '<div class="pub-social-row">'+
      '<button class="like-btn'+likedClass+'" id="pub-like-btn" onclick="'+toggleFn+'(\''+pubEscape(id)+'\')" aria-label="'+(liked?'Unlike':'Like')+'">'+
        heartSvg+
        '<span id="pub-like-cnt">'+count+'</span>'+
      '</button>'+
      '<button class="copy-btn" id="pub-copy-btn" onclick="'+copyFn+'(\''+pubEscape(id)+'\')">'+
        copySvg+
        copyLabel+
      '</button>'+
    '</div>'
  );
}

// Apply liked/unliked visual state to the like button (used for optimistic updates + rollback)
function _applyLikeState(btn,cnt,liked,count){
  if(!btn||!cnt)return;
  btn.classList.toggle('liked',liked);
  var svg=btn.querySelector('svg');
  if(svg){svg.setAttribute('fill',liked?'#ef4444':'none');svg.setAttribute('stroke',liked?'#ef4444':'currentColor');}
  cnt.textContent=count;
}

async function toggleBuildLike(id){
  if(!usr){if(typeof showLoginModal==='function')showLoginModal('Sign in to like builds.');return;}
  var btn=document.getElementById('pub-like-btn');
  var cnt=document.getElementById('pub-like-cnt');
  if(!btn||!cnt)return;
  var isLiked=btn.classList.contains('liked');
  var count=parseInt(cnt.textContent)||0;
  var newLiked=!isLiked;
  var newCount=isLiked?count-1:count+1;
  _applyLikeState(btn,cnt,newLiked,newCount);
  btn.classList.add('pop');setTimeout(function(){btn.classList.remove('pop');},300);
  try{
    if(newLiked){
      var u=new URL(API+'/rest/v1/build_likes');
      u.searchParams.set('on_conflict','user_id,build_id');
      var r=await authFetch(u.toString(),{method:'POST',headers:Object.assign(h(true),{'Prefer':'return=minimal,resolution=ignore-duplicates'}),body:JSON.stringify({user_id:usr.id,build_id:id})},true);
      if(!r.ok&&r.status!==409)throw new Error(r.status);
    }else{
      await rm('build_likes',{'user_id':'eq.'+usr.id,'build_id':'eq.'+id},true);
    }
  }catch(e){
    _applyLikeState(btn,cnt,isLiked,count);
    toast('Could not update like','err');
  }
}

async function toggleTeamLike(id){
  if(!usr){if(typeof showLoginModal==='function')showLoginModal('Sign in to like teams.');return;}
  var btn=document.getElementById('pub-like-btn');
  var cnt=document.getElementById('pub-like-cnt');
  if(!btn||!cnt)return;
  var isLiked=btn.classList.contains('liked');
  var count=parseInt(cnt.textContent)||0;
  var newLiked=!isLiked;
  var newCount=isLiked?count-1:count+1;
  _applyLikeState(btn,cnt,newLiked,newCount);
  btn.classList.add('pop');setTimeout(function(){btn.classList.remove('pop');},300);
  try{
    if(newLiked){
      var u=new URL(API+'/rest/v1/team_likes');
      u.searchParams.set('on_conflict','user_id,team_id');
      var r=await authFetch(u.toString(),{method:'POST',headers:Object.assign(h(true),{'Prefer':'return=minimal,resolution=ignore-duplicates'}),body:JSON.stringify({user_id:usr.id,team_id:id})},true);
      if(!r.ok&&r.status!==409)throw new Error(r.status);
    }else{
      await rm('team_likes',{'user_id':'eq.'+usr.id,'team_id':'eq.'+id},true);
    }
  }catch(e){
    _applyLikeState(btn,cnt,isLiked,count);
    toast('Could not update like','err');
  }
}

async function copyBuild(id){
  if(!usr){if(typeof showLoginModal==='function')showLoginModal('Sign in to copy builds.');return;}
  var btn=document.getElementById('pub-copy-btn');
  var origHtml=btn?btn.innerHTML:'';
  if(btn){btn.disabled=true;btn.textContent='Copying…';}
  try{
    var rows=await q('builds',{id:'eq.'+id,is_public:'eq.true',select:'name,pokemon_id,is_shiny,battle_format,archetype,ability,item_id,nature_id,move_1,move_2,move_3,move_4,hp_sp,atk_sp,def_sp,spa_sp,spd_sp,spe_sp,share_fields'},!!tk);
    if(!rows||!rows.length)throw new Error('Build not found');
    var orig=rows[0];
    var newBuild={
      user_id:usr.id,
      name:(orig.name||'Build')+' (copied)',
      pokemon_id:orig.pokemon_id,
      is_shiny:orig.is_shiny||false,
      battle_format:orig.battle_format||null,
      archetype:orig.archetype||null,
      ability:orig.ability||null,
      item_id:orig.item_id||null,
      nature_id:orig.nature_id||null,
      move_1:orig.move_1||null,
      move_2:orig.move_2||null,
      move_3:orig.move_3||null,
      move_4:orig.move_4||null,
      hp_sp:orig.hp_sp||0,atk_sp:orig.atk_sp||0,def_sp:orig.def_sp||0,
      spa_sp:orig.spa_sp||0,spd_sp:orig.spd_sp||0,spe_sp:orig.spe_sp||0,
      share_fields:orig.share_fields||null,
      is_public:false,is_favourite:false
    };
    var result=await ins('builds',newBuild,true);
    if(result&&result[0])allBuilds.unshift(result[0]);
    if(btn){btn.disabled=false;btn.textContent='✓ Copied!';btn.style.color='#10b981';}
    toast('Build copied to your collection');
  }catch(e){
    toast(e.message||'Could not copy build','err');
    if(btn){btn.disabled=false;btn.innerHTML=origHtml;btn.style.color='';}
  }
}

async function copyTeam(id){
  if(!usr){if(typeof showLoginModal==='function')showLoginModal('Sign in to copy teams.');return;}
  var btn=document.getElementById('pub-copy-btn');
  var origHtml=btn?btn.innerHTML:'';
  if(btn){btn.disabled=true;btn.textContent='Copying…';}
  try{
    var results=await Promise.all([
      q('teams',{id:'eq.'+id,is_public:'eq.true',select:'name,format,share_fields'},!!tk),
      q('team_builds',{team_id:'eq.'+id,select:'build_id,slot_position',order:'slot_position.asc'},!!tk)
    ]);
    var teamRows=results[0],memberRows=results[1];
    if(!teamRows||!teamRows.length)throw new Error('Team not found');
    var orig=teamRows[0];
    var newTeam={user_id:usr.id,name:(orig.name||'Team')+' (copied)',format:orig.format||null,is_public:false};
    var teamResult=await ins('teams',newTeam,true);
    if(!teamResult||!teamResult[0])throw new Error('Could not create team copy');
    var newTeamId=teamResult[0].id;
    if(memberRows&&memberRows.length){
      var tbInserts=memberRows.map(function(m){return{team_id:newTeamId,build_id:m.build_id,slot_position:m.slot_position};});
      await ins('team_builds',tbInserts,true);
    }
    allTeams.unshift(teamResult[0]);
    if(btn){btn.disabled=false;btn.textContent='✓ Copied!';btn.style.color='#10b981';}
    toast('Team copied to your collection');
  }catch(e){
    toast(e.message||'Could not copy team','err');
    if(btn){btn.disabled=false;btn.innerHTML=origHtml;btn.style.color='';}
  }
}

// ═══════════════════════════════════════
// SHARE HELPERS (Drop F.2)
// Used by build/team detail pills and the editor share cards.
// Exposed globally so any view can call them.
// ═══════════════════════════════════════

// Build the absolute share URL for a given kind + code.
// kind: 'build' | 'team'
function buildShareUrl(kind,code){
  if(!code)return '';
  var base=location.origin+location.pathname.replace(/\/index\.html$/,'/');
  if(!base.endsWith('/'))base+='/';
  return base+'#/'+(kind==='team'?'t':'b')+'/'+code;
}

// Web Share API with clipboard fallback.
// Returns a promise that resolves when the share completes (or is silently
// cancelled by the user dismissing the share sheet — that's not an error).
async function shareOrCopy(url,title,text){
  if(!url){toast('Nothing to share','err');return}
  // Prefer Web Share API when available (mobile Safari, Chrome on Android, etc.)
  if(navigator.share){
    try{
      await navigator.share({title:title||'Champions Forge',text:text||'',url:url});
      return;
    }catch(e){
      // AbortError = user cancelled the share sheet. Not actually an error.
      if(e&&e.name==='AbortError')return;
      // Other errors fall through to clipboard fallback below
      console.log('navigator.share failed, falling back:',e);
    }
  }
  // Clipboard fallback
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
    }else{
      var ta=document.createElement('textarea');
      ta.value=url;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.focus();ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast('Link copied to clipboard');
  }catch(_){
    toast('Copy failed — select the URL manually','err');
  }
}

// Simple clipboard copy with toast (used by Copy-only buttons)
async function copyUrl(url){
  if(!url)return;
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
    }else{
      var ta=document.createElement('textarea');
      ta.value=url;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.focus();ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast('Link copied');
  }catch(_){toast('Copy failed','err')}
}

function pubBackToApp(){
  // Clear the hash — router's hashchange listener picks this up and hides the public page.
  if(history&&history.replaceState){
    history.replaceState(null,'',location.pathname+location.search);
    handleHashRoute();
  }else{
    location.hash='';
  }
}

// ═══════════════════════════════════════
// IMAGE CARD RENDERER (Drop F.2.1)
// Renders 1200×630 PNG via html2canvas + hidden off-screen DOM.
// Triggered from editor/detail Share button. Uses Web Share API with files
// when available (mobile: gives user Save to Camera Roll / AirDrop / Messages
// / Discord / etc.); falls back to download + URL clipboard copy on desktop.
// ═══════════════════════════════════════

// Feature detection — Web Share Level 2 with file attachments
function canShareFiles(testFile){
  if(!navigator.share||!navigator.canShare)return false;
  try{return navigator.canShare({files:[testFile]})}catch(_){return false}
}

// Drop F.2.1 v7: localStorage sprite cache — first share of a Pokémon is slow
// (fetches through CORS proxy), subsequent shares are instant.
// Max ~4MB cache; oldest half evicted when over quota.
var SPRITE_CACHE_KEY='champions_sprite_cache_v1';
var SPRITE_CACHE_MAX=4*1024*1024;

function readSpriteCache(){
  try{return JSON.parse(localStorage.getItem(SPRITE_CACHE_KEY)||'{}')}
  catch(_){return{}}
}
function writeSpriteCache(cache){
  try{
    var serialized=JSON.stringify(cache);
    if(serialized.length>SPRITE_CACHE_MAX){
      // Simple LRU-ish eviction: drop oldest half of entries (insertion-ordered keys)
      var keys=Object.keys(cache);
      for(var i=0;i<Math.floor(keys.length/2);i++)delete cache[keys[i]];
      serialized=JSON.stringify(cache);
    }
    localStorage.setItem(SPRITE_CACHE_KEY,serialized);
  }catch(_){/* quota or private mode — silently skip */}
}

// Fetch an image URL and return a data: URL. Multiple strategies to deal with
// CORS: cache → direct fetch → corsproxy.io → allorigins.win → transparent 1×1.
// Logs loudly on failure so DevTools can show what broke.
async function spriteToDataUrl(url){
  if(!url)return '';
  if(url.startsWith('data:'))return url;

  // Check localStorage cache first (instant on subsequent shares)
  var cache=readSpriteCache();
  if(cache[url])return cache[url];

  async function fetchToDataUrl(u,label){
    var r=await fetch(u,{mode:'cors',cache:'force-cache'});
    if(!r.ok)throw new Error(label+' status '+r.status);
    var blob=await r.blob();
    // Reject non-image blobs (e.g. proxy returns HTML error page)
    if(blob.type&&blob.type.indexOf('image/')!==0&&blob.type.indexOf('application/octet-stream')!==0){
      throw new Error(label+' wrong mime: '+blob.type);
    }
    return await new Promise(function(res,rej){
      var fr=new FileReader();
      fr.onload=function(){res(fr.result)};
      fr.onerror=function(){rej(new Error(label+' FileReader error'))};
      fr.readAsDataURL(blob);
    });
  }

  function cacheAndReturn(dataUrl){
    cache[url]=dataUrl;
    writeSpriteCache(cache);
    return dataUrl;
  }

  // 1) Direct fetch — works for GitHub (PokeAPI items), etc.
  try{return cacheAndReturn(await fetchToDataUrl(url,'direct'))}catch(e1){
    console.log('[spriteToDataUrl] direct failed for',url,'→',e1.message);
  }

  // 2) CORS proxy #1 — corsproxy.io
  try{
    var proxied1='https://corsproxy.io/?'+encodeURIComponent(url);
    return cacheAndReturn(await fetchToDataUrl(proxied1,'corsproxy.io'));
  }catch(e2){
    console.log('[spriteToDataUrl] corsproxy.io failed for',url,'→',e2.message);
  }

  // 3) CORS proxy #2 — allorigins.win
  try{
    var proxied2='https://api.allorigins.win/raw?url='+encodeURIComponent(url);
    return cacheAndReturn(await fetchToDataUrl(proxied2,'allorigins'));
  }catch(e3){
    console.log('[spriteToDataUrl] allorigins failed for',url,'→',e3.message);
  }

  // 4) CORS proxy #3 — codetabs
  try{
    var proxied3='https://api.codetabs.com/v1/proxy/?quest='+encodeURIComponent(url);
    return cacheAndReturn(await fetchToDataUrl(proxied3,'codetabs'));
  }catch(e4){
    console.log('[spriteToDataUrl] codetabs failed for',url,'→',e4.message);
  }

  // 5) Last resort: transparent 1×1 so the render doesn't abort visibly
  console.warn('[spriteToDataUrl] ALL strategies failed for',url,'- rendering blank');
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
}

// Wait for every <img> inside a container to finish loading (success or error).
// html2canvas can fire before large data-URL images have decoded — without this
// wait, sprites render as zero-size in the captured PNG.
async function waitForImages(root){
  if(!root)return;
  var imgs=root.querySelectorAll('img');
  await Promise.all(Array.prototype.map.call(imgs,function(img){
    return new Promise(function(resolve){
      if(img.complete&&img.naturalWidth>0)return resolve();
      var done=false;
      function finish(){if(done)return;done=true;resolve()}
      img.addEventListener('load',finish,{once:true});
      img.addEventListener('error',finish,{once:true});
      // Safety timeout — don't hang forever if an image never resolves
      setTimeout(finish,4000);
    });
  }));
  // Extra rAF so layout + paint have a chance to flush before html2canvas reads
  await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})});
}

// Slug a pokemon/team name for use as a filename
function slugify(s){
  return (s||'share').toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'share';
}

// Convert type list to radial gradient stops for team member glow
function imgcardGlowGradient(type1,type2){
  if(!type1||!TC[type1])return 'radial-gradient(circle,#888 0%,transparent 85%)';
  var c1=TC[type1].m;
  var c2=type2&&TC[type2]?TC[type2].m:c1;
  return 'radial-gradient(circle,'+c1+' 0%,'+c2+' 65%,transparent 85%)';
}

// Build image card HTML (1200×630) for a single build
function buildImageHtml(b,pk,item,nature,movesMeta,author,spriteDataUrl,itemDataUrl){
  var spObj={
    hp:(b.hp_sp||0),atk:(b.atk_sp||0),def:(b.def_sp||0),
    spa:(b.spa_sp||0),spd:(b.spd_sp||0),spe:(b.spe_sp||0)
  };
  var stats=(typeof bsGetCalcStatsFor==='function')?bsGetCalcStatsFor(pk,spObj,nature):['hp','atk','def','spa','spd','spe'].map(function(k){
    var cols={hp:'base_hp',atk:'base_atk',def:'base_def',spa:'base_spa',spd:'base_spd',spe:'base_spe'};
    var base=pk[cols[k]]||0;var spVal=spObj[k];
    return{key:k,base:base,sp:spVal,calc:pubCalcStat(k,base,spVal,nature),natMod:1};
  });
  var statMap={};stats.forEach(function(s){statMap[s.key]=s});

  var movesHtml=[b.move_1,b.move_2,b.move_3,b.move_4].filter(function(m){return m&&m.trim()}).map(function(name){
    var meta=movesMeta[name]||null;
    var type=meta?meta.type:'Normal';
    var cat=(meta?meta.category:'')||'';
    var pow=meta?((meta.champions_power!=null?meta.champions_power:meta.power)||0):0;
    var prio=meta?(meta.priority||0):0;
    var catShort=cat.toLowerCase()==='physical'?'PHY':cat.toLowerCase()==='special'?'SPC':cat.toLowerCase()==='status'?'STATUS':'—';
    var footRight='';
    if(catShort==='STATUS'){
      var desc=meta?(meta.short_description||''):'';
      var sm=desc.match(/Raises? the user's ([A-Za-z]+)(?:\s+and\s+([A-Za-z]+))?/i);
      footRight=sm?('+'+sm[1].substring(0,3)+(sm[2]?'/'+sm[2].substring(0,3):'')):(desc?(desc.length>18?desc.substring(0,16)+'…':desc):'—');
    }else{
      if(pow>0){footRight=pow+' BP'+(prio?' · '+(prio>0?'+':'')+prio+' prio':'')}
      else if(prio){footRight=(prio>0?'+':'')+prio+' prio'}
      else footRight='—';
    }
    return (
      '<div class="imgcard-move imgcard-t-'+pubEscape(type)+'">'+
        '<div class="imgcard-move-name">'+pubEscape(name)+'</div>'+
        '<div class="imgcard-move-meta"><span class="imgcard-move-cat">'+catShort+'</span><span>'+pubEscape(footRight)+'</span></div>'+
      '</div>'
    );
  }).join('');

  var typesHtml='';
  if(pk&&pk.type_1){
    typesHtml+='<span class="imgcard-type-chip imgcard-t-'+pubEscape(pk.type_1)+'">'+pubEscape(pk.type_1)+'</span>';
    if(pk.type_2)typesHtml+='<span class="imgcard-type-chip imgcard-t-'+pubEscape(pk.type_2)+'">'+pubEscape(pk.type_2)+'</span>';
  }

  var shinyBadge=b.is_shiny?'<div class="imgcard-shiny-badge"><span>✦</span><span>SHINY</span></div>':'';
  var metaChips='';
  if(b.battle_format)metaChips+='<span class="imgcard-meta-chip">'+pubEscape(b.battle_format)+'</span>';
  if(b.archetype)metaChips+='<span class="imgcard-meta-chip">'+pubEscape(b.archetype)+'</span>';
  if(nature&&nature.name&&b.ability)metaChips+='<span class="imgcard-meta-chip">'+pubEscape(nature.name)+' · '+pubEscape(b.ability)+'</span>';
  else if(nature&&nature.name)metaChips+='<span class="imgcard-meta-chip">'+pubEscape(nature.name)+'</span>';
  else if(b.ability)metaChips+='<span class="imgcard-meta-chip">'+pubEscape(b.ability)+'</span>';

  var itemRowHtml='';
  if(item&&item.name){
    var itemImg=itemDataUrl?'<img class="imgcard-item-sprite" src="'+itemDataUrl+'" alt="">':'';
    itemRowHtml=
      '<div class="imgcard-item-row">'+
        itemImg+
        '<span class="imgcard-item-lbl">Item</span>'+
        '<span class="imgcard-item-text">'+pubEscape(item.name)+'</span>'+
      '</div>';
  }

  var authorInitial=(author&&author.username)?author.username.charAt(0).toUpperCase():'?';
  var authorHandle=author&&author.username?author.username:'anon';
  var url=buildShareUrl('build',b.share_code);

  function statTile(key,label){
    var s=statMap[key]||{calc:0,sp:0};
    var spCls=s.sp>0?'':' zero';
    return (
      '<div class="imgcard-stat imgcard-s-'+key+'">'+
        '<div class="imgcard-stat-lbl">'+label+'</div>'+
        '<div class="imgcard-stat-val">'+s.calc+'</div>'+
        '<div class="imgcard-stat-sp'+spCls+'">+'+s.sp+'</div>'+
      '</div>'
    );
  }

  return (
    '<div class="imgcard imgcard-bc">'+
      '<div class="imgcard-brand"><div class="imgcard-brand-mk">⚡</div><span>Champions Forge</span></div>'+
      '<div class="imgcard-author"><div class="imgcard-author-ava">'+pubEscape(authorInitial)+'</div><span>@'+pubEscape(authorHandle)+'</span></div>'+
      '<div class="imgcard-slotnum">01</div>'+
      '<div class="imgcard-bc-card">'+
        '<div class="imgcard-bc-left">'+
          '<div class="imgcard-sprite-wrap">'+
            '<div class="imgcard-sprite-glow"></div>'+
            (spriteDataUrl?'<img src="'+spriteDataUrl+'" alt="">':'')+
            shinyBadge+
          '</div>'+
          '<div class="imgcard-types">'+typesHtml+'</div>'+
          '<div class="imgcard-species">'+pubEscape(pk?pk.name:'')+'</div>'+
          itemRowHtml+
        '</div>'+
        '<div class="imgcard-bc-right">'+
          '<div>'+
            '<div class="imgcard-bc-kicker">Build</div>'+
            '<div class="imgcard-bc-title">'+pubEscape(b.name||'')+'</div>'+
            '<div class="imgcard-bc-meta-row">'+metaChips+'</div>'+
          '</div>'+
          '<div class="imgcard-bc-moves-sh">Moveset</div>'+
          '<div class="imgcard-bc-moves">'+movesHtml+'</div>'+
          '<div class="imgcard-bc-stats-sh">Stat Spread · Lv 50</div>'+
          '<div class="imgcard-bc-stats">'+
            statTile('hp','HP')+statTile('atk','Atk')+statTile('def','Def')+
            statTile('spa','SpA')+statTile('spd','SpD')+statTile('spe','Spe')+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="imgcard-url">'+pubEscape(url.replace(/^https?:\/\//,''))+'</div>'+
    '</div>'
  );
}

// Team image card HTML (1200×630)
function teamImageHtml(t,members,author,memberSpriteUrls,memberItemUrls){
  var rosterSize=Math.max(members.length,Math.min(6,t.roster_size||6));
  var visibleMembers=members.slice(0,rosterSize);
  var memHtml=visibleMembers.map(function(m,idx){
    var spriteUrl=memberSpriteUrls[m.build_id]||'';
    var itemUrl=memberItemUrls[m.build_id]||'';
    var spriteImg=spriteUrl?'<img class="tc-mem-sprite" src="'+spriteUrl+'" alt="">':'';
    var shinyBadge=m.is_shiny?'<div class="tc-mem-shiny">✦</div>':'';
    var typeChips='';
    if(m.type_1)typeChips+='<span class="tc-mem-type-chip imgcard-t-'+pubEscape(m.type_1)+'">'+pubEscape(m.type_1)+'</span>';
    if(m.type_2)typeChips+='<span class="tc-mem-type-chip imgcard-t-'+pubEscape(m.type_2)+'">'+pubEscape(m.type_2)+'</span>';
    var glowBg=imgcardGlowGradient(m.type_1,m.type_2);
    var moves=[m.move_1,m.move_2,m.move_3,m.move_4].filter(function(x){return x&&x.trim()});
    var moveHtml=moves.map(function(mv){
      var meta=m.movesMeta?m.movesMeta[mv]:null;
      var type=meta?meta.type:'Normal';
      return '<div class="tc-mem-move imgcard-t-'+pubEscape(type)+'"><div class="tc-mem-move-name">'+pubEscape(mv)+'</div></div>';
    }).join('');
    var itemRow='';
    if(m.item_name){
      var itemImg=itemUrl?'<img class="tc-mem-item-sprite" src="'+itemUrl+'" alt="">':'';
      itemRow=
        '<div class="tc-mem-item-row">'+
          itemImg+
          '<span class="tc-mem-item-name">'+pubEscape(m.item_name)+'</span>'+
        '</div>';
    }
    return (
      '<div class="tc-mem">'+
        '<div class="tc-mem-slot">'+(idx+1)+'</div>'+
        '<div class="tc-mem-top">'+
          '<div class="tc-mem-sprite-wrap">'+
            '<div class="tc-mem-sprite-glow" style="background:'+glowBg+'"></div>'+
            spriteImg+
            shinyBadge+
          '</div>'+
          '<div class="tc-mem-name">'+pubEscape(m.pk_name||'—')+'</div>'+
          '<div class="tc-mem-types">'+typeChips+'</div>'+
        '</div>'+
        '<div class="tc-mem-middle">'+
          (m.ability?'<div class="tc-mem-ability">'+pubEscape(m.ability)+'</div>':'')+
          (m.archetype?'<div class="tc-mem-archetype">'+pubEscape(m.archetype)+'</div>':'')+
          itemRow+
        '</div>'+
        '<div class="tc-mem-moves">'+moveHtml+'</div>'+
      '</div>'
    );
  }).join('');
  for(var i=visibleMembers.length;i<rosterSize;i++){
    memHtml+='<div class="tc-mem tc-mem-empty"><span class="tc-mem-empty-icon">+</span></div>';
  }

  // Team Identity
  var _tcThemeColors={Crimson:'#ef4444',Ocean:'#3b82f6',Storm:'#8b5cf6',Forest:'#22c55e',Gold:'#f59e0b',Shadow:'#64748b',Frost:'#06b6d4',Ember:'#f97316'};
  var tcThemeCol=t.team_theme&&_tcThemeColors[t.team_theme]?_tcThemeColors[t.team_theme]:null;
  var tcIconEl=t.team_icon?'<span style="font-size:22px;margin-right:7px;line-height:1;vertical-align:middle">'+pubEscape(t.team_icon)+'</span>':'';
  var tcArchEl=t.team_archetype?'<span class="imgcard-tc-arch-chip">'+pubEscape(t.team_archetype)+'</span>':'';
  var tcThemeOverlay=tcThemeCol?'<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 20%,'+tcThemeCol+'38 0%,transparent 55%);pointer-events:none;z-index:0"></div>':'';

  var authorHandle=author&&author.username?author.username:'anon';
  var url=buildShareUrl('team',t.share_code);

  return (
    '<div class="imgcard imgcard-tc">'+
      tcThemeOverlay+
      '<div class="imgcard-brand"><div class="imgcard-brand-mk">⚡</div><span>Champions Forge</span></div>'+
      '<div class="imgcard-tc-team-head">'+
        '<div class="imgcard-tc-team-name">'+tcIconEl+pubEscape(t.name||'Unnamed team')+'</div>'+
        '<div class="imgcard-tc-team-meta">'+
          (t.format?'<span class="imgcard-tc-team-chip">'+pubEscape(t.format)+'</span>':'')+
          tcArchEl+
          '<span>'+visibleMembers.length+' / '+rosterSize+' · by <strong style="color:#fff">@'+pubEscape(authorHandle)+'</strong></span>'+
        '</div>'+
      '</div>'+
      '<div class="imgcard-tc-grid">'+memHtml+'</div>'+
      '<div class="imgcard-url">'+pubEscape(url.replace(/^https?:\/\//,''))+'</div>'+
    '</div>'
  );
}

// Orchestrator: build HTML, preload sprites as data URLs, html2canvas capture,
// convert to PNG, and either native-share or download.
async function shareImageClientSide(kind,id){
  // Drop F.2.1 v5: swapped html2canvas → html-to-image (better filter/blur support,
  // uses SVG foreignObject rasterization). Feature-detect by checking either global.
  var renderer=window.htmlToImage||window.html2canvas?(window.htmlToImage?'htmlToImage':'html2canvas'):null;
  if(!renderer){
    toast('Image renderer still loading, try again in a moment','err');
    return;
  }
  var host=document.getElementById('imgRenderHost');
  if(!host){
    toast('Render host missing','err');
    return;
  }
  toast('Generating image…','info');

  try{
    var needsAuth=!!tk;
    var html='',filename='',shareTitle='',shareUrl='';

    if(kind==='build'){
      // Look up locally first, otherwise fetch
      var b=allBuilds?allBuilds.find(function(x){return x.id===id}):null;
      if(!b){
        var rows=await q('builds',{id:'eq.'+id,select:'id,name,user_id,pokemon_id,is_shiny,battle_format,archetype,ability,item_id,nature_id,move_1,move_2,move_3,move_4,hp_sp,atk_sp,def_sp,spa_sp,spd_sp,spe_sp,share_fields,share_code'},true);
        b=rows&&rows[0];
      }
      if(!b){toast('Build not found','err');return}

      // Normalize shape (local view uses build_name, raw row uses name)
      if(!b.name&&b.build_name)b.name=b.build_name;

      // Fetch pokemon/item/nature/moves in parallel
      var pkP=q('pokemon',{id:'eq.'+b.pokemon_id,select:'id,name,type_1,type_2,image_url,shiny_url,is_mega,base_hp,base_atk,base_def,base_spa,base_spd,base_spe'},needsAuth).catch(function(){return[]});
      var itemP=b.item_id?q('items',{id:'eq.'+b.item_id,select:'name,sprite_url,short_description'},needsAuth).catch(function(){return[]}):Promise.resolve([]);
      var natureP=b.nature_id?q('natures',{id:'eq.'+b.nature_id,select:'name,increased_stat,decreased_stat'},needsAuth).catch(function(){return[]}):Promise.resolve([]);
      var moveNames=[b.move_1,b.move_2,b.move_3,b.move_4].filter(function(m){return m&&m.trim()});
      var movesP=moveNames.length?q('moves',{name:'in.('+moveNames.map(function(n){return '"'+n.replace(/"/g,'\\"')+'"'}).join(',')+')',select:'name,type,category,power,accuracy,pp,priority,short_description,champions_power,champions_accuracy,champions_pp'},needsAuth).catch(function(){return[]}):Promise.resolve([]);
      var authorP=q('user_profiles',{user_id:'eq.'+b.user_id,select:'username,display_name'},needsAuth).catch(function(){return[]});

      var results=await Promise.all([pkP,itemP,natureP,movesP,authorP]);
      var pk=results[0]&&results[0][0];
      var item=results[1]&&results[1][0]||null;
      var nature=results[2]&&results[2][0]||null;
      var movesMeta={};(results[3]||[]).forEach(function(m){movesMeta[m.name]=m});
      var author=results[4]&&results[4][0]||{};

      // Preload sprites
      var spriteUrl=b.is_shiny&&pk.shiny_url?pk.shiny_url:pk.image_url;
      var spriteDataP=spriteToDataUrl(spriteUrl);
      var itemDataP=(item&&item.sprite_url)?spriteToDataUrl(item.sprite_url):Promise.resolve('');
      var preloaded=await Promise.all([spriteDataP,itemDataP]);

      html=buildImageHtml(b,pk,item,nature,movesMeta,author,preloaded[0],preloaded[1]);
      filename='champions-'+slugify(pk.name||b.name)+'.png';
      shareTitle=b.name||'Champions Forge build';
      shareUrl=buildShareUrl('build',b.share_code);
    }else if(kind==='team'){
      var t=allTeams?allTeams.find(function(x){return x.id===id}):null;
      if(!t){
        var trows=await q('teams',{id:'eq.'+id,select:'id,name,user_id,format,share_code,share_fields,roster_size,team_icon,team_theme,team_archetype'},true);
        t=trows&&trows[0];
      }
      if(!t){toast('Team not found','err');return}

      // Fetch team_builds with nested build + pokemon + get moves/ability/item for each member
      var membersRaw=await q('team_builds',{
        team_id:'eq.'+t.id,
        select:'slot_position,builds(id,name,is_public,share_code,is_shiny,pokemon_id,ability,archetype,item_id,move_1,move_2,move_3,move_4,pokemon(id,name,type_1,type_2,image_url,shiny_url))',
        order:'slot_position.asc'
      },needsAuth).catch(function(){return[]});

      // Collect unique item ids + all move names
      var itemIds={},moveNamesSet={};
      membersRaw.forEach(function(row){
        var bu=row.builds;if(!bu)return;
        if(bu.item_id)itemIds[bu.item_id]=1;
        [bu.move_1,bu.move_2,bu.move_3,bu.move_4].forEach(function(n){if(n&&n.trim())moveNamesSet[n]=1});
      });
      var itemIdArr=Object.keys(itemIds);
      var moveNamesArr=Object.keys(moveNamesSet);

      var itemsP=itemIdArr.length?q('items',{id:'in.('+itemIdArr.join(',')+')',select:'id,name,sprite_url'},needsAuth).catch(function(){return[]}):Promise.resolve([]);
      var movesBatchP=moveNamesArr.length?q('moves',{name:'in.('+moveNamesArr.map(function(n){return '"'+n.replace(/"/g,'\\"')+'"'}).join(',')+')',select:'name,type'},needsAuth).catch(function(){return[]}):Promise.resolve([]);
      var tAuthorP=q('user_profiles',{user_id:'eq.'+t.user_id,select:'username,display_name'},needsAuth).catch(function(){return[]});

      var tResults=await Promise.all([itemsP,movesBatchP,tAuthorP]);
      var itemsMap={};(tResults[0]||[]).forEach(function(it){itemsMap[it.id]=it});
      var movesTypeMap={};(tResults[1]||[]).forEach(function(mv){movesTypeMap[mv.name]={type:mv.type}});
      var teamAuthor=tResults[2]&&tResults[2][0]||{};

      // Build members array with enriched data
      var members=membersRaw.map(function(row){
        var bu=row.builds||{};var pk=bu.pokemon||{};
        var itemRow=bu.item_id?itemsMap[bu.item_id]:null;
        return {
          slot:row.slot_position,
          build_id:bu.id,
          is_shiny:!!bu.is_shiny,
          pk_id:pk.id,pk_name:pk.name,type_1:pk.type_1,type_2:pk.type_2,image_url:pk.image_url,shiny_url:pk.shiny_url,
          ability:bu.ability||'',
          archetype:bu.archetype||null,
          item_name:itemRow?itemRow.name:null,
          item_sprite_url:itemRow?itemRow.sprite_url:null,
          move_1:bu.move_1,move_2:bu.move_2,move_3:bu.move_3,move_4:bu.move_4,
          movesMeta:movesTypeMap
        };
      }).filter(function(m){return m.pk_id});

      // Preload all sprites + items in parallel
      var memberSpriteUrls={},memberItemUrls={};
      var spritePromises=members.map(function(m){
        var su=m.is_shiny&&m.shiny_url?m.shiny_url:m.image_url;
        return spriteToDataUrl(su).then(function(d){memberSpriteUrls[m.build_id]=d});
      });
      var itemPromises=members.filter(function(m){return m.item_sprite_url}).map(function(m){
        return spriteToDataUrl(m.item_sprite_url).then(function(d){memberItemUrls[m.build_id]=d});
      });
      await Promise.all(spritePromises.concat(itemPromises));

      html=teamImageHtml(t,members,teamAuthor,memberSpriteUrls,memberItemUrls);
      filename='champions-team-'+slugify(t.name)+'.png';
      shareTitle=t.name||'Champions Forge team';
      shareUrl=buildShareUrl('team',t.share_code);
    }else{
      toast('Unknown kind: '+kind,'err');
      return;
    }

    // Render off-screen
    host.innerHTML=html;
    var target=host.firstElementChild;
    if(!target){toast('Render failed','err');return}

    // Ensure the target has its canvas-sized dimensions
    target.style.width='1200px';
    target.style.height='630px';

    // CRITICAL: wait for all images (especially large data-URL sprites) to
    // finish decoding before rendering. Without this the capture can fire
    // while imgs are still 0×0 and sprites render blank.
    await waitForImages(target);

    // Render → Blob. Prefer html-to-image (SVG foreignObject, respects blur/filter).
    // Fall back to html2canvas if html-to-image isn't loaded yet.
    // pixelRatio:2 renders at 2400×1260 internally → downscaled to 1200×630 PNG
    // for crisp retina-quality text and sprites.
    var blob;
    if(renderer==='htmlToImage'){
      blob=await window.htmlToImage.toBlob(target,{
        width:1200,height:630,
        pixelRatio:1.5,  // Drop F.2.1 v7: 1.5 vs 2 — ~30-40% faster render, still sharp on retina
        cacheBust:false, // v7: let browser reuse cached data-URLs between captures
        backgroundColor:'transparent',
        style:{margin:'0',padding:'0'},
        fetchRequestInit:{cache:'force-cache'}
      });
    }else{
      var canvas=await html2canvas(target,{
        width:1200,height:630,
        scale:2,
        backgroundColor:null,
        logging:false,
        useCORS:true,
        allowTaint:false,
        imageTimeout:6000
      });
      blob=await new Promise(function(res){canvas.toBlob(function(b){res(b)},'image/png',0.95)});
    }
    if(!blob){toast('Render failed','err');host.innerHTML='';return}

    // Clean up DOM
    host.innerHTML='';

    var file=new File([blob],filename,{type:'image/png'});

    // Try Web Share with files
    // NOTE: on iOS, passing `url` alongside `files` makes the share sheet
    // treat it as a LINK share and hides the "Save Image" action. To get
    // Save to Camera Roll + AirDrop + full image-share options, we pass
    // files-only and embed the URL inside the text field instead.
    if(canShareFiles(file)){
      try{
        await navigator.share({
          files:[file],
          title:shareTitle,
          text:'Check out my Champions Forge '+(kind==='team'?'team':'build')+'!\n'+shareUrl
        });
        return;
      }catch(e){
        if(e&&e.name==='AbortError')return; // user cancelled
        console.log('navigator.share(files) failed:',e);
      }
    }

    // Fallback — download + copy URL
    var objUrl=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=objUrl;a.download=filename;
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(objUrl)},500);
    if(shareUrl&&navigator.clipboard){
      try{await navigator.clipboard.writeText(shareUrl)}catch(_){}
    }
    toast('Image saved · Link copied to clipboard');
  }catch(e){
    console.log('shareImageClientSide error:',e);
    toast(e.message||'Failed to generate image','err');
    var hostEl=document.getElementById('imgRenderHost');
    if(hostEl)hostEl.innerHTML='';
  }
}

// In-session blob cache: rendered PNGs keyed by build/team id.
// Allows instant retry if navigator.share fails (gesture context expiry after async wait).
// Prevents wasting a Browserless unit on re-render for the same share.
var _shareImageCache={};

// Show a floating tap-to-save button (used when native share sheet is unavailable).
// User taps the link — this is a fresh user gesture, so iOS handles the download natively
// without triggering the confusing "View/Download" bar from auto-click.
function _showSaveButton(blob,filename,shareUrl){
  var objUrl=URL.createObjectURL(blob);
  var prev=document.getElementById('share-save-banner');if(prev)prev.parentNode.removeChild(prev);
  var banner=document.createElement('div');
  banner.id='share-save-banner';
  banner.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid rgba(255,255,255,.12);color:#fff;padding:10px 16px;border-radius:14px;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:inherit;white-space:nowrap;max-width:calc(100vw - 32px);';
  var link=document.createElement('a');
  link.href=objUrl;link.download=filename;
  link.innerHTML='<span style="font-size:.82rem;font-weight:700;color:#60a5fa">💾 Tap to save image</span>';
  link.style.textDecoration='none';
  link.onclick=function(){
    if(shareUrl&&navigator.clipboard)navigator.clipboard.writeText(shareUrl).catch(function(){});
    setTimeout(function(){if(banner.parentNode){document.body.removeChild(banner);URL.revokeObjectURL(objUrl)}},1000);
  };
  var close=document.createElement('button');
  close.textContent='✕';
  close.style.cssText='background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:.82rem;padding:0;font-family:inherit;line-height:1;flex-shrink:0;';
  close.onclick=function(){if(banner.parentNode){document.body.removeChild(banner);URL.revokeObjectURL(objUrl)}};
  banner.appendChild(link);banner.appendChild(close);
  document.body.appendChild(banner);
  setTimeout(function(){if(banner.parentNode){document.body.removeChild(banner);URL.revokeObjectURL(objUrl)}},30000);
}

// Drop F.2.1b: Edge-first share — calls Supabase Edge Function (Browserless server-side
// render) first, falls back to shareImageClientSide (html-to-image) on any failure.
async function shareImage(kind,id){
  // Capture triggering button synchronously (BEFORE first await) for spinner feedback
  function _startLoad(){document.body.classList.add('share-loading')}
  function _stopLoad(){document.body.classList.remove('share-loading')}

  var EDGE=API+'/functions/v1/share-image';
  var t0=performance.now();

  // Look up share code from local state (share button only shown when is_public + share_code set)
  var shareCode='',shareUrl='',shareTitle='',filename='';
  if(kind==='build'){
    var b=allBuilds?allBuilds.find(function(x){return x.id===id}):null;
    if(!b||!b.share_code){_stopLoad();return shareImageClientSide(kind,id)}
    shareCode=b.share_code;
    shareUrl=buildShareUrl('build',shareCode);
    shareTitle=b.name||b.build_name||'Champions Forge build';
    filename='champions-'+slugify(shareTitle)+'.png';
  }else{
    var t=allTeams?allTeams.find(function(x){return x.id===id}):null;
    if(!t||!t.share_code){_stopLoad();return shareImageClientSide(kind,id)}
    shareCode=t.share_code;
    shareUrl=buildShareUrl('team',shareCode);
    shareTitle=t.name||'Champions Forge team';
    filename='champions-team-'+slugify(shareTitle)+'.png';
  }

  // Cache hit — skip edge fn entirely, re-use previously rendered blob
  // (preserves gesture context + saves a Browserless unit on retry)
  if(_shareImageCache[id]){
    var _cb=_shareImageCache[id];
    var _cf=new File([_cb],filename,{type:'image/png'});
    if(canShareFiles(_cf)){
      try{
        await navigator.share({files:[_cf],title:shareTitle,
          text:'Check out my Champions Forge '+(kind==='team'?'team':'build')+'!\n'+shareUrl});
        return;
      }catch(e){if(e&&e.name==='AbortError')return;console.log('[shareImage] cache share failed:',e)}
    }
    _showSaveButton(_cb,filename,shareUrl);
    return;
  }

  toast('Generating image…','info');
  _startLoad();

  try{
    var res=await fetch(EDGE,{
      method:'POST',
      headers:{
        'apikey':ANON,
        'Authorization':'Bearer '+(tk||ANON),
        'Content-Type':'application/json'
      },
      body:JSON.stringify({kind:kind,id:id,code:shareCode})
    });

    // 429 = Browserless quota exceeded — fall back silently, user still gets image
    if(res.status===429){
      _stopLoad();
      console.log('[shareImage] edge quota exceeded — falling back to client render');
      return shareImageClientSide(kind,id);
    }

    if(!res.ok) throw new Error('edge fn HTTP '+res.status);

    var blob=await res.blob();
    _shareImageCache[id]=blob; // cache for gesture retry — no re-render needed
    _stopLoad();
    console.log('[shareImage] edge render',Math.round(performance.now()-t0),'ms ('+Math.round(blob.size/1024)+'KB)');

    var file=new File([blob],filename,{type:'image/png'});

    if(canShareFiles(file)){
      try{
        await navigator.share({
          files:[file],
          title:shareTitle,
          text:'Check out my Champions Forge '+(kind==='team'?'team':'build')+'!\n'+shareUrl
        });
        return;
      }catch(e){
        if(e&&e.name==='AbortError'){_stopLoad();return;}
        console.log('[shareImage] navigator.share failed:',e);
      }
    }

    // native share not available / gesture expired — show tap-to-save button
    _showSaveButton(blob,filename,shareUrl);

  }catch(edgeErr){
    _stopLoad();
    console.log('[shareImage] edge failed, falling back to client render:',edgeErr.message||edgeErr);
    return shareImageClientSide(kind,id);
  }
}

// ═══════════════════════════════════════
// BOOT: listen for hash changes; initial handleHashRoute call is made by app-init
// after reference data loading kicks off.
// ═══════════════════════════════════════
window.addEventListener('hashchange',handleHashRoute);

window._championsRouter={
  init:handleHashRoute,
  parseHash:parseHash,
  isPublicRoute:function(){return _pubRoute!==null}
};
