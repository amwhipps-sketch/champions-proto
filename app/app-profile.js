// #SECTION: ITEMS
// ═══════════════════════════════════════
// ITEMS
// Load, render, and toggle collected items.
// ═══════════════════════════════════════

var allItems=[],uItems={},activeItemCategory='all',activeItemStatus='all';
async function loadItems(){try{allItems=await q('items',{order:'name.asc',limit:'1000'});document.getElementById('nc3').textContent=allItems.length;renderItems()}catch(e){}}
async function loadUItems(){if(!tk)return;try{var rows=await q('user_items',{select:'item_id,obtained'},true);uItems={};rows.forEach(function(r){if(r.obtained)uItems[r.item_id]=true});renderItems()}catch(e){}}
async function togItem(iid){if(!usr){toast('Sign in first','err');return}
  try{if(uItems[iid]){await rm('user_items',{'user_id':'eq.'+usr.id,'item_id':'eq.'+iid},true);delete uItems[iid];toast('Removed')}
  else{var u=new URL(API+'/rest/v1/user_items');u.searchParams.set('on_conflict','user_id,item_id');
    var r=await authFetch(u.toString(),{method:'POST',headers:Object.assign(h(true),{'Prefer':'return=representation,resolution=merge-duplicates'}),body:JSON.stringify({user_id:usr.id,item_id:iid,obtained:true})},true);
    if(!r.ok)throw new Error((await r.json().catch(function(){return{}})).message||r.status);
    uItems[iid]=true;toast('Item obtained!')}renderItems()}catch(e){toast(e.message,'err')}}

// Switch the active category filter + re-render. Bound to the pill buttons.
function setItemCategory(cat){activeItemCategory=cat||'all';renderItems()}
function setItemStatus(st){activeItemStatus=st||'all';renderItems()}

// Shared predicate for filtering items by category + status + search.
function _itemMatchesFilters(i,s){
  if(s&&i.name.toLowerCase().indexOf(s)===-1)return false;
  if(activeItemCategory!=='all'&&i.category!==activeItemCategory)return false;
  if(activeItemStatus==='obtained'&&!uItems[i.id])return false;
  if(activeItemStatus==='unobtained'&&uItems[i.id])return false;
  if(activeItemStatus==='free'&&i.acquisition!=='base_game')return false;
  return true;
}

// Build the VP badge HTML shown on each item card.
function itemVpBadge(item){
  if(item.acquisition==='base_game')return '<div class="it-vp free"><i class="ph-bold ph-gift"></i>Free</div>';
  if(item.acquisition==='mega_tutorial')return '<div class="it-vp tutor"><i class="ph-bold ph-trophy"></i>Tutorial</div>';
  if(item.acquisition==='transfer_plza')return '<div class="it-vp transfer"><i class="ph-bold ph-arrows-clockwise"></i>Z-A Transfer</div>';
  if(item.acquisition==='shop'&&item.vp_cost)return '<div class="it-vp"><i class="ph-bold ph-shopping-cart"></i>'+item.vp_cost+' VP</div>';
  return '';
}

function renderItems(){
  var s=document.getElementById('itemSearch').value.toLowerCase();
  var f=allItems.filter(function(i){return _itemMatchesFilters(i,s)});
  // Category pill counts respect search + status (but not category) so tabs stay accurate.
  var catCounts={all:0,hold:0,berry:0,mega_stone:0};
  allItems.forEach(function(i){
    if(s&&i.name.toLowerCase().indexOf(s)===-1)return;
    if(activeItemStatus==='obtained'&&!uItems[i.id])return;
    if(activeItemStatus==='unobtained'&&uItems[i.id])return;
    if(activeItemStatus==='free'&&i.acquisition!=='base_game')return;
    catCounts.all++;
    if(catCounts[i.category]!==undefined)catCounts[i.category]++;
  });
  // Status pill counts respect search + category (but not status).
  var statCounts={all:0,obtained:0,unobtained:0,free:0};
  allItems.forEach(function(i){
    if(s&&i.name.toLowerCase().indexOf(s)===-1)return;
    if(activeItemCategory!=='all'&&i.category!==activeItemCategory)return;
    statCounts.all++;
    if(uItems[i.id])statCounts.obtained++;else statCounts.unobtained++;
    if(i.acquisition==='base_game')statCounts.free++;
  });
  var catPills='<div class="it-filter">'+
    ['all','hold','berry','mega_stone'].map(function(cat){
      var label={all:'All',hold:'Hold',berry:'Berries',mega_stone:'Mega Stones'}[cat];
      return '<button class="it-pill'+(activeItemCategory===cat?' active':'')+'" onclick="setItemCategory(\''+cat+'\')">'+label+'<span class="count">'+catCounts[cat]+'</span></button>';
    }).join('')+'</div>';
  var statPills='<div class="it-filter">'+
    ['all','obtained','unobtained','free'].map(function(st){
      var label={all:'Any status',obtained:'Obtained',unobtained:'Missing',free:'Free'}[st];
      return '<button class="it-pill'+(activeItemStatus===st?' active':'')+'" onclick="setItemStatus(\''+st+'\')">'+label+'<span class="count">'+statCounts[st]+'</span></button>';
    }).join('')+'</div>';
  var pills=catPills+statPills;
  var body=f.map(function(i){
    var on=uItems[i.id];
    var sprite=i.sprite_url?'<img src="'+i.sprite_url+'" alt="" onerror="this.style.display=\'none\'">':'';
    var desc=i.short_description||i.description||'';
    var vp=itemVpBadge(i);
    return '<div class="it-card" onclick="showItemDetail(\''+i.id+'\')">'+
      '<div class="it-sprite">'+sprite+'</div>'+
      '<div class="it-info">'+
        '<div class="it-name-row"><div class="it-name">'+i.name+'</div>'+vp+'</div>'+
        (desc?'<div class="it-desc">'+desc+'</div>':'')+
      '</div>'+
      '<button class="it-chk'+(on?' on':'')+'" onclick="event.stopPropagation();togItem(\''+i.id+'\')" aria-label="'+(on?'Obtained':'Mark obtained')+'">'+(on?'✓':'·')+'</button>'+
    '</div>';
  }).join('')||'<div class="empty"><div class="em">🔍</div>No items match</div>';
  document.getElementById('itemsGrid').innerHTML=pills+body;
}

// Open the item detail panel (reuses the shared .panel-ov#detP overlay).
function showItemDetail(id){
  var item=allItems.find(function(i){return i.id===id});
  if(!item)return;
  var on=uItems[id];
  var render=item.render_url||item.sprite_url||'';
  var sprite=item.sprite_url||'';
  // If render fails, fall back to the pixel sprite (still better than nothing).
  var onErr=' onerror="if(this.dataset.fallback!==\'1\'){this.dataset.fallback=\'1\';this.src=\''+sprite+'\';this.style.imageRendering=\'pixelated\';}else{this.style.display=\'none\';}"';
  var renderImg=render?'<img src="'+render+'" alt=""'+onErr+'>':'';
  var descHtml='';
  if(item.description||item.short_description){
    descHtml='<div class="panel-section">'+
      '<div class="panel-section-label">Description</div>'+
      '<div class="panel-desc">'+(item.description||item.short_description)+'</div>'+
    '</div>';
  }
  // How to Get — acquisition info row
  var acqHtml='';
  if(item.acquisition){
    var cfg={
      shop:{cls:'shop',icon:'shopping-cart',where:'Available from Shop',cost:item.vp_cost?item.vp_cost+' VP':'VP cost varies'},
      base_game:{cls:'free',icon:'gift',where:'Available from the start',cost:'Included in base game'},
      mega_tutorial:{cls:'tutor',icon:'trophy',where:'Mega Evolution Tutorial',cost:'Complete the tutorial to unlock'},
      transfer_plza:{cls:'transfer',icon:'arrows-clockwise',where:'Transfer from Pokémon Legends: Z-A',cost:'Deposit via the transfer app'}
    }[item.acquisition];
    if(cfg){
      acqHtml='<div class="panel-section">'+
        '<div class="panel-section-label">How to Get</div>'+
        '<div class="acq-row">'+
          '<div class="acq-icon '+cfg.cls+'"><i class="ph-bold ph-'+cfg.icon+'"></i></div>'+
          '<div class="acq-lines">'+
            '<div class="acq-where">'+cfg.where+'</div>'+
            '<div class="acq-cost">'+cfg.cost+'</div>'+
          '</div>'+
        '</div>'+
      '</div>';
    }
  }
  var noteHtml='';
  if(item.champions_note){
    noteHtml='<div class="panel-section">'+
      '<div class="panel-note">'+
        '<div class="panel-note-label"><span>⚡</span><span>Champions Note</span></div>'+
        item.champions_note+
      '</div>'+
    '</div>';
  }
  var actionHtml='<div class="panel-actions">'+
    '<button class="panel-btn '+(on?'active':'primary')+'" onclick="togItem(\''+id+'\');closeItemDetail()">'+
      '<i class="ph-bold ph-'+(on?'x-circle':'check')+'"></i>'+
      (on?'Remove from collection':'Mark as obtained')+
    '</button>'+
  '</div>';
  var html='<div class="panel-handle"></div>'+
    '<button class="panel-close" onclick="closeItemDetail()" aria-label="Close">✕</button>'+
    '<div class="panel-hero">'+
      '<div class="it-panel-render">'+renderImg+'</div>'+
      '<div class="panel-name">'+item.name+'</div>'+
      '<div class="panel-tag">'+(on?'✓ Obtained':'Not obtained')+'</div>'+
    '</div>'+
    '<div class="panel-body">'+
      descHtml+
      acqHtml+
      noteHtml+
      actionHtml+
    '</div>';
  document.getElementById('detInner').innerHTML=html;
  document.getElementById('detP').classList.add('open');
}
function closeItemDetail(){document.getElementById('detP').classList.remove('open')}

// #SECTION: ABILITIES
// ═══════════════════════════════════════
// ABILITIES
// Load, filter, and render all 191 abilities.
// Drop G.1 — browse page only, no per-Pokémon mapping yet.
// ═══════════════════════════════════════

var allAbilities=[],ablCatFilter=null,ablSearchQ='';

// Category config — used for icon, colour, and filter pill rendering.
var ABL_CATS={
  weather:  {label:'Weather',  icon:'ph-cloud-sun',               c:'#7dd3fc',bg:'rgba(125,211,252,.12)'},
  offensive:{label:'Offensive',icon:'ph-sword',                   c:'#f97316',bg:'rgba(249,115,22,.12)'},
  defensive:{label:'Defensive',icon:'ph-shield',                  c:'#3b82f6',bg:'rgba(59,130,246,.12)'},
  speed:    {label:'Speed',    icon:'ph-wind',                    c:'#fb7185',bg:'rgba(251,113,133,.12)'},
  immunity: {label:'Immunity', icon:'ph-shield-check',            c:'#10b981',bg:'rgba(16,185,129,.12)'},
  support:  {label:'Support',  icon:'ph-arrows-counter-clockwise',c:'#f59e0b',bg:'rgba(245,158,11,.12)'},
  recovery: {label:'Recovery', icon:'ph-heart',                   c:'#a78bfa',bg:'rgba(167,139,250,.12)'},
};

// Hardcoded category lookup for known competitive abilities.
// Defaults to 'support' for any ability not listed.
var ABL_CAT_MAP={
  // Weather
  'Drought':'weather','Drizzle':'weather','Sand Stream':'weather','Snow Warning':'weather',
  'Cloud Nine':'weather','Air Lock':'weather','Sand Spit':'weather','Primordial Sea':'weather',
  'Desolate Land':'weather','Delta Stream':'weather',
  // Offensive
  'Adaptability':'offensive','Aerilate':'offensive','Beast Boost':'offensive',
  'Blaze':'offensive','Competitive':'offensive','Compound Eyes':'offensive',
  'Defiant':'offensive','Download':'offensive','Flower Gift':'offensive',
  'Galvanize':'offensive','Gorilla Tactics':'offensive','Hustle':'offensive',
  'Intrepid Sword':'offensive','Iron Fist':'offensive','Libero':'offensive',
  'Mega Launcher':'offensive','Mold Breaker':'offensive','Neuroforce':'offensive',
  'No Guard':'offensive','Normalize':'offensive','Overgrow':'offensive',
  'Parental Bond':'offensive','Pixilate':'offensive','Protean':'offensive',
  'Pure Power':'offensive','Huge Power':'offensive','Refrigerate':'offensive',
  'Reckless':'offensive','Sand Force':'offensive','Scrappy':'offensive',
  'Sheer Force':'offensive','Skill Link':'offensive','Sniper':'offensive',
  'Strong Jaw':'offensive','Technician':'offensive','Tinted Lens':'offensive',
  'Torrent':'offensive','Tough Claws':'offensive','Transistor':'offensive',
  'Turboblaze':'offensive','Teravolt':'offensive','Victory Star':'offensive',
  'Water Bubble':'offensive','Dragons Maw':'offensive','Steelworker':'offensive',
  'Stakeout':'offensive','Trace':'offensive',
  // Defensive
  'Aftermath':'defensive','Battle Armor':'defensive','Bulletproof':'defensive',
  'Cursed Body':'defensive','Dauntless Shield':'defensive','Disguise':'defensive',
  'Fluffy':'defensive','Fur Coat':'defensive','Heatproof':'defensive',
  'Ice Scales':'defensive','Innards Out':'defensive','Marvel Scale':'defensive',
  'Multiscale':'defensive','Overcoat':'defensive','Prism Armor':'defensive',
  'Rock Head':'defensive','Shadow Shield':'defensive','Shell Armor':'defensive',
  'Solid Rock':'defensive','Stamina':'defensive','Sturdy':'defensive',
  'Thick Fat':'defensive','Wonder Guard':'defensive','Filter':'defensive',
  'Full Metal Body':'defensive','Queenly Majesty':'defensive',
  // Speed
  'Chlorophyll':'speed','Motor Drive':'speed','Quick Feet':'speed',
  'Rattled':'speed','Sand Rush':'speed','Slush Rush':'speed',
  'Speed Boost':'speed','Swift Swim':'speed','Surge Surfer':'speed',
  'Unburden':'speed','Gale Wings':'speed',
  // Immunity
  'Dry Skin':'immunity','Earth Eater':'immunity','Flash Fire':'immunity',
  'Immunity':'immunity','Levitate':'immunity','Lightning Rod':'immunity',
  'Sap Sipper':'immunity','Storm Drain':'immunity','Volt Absorb':'immunity',
  'Water Absorb':'immunity','Wonder Skin':'immunity','Soundproof':'immunity',
  'Telepathy':'immunity',
  // Recovery
  'Magic Guard':'recovery','Natural Cure':'recovery','Poison Heal':'recovery',
  'Regenerator':'recovery','Shed Skin':'recovery',
  // Support (catch-all for utility/control abilities)
  'Intimidate':'support','Prankster':'support','Magic Bounce':'support',
  'Serene Grace':'support','Contrary':'support','Arena Trap':'support',
  'Shadow Tag':'support','Magnet Pull':'support','Moody':'support',
  'Corrosion':'support','Dark Aura':'support','Fairy Aura':'support',
  'Frisk':'support','Infiltrator':'support','Neutralizing Gas':'support',
  'Pressure':'support','Symbiosis':'support','Synchronize':'support',
  'Unnerve':'support','Tangling Hair':'support','Gooey':'support',
  'Cute Charm':'support','Aroma Veil':'support','Sweet Veil':'support',
  'Mummy':'support','Wandering Spirit':'support','Perish Body':'support',
};

function _ablCategory(name){return ABL_CAT_MAP[name]||'support'}

async function loadAbilities(){
  try{
    allAbilities=await q('abilities',{order:'name.asc',limit:'500'});
    var cnt=document.getElementById('ablCount');
    if(cnt)cnt.textContent=allAbilities.length;
    buildAblFilterPills();
    renderAbilities();
  }catch(e){}
}

function buildAblFilterPills(){
  var row=document.getElementById('ablFilterRow');
  if(!row)return;
  var html='<button class="ref-fpill active" id="rfp-all" onclick="setAblFilter(null)"><i class="ph-bold ph-squares-four"></i>All</button>';
  Object.keys(ABL_CATS).forEach(function(k){
    var c=ABL_CATS[k];
    html+='<button class="ref-fpill" id="rfp-'+k+'" style="color:'+c.c+'" onclick="setAblFilter(\''+k+'\')"><i class="ph-bold '+c.icon+'"></i>'+c.label+'</button>';
  });
  row.innerHTML=html;
}

function setAblFilter(cat){
  ablCatFilter=cat;
  var row=document.getElementById('ablFilterRow');
  if(!row)return;
  row.querySelectorAll('.ref-fpill').forEach(function(p){
    p.classList.remove('active');
    p.style.background='';p.style.borderColor='';
  });
  var active=document.getElementById('rfp-'+(cat||'all'));
  if(active){
    active.classList.add('active');
    var col=cat?ABL_CATS[cat].c:'var(--red)';
    active.style.background='color-mix(in srgb,'+col+' 13%,transparent)';
    active.style.borderColor='color-mix(in srgb,'+col+' 32%,transparent)';
  }
  renderAbilities();
}

function onAblSearch(v){ablSearchQ=v||'';renderAbilities()}

function renderAbilities(){
  var el=document.getElementById('ablList');
  if(!el)return;
  if(!allAbilities.length){el.innerHTML='<div class="empty"><div class="em">⏳</div>Loading…</div>';return}
  var q2=ablSearchQ.toLowerCase();
  var list=allAbilities.filter(function(a){
    if(ablCatFilter&&_ablCategory(a.name)!==ablCatFilter)return false;
    if(q2&&a.name.toLowerCase().indexOf(q2)===-1&&(a.short_description||'').toLowerCase().indexOf(q2)===-1)return false;
    return true;
  });
  if(!list.length){el.innerHTML='<div class="empty"><div class="em">🔍</div>No abilities match</div>';return}
  var html='';var lastLetter='';
  list.forEach(function(a){
    var letter=a.name[0].toUpperCase();
    if(letter!==lastLetter){html+='<div class="abl-alpha-hdr">'+letter+'</div>';lastLetter=letter;}
    var cat=_ablCategory(a.name);var c=ABL_CATS[cat];
    html+='<div class="abl-card" onclick="showAbilityDetail(\''+a.id+'\')">'+
      '<div class="abl-icon" style="background:'+c.bg+';color:'+c.c+'"><i class="ph-bold '+c.icon+'"></i></div>'+
      '<div class="abl-body">'+
        '<div class="abl-name">'+a.name+'</div>'+
        '<div class="abl-desc">'+(a.short_description||'')+'</div>'+
      '</div>'+
      '<div class="abl-right">'+
        '<span class="abl-cat-pill" style="background:'+c.bg+';color:'+c.c+'">'+c.label+'</span>'+
        '<span class="abl-chev"><i class="ph-bold ph-caret-right"></i></span>'+
      '</div>'+
    '</div>';
  });
  el.innerHTML=html;
}

function showAbilityDetail(idOrName,opts){
  opts=opts||{};
  var a=allAbilities.find(function(x){return x.id===idOrName||x.name===idOrName});
  if(!a)return;
  var cat=_ablCategory(a.name);var c=ABL_CATS[cat];
  // "Used in N builds" — count from allBuilds (loaded at boot)
  var usedCount=(window.allBuilds||[]).filter(function(b){return(b.ability||'').toLowerCase()===a.name.toLowerCase()}).length;
  var det=document.getElementById('refDetInner');
  if(!det)return;
  det.innerHTML=
    '<div class="abl-det-hero">'+
      '<div class="abl-det-icon" style="background:'+c.bg+';color:'+c.c+'"><i class="ph-bold '+c.icon+'"></i></div>'+
      '<div>'+
        '<div class="abl-det-name">'+a.name+'</div>'+
        '<span class="abl-det-tag" style="background:'+c.bg+';color:'+c.c+'">'+c.label+'</span>'+
      '</div>'+
    '</div>'+
    '<div class="p-header" style="padding:.3rem 1.2rem .7rem;border-bottom:1px solid var(--border)">'+
      '<div style="font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Description</div>'+
      '<div style="font-size:.83rem;color:var(--text2);line-height:1.6">'+(a.description||a.short_description||'No description available.')+'</div>'+
      (a.champions_note?'<div style="margin-top:.55rem;padding:.5rem .7rem;background:var(--gold-bg);border-radius:10px;border-left:2px solid var(--gold);font-size:.74rem;color:var(--gold);line-height:1.4">⭐ '+a.champions_note+'</div>':'')+
    '</div>'+
    '<div class="p-header" style="padding:.7rem 1.2rem .8rem">'+
      '<div style="font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Usage</div>'+
      (usedCount>0
        ?'<span style="display:inline-flex;align-items:center;gap:.3rem;padding:.28rem .65rem;border-radius:8px;font-size:.71rem;font-weight:700;background:var(--red-bg);color:var(--red)"><i class="ph-bold ph-sword"></i> Used in '+usedCount+' build'+(usedCount!==1?'s':'')+'</span>'
        :'<span style="display:inline-flex;padding:.28rem .65rem;border-radius:8px;font-size:.71rem;font-weight:700;background:var(--surface);color:var(--muted)">Not used in any builds yet</span>')+
    '</div>'+
_ablDetPkmnSection(a,opts.collapsePokemon);
  document.getElementById('refDetOv').classList.add('open');
}

// Drop G.3: "Pokémon with this ability" section rendered in the ability detail tray.
// Reads allPkmnAbilities (loaded at boot) + allPkmn. Groups by slot: 1, 2, hidden.
function _ablDetPkmnSection(a,collapsed){  var rows=(window.allPkmnAbilities||[]).filter(function(pa){return pa.ability_id===a.id;});
  if(!rows.length)return '';
  var bySlot={'1':[],'2':[],'hidden':[]};
  rows.forEach(function(pa){
    var poke=(window.allPkmn||[]).find(function(p){return p.id===pa.pokemon_id;});
    if(!poke)return;
    var sl=String(pa.slot);
    if(bySlot[sl])bySlot[sl].push(poke);
  });
  ['1','2','hidden'].forEach(function(sl){
    bySlot[sl].sort(function(a,b){return (a.dex_number||0)-(b.dex_number||0);});
  });
  var slotMeta={'1':{lbl:'Slot 1',c:'#a78bfa',bg:'rgba(167,139,250,.12)'},'2':{lbl:'Slot 2',c:'#3b82f6',bg:'rgba(59,130,246,.12)'},'hidden':{lbl:'Hidden',c:'#f59e0b',bg:'rgba(245,158,11,.12)'}};
var html='<div class="p-header" style="padding:.7rem 1.2rem 1.2rem;border-top:1px solid var(--border)">'+
  '<details class="abl-pkmn-details" '+(collapsed?'':'open')+'>'+
    '<summary class="abl-pkmn-summary">'+
      '<span>Pok\u00e9mon with this ability</span>'+
      '<span class="abl-pkmn-count">('+rows.length+')</span>'+
    '</summary>'+
    '<div class="abl-pkmn-detail-body">';
  ['1','2','hidden'].forEach(function(sl){
    var pokes=bySlot[sl];if(!pokes||!pokes.length)return;
    var m=slotMeta[sl];
    html+='<div style="margin-bottom:.65rem">'+
      '<div style="margin-bottom:.4rem">'+
        '<span style="padding:.2rem .55rem;border-radius:6px;font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;background:'+m.bg+';color:'+m.c+'">'+m.lbl+'</span>'+
        ' <span style="font-size:.62rem;color:var(--muted);font-weight:600">'+pokes.length+'</span>'+
      '</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:.3rem">'+
      pokes.map(function(p){
        var img=p.image_url||'';
        return '<div style="display:inline-flex;align-items:center;gap:.28rem;padding:.22rem .5rem .22rem .28rem;border-radius:8px;background:var(--surface);font-size:.72rem;font-weight:600;color:var(--text2);white-space:nowrap">'+
          (img?'<img src="'+img+'" style="width:22px;height:22px;object-fit:contain;flex-shrink:0" onerror="this.style.display=\'none\'">':'')+
          p.name+
        '</div>';
      }).join('')+
      '</div>'+
    '</div>';
  });
html+='</div></details></div>';
  return html;
}

function closeRefDet(){document.getElementById('refDetOv').classList.remove('open')}

function switchRefTab(tab){
  document.querySelectorAll('#refTabBar .ref-tab').forEach(function(t){
    t.classList.toggle('active',t.dataset.tab===tab);
  });
  var ap=document.getElementById('refAbilitiesPane');
  var np=document.getElementById('refNaturesPane');
  var acp=document.getElementById('refArchetypesPane');
  if(ap)ap.style.display=tab==='abilities'?'':'none';
  if(np)np.style.display=tab==='natures'?'':'none';
  if(acp)acp.style.display=tab==='archetypes'?'':'none';
  if(tab==='archetypes')renderArchetypesRef('');
}

// ── Archetypes Reference ───────────────────────────────────
function renderArchetypesRef(q){
  var el=document.getElementById('archRefGrid');if(!el)return;
  var list=typeof BLD_ARCHETYPES!=='undefined'?BLD_ARCHETYPES:[];
  var catIcons={Offense:'ph-sword',Setup:'ph-trend-up',Defense:'ph-shield',Support:'ph-gear',VGC:'ph-trophy'};
  var catOrder=['Offense','Setup','Defense','Support','VGC'];
  var lq=(q||'').toLowerCase();
  var filtered=lq?list.filter(function(a){return a.name.toLowerCase().indexOf(lq)!==-1||a.cat.toLowerCase().indexOf(lq)!==-1||a.desc.toLowerCase().indexOf(lq)!==-1}):list;
  if(!filtered.length){el.innerHTML='<div class="empty"><div class="em">🔍</div>No archetypes found</div>';return;}
  var cats={};
  filtered.forEach(function(a){if(!cats[a.cat])cats[a.cat]=[];cats[a.cat].push(a);});
  var html='';
  catOrder.forEach(function(cat){
    if(!cats[cat])return;
    html+='<div class="ref-arch-cat"><i class="ph-bold '+catIcons[cat]+'"></i>'+cat+'</div>';
    cats[cat].forEach(function(a){
      html+=
        '<div class="ref-arch-card" style="--ac:'+a.color+'">'+
          '<div class="ref-arch-card-head">'+
            '<div class="ref-arch-icon"><i class="ph-bold '+a.icon+'"></i></div>'+
            '<div class="ref-arch-name">'+a.name+'</div>'+
          '</div>'+
          '<div class="ref-arch-desc">'+a.desc+'</div>'+
        '</div>';
    });
  });
  el.innerHTML=html;
}
function onArchRefSearch(q){renderArchetypesRef(q);}

// ═══════════════════════════════════════
// ABILITY MODE TOGGLE (Abilities | By Pokémon) — Drop G.2
// ═══════════════════════════════════════
var refAblMode='abilities';
var ablPkmnCache={};        // pokemonId → [{slot,id,name,desc}]
var refPkmnSelectedId=null;
var refPkmnSelectedName='';
var refPkmnSearchQ='';

function switchAblMode(mode){
  refAblMode=mode;
  refPkmnSelectedId=null;
  refPkmnSearchQ='';
  // Update toggle buttons
  document.querySelectorAll('.ref-mode-btn').forEach(function(b){
    b.classList.toggle('active',b.dataset.mode===mode);
  });
  // Show/hide search blocks
  var aSb=document.getElementById('ablSearchBlock');
  var pSb=document.getElementById('ablPkmnBlock');
  if(aSb)aSb.style.display=mode==='abilities'?'':'none';
  if(pSb)pSb.style.display=mode==='pkmn'?'':'none';
  // Clear Pokémon search input
  var pIn=document.getElementById('ablPkmnSearch');
  if(pIn)pIn.value='';
  if(mode==='abilities'){
    renderAbilities();
  } else {
    renderPkmnAblPrompt();
  }
}

function renderPkmnAblPrompt(){
  var el=document.getElementById('ablList');
  if(!el)return;
  el.innerHTML='<div class="abl-pkmn-prompt"><i class="ph-bold ph-paw-print"></i>Search a Pokémon name to see its legal abilities</div>';
}

function onPkmnAblSearch(v){
  refPkmnSearchQ=v||'';
  refPkmnSelectedId=null;
  renderPkmnAblSearch(refPkmnSearchQ);
}

function renderPkmnAblSearch(q){
  var el=document.getElementById('ablList');
  if(!el)return;
  if(!q){renderPkmnAblPrompt();return;}
  var q2=q.toLowerCase();
  var matches=(allPkmn||[]).filter(function(p){return p.name.toLowerCase().indexOf(q2)!==-1}).slice(0,20);
  if(!matches.length){el.innerHTML='<div class="abl-pkmn-prompt">No Pokémon found for "'+q+'"</div>';return;}
  el.innerHTML=matches.map(function(p){
    return '<div class="abl-pkmn-result" onclick="selectAblPkmn(\''+p.id+'\',\''+p.name.replace(/'/g,"\\'")+'\')">'+
      '<img class="abl-pkmn-sprite" src="'+p.image_url+'" alt="" onerror="this.style.display=\'none\'">'+
      '<span class="abl-pkmn-name">'+p.name+'</span>'+
      '<i class="ph-bold ph-caret-right" style="color:var(--muted);font-size:.75rem"></i>'+
    '</div>';
  }).join('');
}

async function selectAblPkmn(pokemonId,pokemonName){
  refPkmnSelectedId=pokemonId;
  refPkmnSelectedName=pokemonName;
  var el=document.getElementById('ablList');
  if(!el)return;
  el.innerHTML='<div class="abl-pkmn-prompt">Loading…</div>';
  if(!ablPkmnCache[pokemonId]){
    try{
      var rows=await q('pokemon_abilities',{'pokemon_id':'eq.'+pokemonId,select:'slot,ability_id',order:'slot.asc'});
      ablPkmnCache[pokemonId]=rows.map(function(row){
        var abl=allAbilities.find(function(a){return a.id===row.ability_id});
        return{slot:row.slot,id:row.ability_id,name:abl?abl.name:'?',desc:abl?abl.short_description||'':''};
      });
    }catch(e){ablPkmnCache[pokemonId]=[];}
  }
  renderPkmnAblSelected(pokemonId,pokemonName);
}

function backToAblPkmnSearch(){
  refPkmnSelectedId=null;
  renderPkmnAblSearch(refPkmnSearchQ);
}

function renderPkmnAblSelected(pokemonId,pokemonName){
  var el=document.getElementById('ablList');
  if(!el)return;
  var options=ablPkmnCache[pokemonId]||[];
  var SLOT_LABELS={'1':'Ability 1','2':'Ability 2','hidden':'Hidden Ability'};
  var SLOT_CLS={'1':'abl-slot-1','2':'abl-slot-2','hidden':'abl-slot-h'};
  var CAT_MAP={};
  (Object.keys(ABL_CATS)||[]).forEach(function(k){CAT_MAP[k]=ABL_CATS[k]});
  var backHdr='<div class="abl-pkmn-back-hdr">'+
    '<button class="abl-pkmn-back-btn" onclick="backToAblPkmnSearch()"><i class="ph-bold ph-caret-left"></i> Back</button>'+
    '<span class="abl-pkmn-who">'+pokemonName+'</span>'+
  '</div>';
  var cards='';
  if(!options.length){
    cards='<div style="padding:1.5rem 1rem;color:var(--muted);font-size:.82rem;text-align:center">No ability data for this Pokémon yet.<br>Use the admin panel to add entries.</div>';
  } else {
    cards=options.map(function(opt){
      var cat=_ablCategory(opt.name);
      var c=ABL_CATS[cat]||ABL_CATS.support;
      var slotCls=SLOT_CLS[opt.slot]||'abl-slot-1';
      var slotLabel=SLOT_LABELS[opt.slot]||opt.slot;
      return '<div class="abl-card" onclick="showAbilityDetail(\''+opt.id+'\')">'+
        '<div class="abl-icon" style="background:'+c.bg+';color:'+c.c+'"><i class="ph-bold '+c.icon+'"></i></div>'+
        '<div class="abl-body">'+
          '<div class="abl-name">'+opt.name+'</div>'+
          '<div class="abl-desc">'+opt.desc+'</div>'+
        '</div>'+
        '<div class="abl-right">'+
          '<span class="abl-cat-pill '+slotCls+'">'+slotLabel+'</span>'+
          '<span class="abl-chev"><i class="ph-bold ph-caret-right"></i></span>'+
        '</div>'+
      '</div>';
    }).join('');
  }
  el.innerHTML=backHdr+cards;
}

// #SECTION: NATURES
// ═══════════════════════════════════════
// NATURES
// Load and render nature data — Drop G redesign: hybrid EQ bars + archetype tag.
// ═══════════════════════════════════════

var allNatures=[],natSearchQ='';

// Stat display config (EQ bars + detail panel colours)
var NAT_SC={
  attack:    {c:'#f97316',bg:'rgba(249,115,22,.14)', s:'Atk', label:'Attack'},
  sp_attack: {c:'#fdba74',bg:'rgba(253,186,116,.14)',s:'SpA', label:'Sp. Atk'},
  defense:   {c:'#3b82f6',bg:'rgba(59,130,246,.14)', s:'Def', label:'Defense'},
  sp_defense:{c:'#7dd3fc',bg:'rgba(125,211,252,.14)',s:'SpD', label:'Sp. Def'},
  speed:     {c:'#fb7185',bg:'rgba(251,113,133,.14)',s:'Spe', label:'Speed'},
};
var NAT_SK=['attack','sp_attack','defense','sp_defense','speed'];
var NAT_SS=['Atk','SpA','Def','SpD','Spe'];

// Deterministic archetype lookup — derived purely from which stat is boosted/lowered.
var NAT_ARCH={
  Adamant:'Physical Sweeper',  Bold:'Physical Wall',     Brave:'TR Physical Atk',
  Calm:'Special Wall',         Careful:'Cleric Wall',    Gentle:'Sp. Def Pivot',
  Hasty:'Mixed Fast Atk',      Impish:'Physical Wall',   Jolly:'Fast Physical Atk',
  Lax:'One-Sided Tank',        Lonely:'Glass Cannon',    Mild:'Mixed Sp. Atk',
  Modest:'Special Sweeper',    Naive:'Fast Mixed Atk',   Naughty:'Phys + Coverage',
  Quiet:'TR Special Atk',      Rash:'Reckless Sp. Atk',  Relaxed:'TR Physical Wall',
  Sassy:'TR Special Wall',     Timid:'Fast Special Atk',
  Bashful:'All-Rounder',       Docile:'All-Rounder',     Hardy:'All-Rounder',
  Quirky:'All-Rounder',        Serious:'All-Rounder',
};

async function loadNatures(){try{allNatures=await q('natures',{order:'name.asc'});renderNatures()}catch(e){}}

function onNatSearch(v){natSearchQ=v||'';renderNatures()}

function _natEqBars(n){
  var bars='<div class="eq-bars">';
  NAT_SK.forEach(function(k,j){
    var isUp=n.increased_stat===k, isDown=n.decreased_stat===k;
    var sc=NAT_SC[k];
    var h=isUp?'90%':isDown?'12%':'48%';
    var op=isUp?'.95':isDown?'.9':'.22';
    var trackOp=isDown?'opacity:.28;':'';
    bars+='<div class="eq-col">'+
      '<div class="eq-track" style="height:28px;background:var(--surface2);'+trackOp+'">'+
        '<div class="eq-fill" style="height:'+h+';background:'+sc.c+';opacity:'+op+'"></div>'+
      '</div>'+
      '<div class="eq-lbl" style="'+(isUp?'color:'+sc.c+';font-weight:900;':isDown?'opacity:.3;':'')+'">'+NAT_SS[j]+'</div>'+
    '</div>';
  });
  return bars+'</div>';
}

function renderNatures(){
  var el=document.getElementById('natHybridGrid');
  if(!el)return;
  var q2=natSearchQ.toLowerCase();
  var list=allNatures.filter(function(n){return!q2||n.name.toLowerCase().indexOf(q2)!==-1});
  if(!list.length){el.innerHTML='<div class="empty"><div class="em">🔍</div>No natures match</div>';return}
  el.innerHTML=list.map(function(n,i){
    var arch=NAT_ARCH[n.name]||'—';
    var upC=n.increased_stat?NAT_SC[n.increased_stat].c:'var(--muted)';
    var upBg=n.increased_stat?NAT_SC[n.increased_stat].bg:'var(--surface)';
    return '<div class="nat-hybrid" onclick="showNatureDetail(\''+n.name+'\')">'+
      '<div class="nat-hybrid-name">'+n.name+'</div>'+
      _natEqBars(n)+
    '</div>';
  }).join('');
}

function showNatureDetail(name){
  var n=allNatures.find(function(x){return x.name===name});
  if(!n)return;
  var arch=NAT_ARCH[n.name]||'—';
  var upC=n.increased_stat?NAT_SC[n.increased_stat].c:'var(--muted)';
  var upBg=n.increased_stat?NAT_SC[n.increased_stat].bg:'var(--surface)';
  var usedCount=(window.allBuilds||[]).filter(function(b){return(b.nature||'').toLowerCase()===n.name.toLowerCase()}).length;
  var mods='';
  if(n.increased_stat){
    var u=NAT_SC[n.increased_stat],d=NAT_SC[n.decreased_stat];
    mods='<div class="nat-det-mods">'+
      '<div class="nat-det-row" style="background:'+u.bg+'">'+
        '<span class="nat-det-arrow" style="color:'+u.c+'">▲</span>'+
        '<span class="nat-det-stat" style="color:'+u.c+'">'+u.label+'</span>'+
        '<span class="nat-det-pct" style="color:'+u.c+'">+10%</span>'+
      '</div>'+
      '<div class="nat-det-row" style="background:'+d.bg+';opacity:.75">'+
        '<span class="nat-det-arrow" style="color:'+d.c+'">▼</span>'+
        '<span class="nat-det-stat" style="color:'+d.c+'">'+d.label+'</span>'+
        '<span class="nat-det-pct" style="color:'+d.c+'">−10%</span>'+
      '</div>'+
    '</div>';
  } else {
    mods='<div style="color:var(--muted);font-size:.82rem;padding:.2rem 0">No stat changes — all multipliers at 1.0×</div>';
  }
  var det=document.getElementById('refDetInner');
  if(!det)return;
  det.innerHTML=
    '<div class="nat-det-hero">'+
      '<div class="nat-det-icon" style="background:'+upBg+';color:'+upC+'"><i class="ph-bold ph-dna"></i></div>'+
      '<div>'+
        '<div class="nat-det-name">'+n.name+'</div>'+
        '<span class="nat-det-tag" style="background:'+upBg+';color:'+upC+'">'+arch+'</span>'+
      '</div>'+
    '</div>'+
    '<div class="p-header" style="padding:.3rem 1.2rem .7rem;border-bottom:1px solid var(--border)">'+
      '<div style="font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Stat Modifiers</div>'+
      mods+
    '</div>'+
    '<div class="p-header" style="padding:.7rem 1.2rem .8rem">'+
      '<div style="font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Usage</div>'+
      (usedCount>0
        ?'<span style="display:inline-flex;align-items:center;gap:.3rem;padding:.28rem .65rem;border-radius:8px;font-size:.71rem;font-weight:700;background:var(--red-bg);color:var(--red)"><i class="ph-bold ph-sword"></i> Used in '+usedCount+' build'+(usedCount!==1?'s':'')+'</span>'
        :'<span style="display:inline-flex;padding:.28rem .65rem;border-radius:8px;font-size:.71rem;font-weight:700;background:var(--surface);color:var(--muted)">Not used in any builds yet</span>')+
    '</div>';
  document.getElementById('refDetOv').classList.add('open');
}

// ═══════════════════════════════════════
// #SECTION: PROFILE & ACHIEVEMENTS
// ═══════════════════════════════════════
// PROFILE & ACHIEVEMENTS
// Trainer profile, avatar, display name,
// achievements, and activity history.
// ═══════════════════════════════════════

var allAch=[],userAch={},userProfile=null;
var _likesReceivedCount=0; // Drop I.3: cached total likes on own content
// Drop I.2: friends state
var allFriends=[],pendingFriends=[],_frRowOpen=false,_ffTab='search',_ffQrDone=false;
// Profile section state
var profAchFilter='all'; // 'all'|'unlocked'|'locked'|'nearly'
var profAchOpen=true,profActOpen=true,profAccOpen=false;

async function loadAchievements(){try{allAch=await q('achievements',{order:'sort_order.asc'});return allAch}catch(e){return[]}}
async function loadUserAch(){if(!tk)return;try{var rows=await q('user_achievements',{select:'achievement_id,unlocked_at'},true);userAch={};rows.forEach(function(r){userAch[r.achievement_id]=r.unlocked_at})}catch(e){}}
async function loadProfile(){if(!tk)return;try{var rows=await q('user_profiles',{user_id:'eq.'+usr.id},true);if(rows.length)userProfile=rows[0];else{await ins('user_profiles',{user_id:usr.id,display_name:usr.email.split('@')[0]},true);var rows2=await q('user_profiles',{user_id:'eq.'+usr.id},true);userProfile=rows2[0]||null}}catch(e){}}

// Drop I.2 — load friends from the friends table (RLS ensures only own rows)
async function loadFriends(){
  if(!tk||!usr)return;
  try{
    var rows=await authFetch(API+'/rest/v1/friends?or=(requester_id.eq.'+usr.id+',addressee_id.eq.'+usr.id+')&select=id,requester_id,addressee_id,status,created_at',{headers:h(true)}).then(function(r){return r.json()});
    if(!rows||rows.error||!rows.length){allFriends=[];pendingFriends=[];return;}
    var otherIds=rows.map(function(r){return r.requester_id===usr.id?r.addressee_id:r.requester_id}).filter(Boolean);
    var profiles=otherIds.length?await q('user_profiles',{'user_id':'in.('+otherIds.join(',')+')', 'select':'user_id,display_name,username,avatar_url'}):[];
    var pm={};(profiles||[]).forEach(function(p){pm[p.user_id]=p;});
    allFriends=rows.map(function(r){
      var iReq=r.requester_id===usr.id;
      var fid=iReq?r.addressee_id:r.requester_id;
      var p=pm[fid]||{};
      return{id:r.id,friend_id:fid,status:r.status,i_am_requester:iReq,
        display_name:p.display_name||'Trainer',username:p.username||'',avatar_url:p.avatar_url||'',created_at:r.created_at};
    });
    pendingFriends=allFriends.filter(function(f){return f.status==='pending'&&!f.i_am_requester;});
  }catch(e){allFriends=[];pendingFriends=[];}
}

function triggerAvatarUpload(){document.getElementById('avatarInput').click()}
function handleAvatarFile(input){
  if(!input.files||!input.files[0])return;
  var file=input.files[0];
  if(!file.type.startsWith('image/')){toast('Please select an image','err');return}
  var reader=new FileReader();
  reader.onload=function(e){
    // Resize to 128x128 using canvas
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
      var ctx=canvas.getContext('2d');
      var size=Math.min(img.width,img.height);
      var sx=(img.width-size)/2,sy=(img.height-size)/2;
      ctx.drawImage(img,sx,sy,size,size,0,0,128,128);
      var dataUrl=canvas.toDataURL('image/jpeg',0.8);
      saveAvatar(dataUrl)
    };img.src=e.target.result
  };reader.readAsDataURL(file)
}
async function saveAvatar(dataUrl){
  if(!userProfile)return;
  try{
    await upd('user_profiles',{'user_id':'eq.'+usr.id},{avatar_url:dataUrl},true);
    userProfile.avatar_url=dataUrl;
    updProfileNavIcon();
    toast('Avatar updated!');
    renderProfile();
  }catch(e){toast(e.message,'err')}
}
async function saveDisplayName(){var inp=document.getElementById('dnInput');if(!inp||!userProfile)return;var name=inp.value.trim();if(!name)return;try{await upd('user_profiles',{'user_id':'eq.'+usr.id},{display_name:name},true);userProfile.display_name=name;toast('Name updated!');renderProfile()}catch(e){toast(e.message,'err')}}

async function checkAchievements(){
  if(!tk||!allAch.length)return;
  var obtC=Object.keys(uDex).length,shC=Object.keys(uShinyDex).length,blC=allBuilds.length,tmC=allTeams.length,itC=Object.keys(uItems).length;
  var hasFull=allTeams.some(function(t){return(t.members||[]).length>=6});
  var hasMax=allBuilds.some(function(b){return b.hp_sp>=32||b.atk_sp>=32||b.def_sp>=32||b.spa_sp>=32||b.spd_sp>=32||b.spe_sp>=32});
  var hasFullSp=allBuilds.some(function(b){return(b.total_sp||0)>=66});
  // Drop I.1: new check_type computed values (all derived from already-loaded allBuilds/allPkmn)
  var fullMovesetC=allBuilds.filter(function(b){return b.move_1&&b.move_2&&b.move_3&&b.move_4}).length;
  var natBuildsC=allBuilds.filter(function(b){return b.nature_id}).length;
  var doublesC=allBuilds.filter(function(b){return b.battle_format==='Doubles'}).length;
  var winConC=allBuilds.filter(function(b){return b.win_condition}).length;
  var strategicC=allBuilds.filter(function(b){return b.win_condition&&b.strengths&&b.weaknesses}).length;
  var publicBlC=allBuilds.filter(function(b){return b.is_public}).length;
  var hasBothFormats=allBuilds.some(function(b){return b.battle_format==='Singles'})&&allBuilds.some(function(b){return b.battle_format==='Doubles'});
  var hasMegaBuild=allBuilds.some(function(b){var p=allPkmn.find(function(x){return x.id===b.pokemon_id});return p&&p.form==='Mega'});
  var _btSet=new Set(allBuilds.map(function(b){var p=allPkmn.find(function(x){return x.id===b.pokemon_id});return p?p.type_1:null}).filter(Boolean));
  var buildTypeVariety=_btSet.size;
  // Drop I.3: social counters — friends (sync) + likes received (async)
  var friendsC=allFriends.filter(function(f){return f.status==='accepted';}).length;
  var myBldIds=allBuilds.map(function(b){return b.id;});
  var myTmIds=allTeams.map(function(t){return t.id;});
  try{
    var _lr=await Promise.allSettled([
      myBldIds.length?authFetch(API+'/rest/v1/build_likes?build_id=in.('+myBldIds.join(',')+')'+'&select=id',{headers:h(true)}).then(function(r){return r.json();}):Promise.resolve([]),
      myTmIds.length?authFetch(API+'/rest/v1/team_likes?team_id=in.('+myTmIds.join(',')+')'+'&select=id',{headers:h(true)}).then(function(r){return r.json();}):Promise.resolve([])
    ]);
    _likesReceivedCount=((_lr[0].status==='fulfilled'&&Array.isArray(_lr[0].value))?_lr[0].value.length:0)+
                        ((_lr[1].status==='fulfilled'&&Array.isArray(_lr[1].value))?_lr[1].value.length:0);
  }catch(e){_likesReceivedCount=0;}
  var newUnlocks=[];
  // Achievement rules are data-driven: each row supplies a `check_type` and threshold to evaluate here.
  for(var i=0;i<allAch.length;i++){
    var a=allAch[i];if(userAch[a.id])continue;
    var earned=false;
    if(a.check_type==='obtained_count')earned=obtC>=a.threshold;
    else if(a.check_type==='shiny_count')earned=shC>=a.threshold;
    else if(a.check_type==='builds_count')earned=blC>=a.threshold;
    else if(a.check_type==='teams_count')earned=tmC>=a.threshold;
    else if(a.check_type==='items_count')earned=itC>=a.threshold;
    else if(a.check_type==='full_team')earned=hasFull;
    else if(a.check_type==='max_stat')earned=hasMax;
    else if(a.check_type==='full_sp')earned=hasFullSp;
    // Drop I.1 check_types
    else if(a.check_type==='full_moveset_count')earned=fullMovesetC>=a.threshold;
    else if(a.check_type==='nature_builds_count')earned=natBuildsC>=a.threshold;
    else if(a.check_type==='doubles_builds')earned=doublesC>=a.threshold;
    else if(a.check_type==='win_condition_count')earned=winConC>=a.threshold;
    else if(a.check_type==='strategic_builds')earned=strategicC>=a.threshold;
    else if(a.check_type==='public_builds_count')earned=publicBlC>=a.threshold;
    else if(a.check_type==='both_formats')earned=hasBothFormats;
    else if(a.check_type==='mega_builds')earned=hasMegaBuild;
    else if(a.check_type==='build_type_variety')earned=buildTypeVariety>=a.threshold;
    // Drop I.3: social check_types
    else if(a.check_type==='friends_count')earned=friendsC>=a.threshold;
    else if(a.check_type==='likes_received_count')earned=_likesReceivedCount>=a.threshold;
    if(earned){
      try{var u2=new URL(API+'/rest/v1/user_achievements');u2.searchParams.set('on_conflict','user_id,achievement_id');
        await fetch(u2.toString(),{method:'POST',headers:Object.assign(h(true),{'Prefer':'return=representation,resolution=merge-duplicates'}),body:JSON.stringify({user_id:usr.id,achievement_id:a.id})});
        userAch[a.id]=new Date().toISOString();newUnlocks.push(a)}catch(e){}
    }
  }
  if(newUnlocks.length){newUnlocks.forEach(function(a){toast('🏆 Achievement: '+a.name+'!')});}
  // Always re-render after async check so social progress bars (likes_received_count) reflect live data
  renderProfile();
}

function togProfSection(sec){
  if(sec==='ach')profAchOpen=!profAchOpen;
  else if(sec==='act')profActOpen=!profActOpen;
  else if(sec==='acc')profAccOpen=!profAccOpen;
  renderProfile();
}
function setProfAchFilter(f){profAchFilter=f;renderProfile();}
function _profSection(key,title,badge,open,content){
  return '<div class="prof-section">'+
    '<div class="prof-sec-hdr" onclick="togProfSection(\''+key+'\')">'+
      '<div class="prof-sec-left">'+title+(badge?' <span class="prof-sec-badge">'+badge+'</span>':'')+'</div>'+
      '<span class="prof-sec-chev'+(open?' open':'')+'">▾</span>'+
    '</div>'+
    '<div class="prof-sec-body'+(open?' open':'')+'">'+content+'</div>'+
  '</div>';
}
function openBuildFromProfile(id){
  if(typeof showBuildDetail==='function')showBuildDetail(id,'profile');
  if(typeof dashNav==='function')dashNav('builds');
}
function openTeamFromProfile(id){
  if(typeof showTeamDetail==='function')showTeamDetail(id,'profile');
  if(typeof dashNav==='function')dashNav('teams');
}

function renderProfile(){
  var c=document.getElementById('profileContent');
if(!usr){
  c.innerHTML='<div class="card" style="max-width:420px;margin:0 auto;text-align:center"><div style="font-size:2rem;margin-bottom:.35rem">🔐</div><h3 style="font-size:1rem;font-weight:700;margin-bottom:.3rem">Login to view your profile</h3><p style="font-size:.84rem;color:var(--muted);line-height:1.5">Sign in to access your saved profile, achievements, teams, and build history.</p><button class="btn btn-red" style="margin-top:.9rem" onclick="showLoginModal(\'Sign in to view your trainer profile and saved progress.\')">Login</button></div>';
  updProfileNavIcon();
  return
}
  var dn=userProfile?userProfile.display_name||usr.email.split('@')[0]:usr.email.split('@')[0];
  var obtC=Object.keys(uDex).length,shC=Object.keys(uShinyDex).length,blC=allBuilds.length,tmC=allTeams.length,itC=Object.keys(uItems).length;
  var achUnlocked=allAch.filter(function(a){return userAch[a.id]}).length;
  // Drop I.1: progress values for achievement bars
  var _achProg={
    obtained_count:obtC, shiny_count:shC, builds_count:blC, teams_count:tmC, items_count:itC,
    full_moveset_count:allBuilds.filter(function(b){return b.move_1&&b.move_2&&b.move_3&&b.move_4}).length,
    nature_builds_count:allBuilds.filter(function(b){return b.nature_id}).length,
    doubles_builds:allBuilds.filter(function(b){return b.battle_format==='Doubles'}).length,
    win_condition_count:allBuilds.filter(function(b){return b.win_condition}).length,
    strategic_builds:allBuilds.filter(function(b){return b.win_condition&&b.strengths&&b.weaknesses}).length,
    public_builds_count:allBuilds.filter(function(b){return b.is_public}).length,
    build_type_variety:new Set(allBuilds.map(function(b){var p=allPkmn.find(function(x){return x.id===b.pokemon_id});return p?p.type_1:null}).filter(Boolean)).size,
    // Drop I.3: social progress
    friends_count:allFriends.filter(function(f){return f.status==='accepted';}).length,
    likes_received_count:_likesReceivedCount
  };
  // Trainer Card
  var avHtml=userProfile&&userProfile.avatar_url?'<img src="'+userProfile.avatar_url+'" alt="Avatar">':'<img src="icons/logo.png" alt="PC" style="padding:4px">';
  var unDisplay=userProfile&&userProfile.username
    ?'<div class="tc-username"><span class="tc-un-at">@</span>'+userProfile.username+'<button class="tc-un-edit" onclick="showUsernameModal(null)" title="Change username">✏️</button></div>'
    :'<button class="tc-un-set" onclick="showUsernameModal(null)">Set username →</button>';
  var card='<input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatarFile(this)"><div class="trainer-card"><div class="tc-wm">'+pb(200)+'</div><div class="tc-top"><div class="tc-avatar" onclick="triggerAvatarUpload()">'+avHtml+'<div class="av-overlay">📷 Change</div></div><div class="tc-info"><div class="tc-label">Trainer</div><h2>'+dn+'</h2><div class="tc-email">'+usr.email+'</div><div class="name-edit"><input id="dnInput" value="'+dn+'" placeholder="Display name"><button onclick="saveDisplayName()">Save</button></div>'+unDisplay+'</div></div><div class="tc-stats"><div class="tc-stat"><div class="tc-sv" style="color:#22c55e">'+obtC+'</div><div class="tc-sl">Obtained</div></div><div class="tc-stat"><div class="tc-sv" style="color:#8b5cf6">'+shC+'</div><div class="tc-sl">Shinies</div></div><div class="tc-stat"><div class="tc-sv" style="color:#3b82f6">'+blC+'</div><div class="tc-sl">Builds</div></div><div class="tc-stat"><div class="tc-sv" style="color:#f59e0b">'+tmC+'</div><div class="tc-sl">Teams</div></div><div class="tc-stat"><div class="tc-sv" style="color:#ef4444">'+achUnlocked+'<span style="font-size:.8rem;opacity:.5">/'+allAch.length+'</span></div><div class="tc-sl">Achievements</div></div></div></div>';
  // Social summary stats
  var _friendCount=allFriends.filter(function(f){return f.status==='accepted';}).length;
  var _pubBuilds=allBuilds.filter(function(b){return b.is_public;}).length;
  var _pubTeams=allTeams.filter(function(t){return t.is_public;}).length;
  var socialHtml='<div class="prof-social-stats">'+
    '<div class="prof-ss-item"><div class="prof-ss-val">'+_friendCount+'</div><div class="prof-ss-lbl">Friends</div></div>'+
    '<div class="prof-ss-item"><div class="prof-ss-val">'+_likesReceivedCount+'</div><div class="prof-ss-lbl">Likes Received</div></div>'+
    '<div class="prof-ss-item"><div class="prof-ss-val">'+_pubBuilds+'</div><div class="prof-ss-lbl">Public Builds</div></div>'+
    '<div class="prof-ss-item"><div class="prof-ss-val">'+_pubTeams+'</div><div class="prof-ss-lbl">Public Teams</div></div>'+
  '</div>';

  // Achievements
  var catOrder=['collection','shiny','builds','teams','items','milestones','moves','nature','competitive','explorer','social'];
  var catLabels={collection:'Collection',shiny:'Shiny',builds:'Builds',teams:'Teams',items:'Items',milestones:'Milestones',moves:'Moves',nature:'Nature',competitive:'Competitive',explorer:'Explorer',social:'Social'};
  var catColors={collection:'#22c55e',shiny:'#a78bfa',builds:'#f97316',teams:'#3b82f6',items:'#f59e0b',milestones:'#94a3b8',moves:'#ef4444',nature:'#14b8a6',competitive:'#6366f1',explorer:'#d97706',social:'#ec4899'};
  var _boolChecks={full_team:true,max_stat:true,full_sp:true,both_formats:true,mega_builds:true};

  // Filter pills
  var achFilterHtml='<div class="prof-ach-filters">'+
    [{k:'all',l:'All'},{k:'unlocked',l:'Unlocked'},{k:'locked',l:'Locked'},{k:'nearly',l:'Nearly There'}].map(function(f){
      return '<button class="prof-ach-pill'+(profAchFilter===f.k?' active':'')+'" onclick="setProfAchFilter(\''+f.k+'\')">'+f.l+'</button>';
    }).join('')+
  '</div>';

  var achGridHtml=catOrder.map(function(cat){
    var items=allAch.filter(function(a){
      if(a.category!==cat)return false;
      if(profAchFilter==='unlocked')return!!userAch[a.id];
      if(profAchFilter==='locked')return!userAch[a.id];
      if(profAchFilter==='nearly'){
        if(userAch[a.id])return false;
        if(_boolChecks[a.check_type])return false;
        if(_achProg[a.check_type]===undefined||a.threshold<=1)return false;
        return _achProg[a.check_type]/a.threshold>=0.5;
      }
      return true;
    });
    if(!items.length)return'';
    var cc=catColors[cat]||'var(--muted)';
    return'<div style="margin:.8rem 0 0;padding:0 1rem">'+
      '<span class="ach-cat-hdr" style="color:'+cc+'">'+catLabels[cat]+'</span>'+
      '<div class="ach-grid">'+items.map(function(a){
        var unlocked=!!userAch[a.id];
        var dt=unlocked?new Date(userAch[a.id]):null;
        var dateStr=dt?dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
        var progHtml='';
        if(!unlocked&&!_boolChecks[a.check_type]&&_achProg[a.check_type]!==undefined&&a.threshold>1){
          var cur=Math.min(_achProg[a.check_type],a.threshold);
          var pct=Math.round(cur/a.threshold*100);
          progHtml='<div class="ach-prog"><div class="ach-prog-bar-track"><div class="ach-prog-bar" style="width:'+pct+'%;background:'+cc+'"></div></div><span class="ach-prog-txt">'+cur+' / '+a.threshold+'</span></div>';
        }
        return'<div class="ach-card '+(unlocked?'unlocked':'locked')+'" style="'+(unlocked?'border-color:'+cc+'22':'')+'">'+
          '<div class="ach-icon">'+a.icon+'</div>'+
          '<div class="ach-info"><div class="ach-name">'+a.name+'</div><div class="ach-desc">'+a.description+'</div>'+progHtml+(unlocked?'<div class="ach-date">Unlocked '+dateStr+'</div>':'')+'</div></div>'
      }).join('')+'</div></div>'
  }).join('');
  if(!achGridHtml)achGridHtml='<div class="empty" style="padding:2rem 1rem"><div class="em">🔍</div>No achievements match this filter</div>';
  var achSectionHtml=_profSection('ach','🏆 Achievements',achUnlocked+' / '+allAch.length+' unlocked',profAchOpen,achFilterHtml+achGridHtml+'<div style="height:.8rem"></div>');
  // Recent Activity
  var _acts=allBuilds.slice(0,5).map(function(b){var bImg=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');return{img:bImg,text:b.build_name,sub:'Build',time:b.created_at,id:b.id,kind:'build'};});
  allTeams.slice(0,3).forEach(function(t){_acts.push({img:'',text:t.name,sub:'Team',time:t.created_at,id:t.id,kind:'team'});});
  _acts.sort(function(a,b){return new Date(b.time)-new Date(a.time)});
  var actItems=_acts.slice(0,8).map(function(a){
    var d=new Date(a.time);var ds=d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    var onclick=a.kind==='build'?'openBuildFromProfile(\''+a.id+'\')':'openTeamFromProfile(\''+a.id+'\')';
    var icon=a.kind==='build'
      ?(a.img?'<img src="'+a.img+'" onerror="this.style.opacity=\'0.2\'">'
             :'<div class="act-placeholder"><i class="ph-bold ph-sword"></i></div>')
      :'<div class="act-placeholder"><i class="ph-bold ph-trophy"></i></div>';
    return'<div class="act-item" onclick="'+onclick+'">'+icon+
      '<div class="act-info"><span class="act-text">'+a.text+'</span><span class="act-sub">'+a.sub+'</span></div>'+
      '<span class="act-time">'+ds+'</span>'+
      '<i class="ph-bold ph-caret-right act-chev"></i>'+
    '</div>';
  }).join('')||'<div class="empty" style="padding:1.5rem"><div class="em">📝</div>No activity yet</div>';
  var actSectionHtml=_profSection('act','📝 Recent Activity','',profActOpen,'<div class="activity-list" style="padding:.4rem 1rem .6rem">'+actItems+'</div>');
  var accountHtml=_profSection('acc','⚙️ Account','',profAccOpen,
    '<div class="prof-account-actions">'+
      '<div class="prof-account-row"><span class="prof-account-email"><i class="ph-bold ph-envelope"></i> '+usr.email+'</span></div>'+
      '<button class="btn btn-ghost prof-signout-btn" onclick="logout()"><i class="ph-bold ph-sign-out"></i> Sign Out</button>'+
      '<a class="prof-support-btn" href="https://ko-fi.com/otterlyclueless" target="_blank" rel="noopener noreferrer"><i class="ph-bold ph-coffee"></i> Support this project</a>'+
    '</div>'+
    '<div class="prof-danger-card">'+
      '<div class="prof-danger-label"><i class="ph-bold ph-warning"></i> Danger Zone</div>'+
      '<p class="prof-delete-hint">Permanently removes all your builds, teams, Pokédex progress, and account data.</p>'+
      '<button class="btn prof-delete-btn" onclick="confirmDeleteAccount()"><i class="ph-bold ph-trash"></i> Delete Account</button>'+
    '</div>'+
  '<div style="height:.5rem"></div>');
  c.innerHTML='<div class="prof-left">'+card+socialHtml+renderFriendsRow()+'</div><div class="prof-right">'+achSectionHtml+actSectionHtml+accountHtml+'</div>';
updProfileNavIcon();
}

// ─── Drop I.2: Friends system ─────────────────────────────────────────────────
function updProfileNavBadge(){
  var badge=document.getElementById('frNavBadge');if(!badge)return;
  var n=pendingFriends.length;badge.textContent=n>0?n:'';badge.style.display=n>0?'flex':'none';
}

function renderFriendsRow(){
  var accepted=allFriends.filter(function(f){return f.status==='accepted';});
  var pend=pendingFriends.length;
  var pendBadge=pend?'<span class="fr-pending-badge">'+pend+' pending</span>':'';
  var expanded='';
  if(pend){
    expanded+='<div class="fr-pending-lbl">⏳ Pending <span class="fr-pcount">'+pend+'</span></div>';
    expanded+=pendingFriends.map(function(f){
      return'<div class="fr-pending-card" id="frpc-'+f.id+'">'+
        '<div class="fr-av">'+_frAv(f)+'</div>'+
        '<div class="fr-info"><div class="fr-name">'+_fesc(f.display_name)+'</div>'+(f.username?'<div class="fr-un">@'+_fesc(f.username)+'</div>':'')+'</div>'+
        '<div class="fr-pbtns"><button class="fr-accept" onclick="acceptFriend(\''+f.id+'\')">✓</button><button class="fr-decline" onclick="declineFriend(\''+f.id+'\')">✕</button></div>'+
      '</div>';
    }).join('');
  }
  if(pend&&accepted.length)expanded+='<div class="fr-divider"></div>';
  if(accepted.length){
    expanded+=accepted.map(function(f){
      var go=f.username?'location.hash=\'#/u/'+encodeURIComponent(f.username)+'\'':'';
      return'<div class="fr-item" onclick="'+go+'">'+
        '<div class="fr-av">'+_frAv(f)+'</div>'+
        '<div class="fr-info"><div class="fr-name">'+_fesc(f.display_name)+'</div>'+(f.username?'<div class="fr-un">@'+_fesc(f.username)+'</div>':'')+'</div>'+
        '<span class="fr-chev">›</span>'+
      '</div>';
    }).join('');
  }
  if(!accepted.length&&!pend)expanded='<div class="fr-empty">No friends yet — tap Find + to add some!</div>';
  return'<div class="fr-collapse">'+
    '<div class="fr-row" onclick="toggleFriendsRow()">'+
      '<div class="fr-row-left">'+
        '<span class="fr-row-icon">👥</span>'+
        '<span class="fr-row-label">Friends</span>'+
        '<span class="fr-row-count">'+accepted.length+' friend'+(accepted.length!==1?'s':'')+'</span>'+
        pendBadge+
      '</div>'+
      '<div class="fr-row-right">'+
        '<button class="fr-find-pill" onclick="event.stopPropagation();openFindFriends()">Find +</button>'+
        '<span class="fr-chev-main" id="frChev">▾</span>'+
      '</div>'+
    '</div>'+
    '<div class="fr-panel" id="frPanel">'+expanded+'</div>'+
  '</div>';
}
function _frAv(f){return f.avatar_url?'<img src="'+_fesc(f.avatar_url)+'" style="width:34px;height:34px;border-radius:10px;object-fit:cover" onerror="this.style.display=\'none\'">':'<span style="font-size:.9rem">👤</span>';}
function _fesc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function toggleFriendsRow(){
  _frRowOpen=!_frRowOpen;
  var p=document.getElementById('frPanel'),c=document.getElementById('frChev');
  if(p)p.classList.toggle('open',_frRowOpen);
  if(c)c.classList.toggle('open',_frRowOpen);
}

async function acceptFriend(rowId){
  try{
    await authFetch(API+'/rest/v1/friends?id=eq.'+rowId,{method:'PATCH',headers:Object.assign(h(true),{'Prefer':'return=minimal'}),body:JSON.stringify({status:'accepted'})});
    var f=allFriends.find(function(x){return x.id===rowId;});if(f)f.status='accepted';
    pendingFriends=allFriends.filter(function(f){return f.status==='pending'&&!f.i_am_requester;});
    toast('Friend added! 👥');renderProfile();updProfileNavBadge();
  }catch(e){toast('Could not accept','err');}
}
async function declineFriend(rowId){
  try{
    await authFetch(API+'/rest/v1/friends?id=eq.'+rowId,{method:'DELETE',headers:h(true)});
    allFriends=allFriends.filter(function(f){return f.id!==rowId;});
    pendingFriends=allFriends.filter(function(f){return f.status==='pending'&&!f.i_am_requester;});
    renderProfile();updProfileNavBadge();
  }catch(e){toast('Could not decline','err');}
}

function openFindFriends(){
  _ffQrDone=false;
  var ov=document.getElementById('findFriendsOv');if(!ov)return;
  ov.innerHTML='<div class="ff-sheet">'+
    '<div class="ff-handle"></div>'+
    '<div class="ff-head"><div class="ff-title">Find Friends</div><button class="ff-close" onclick="closeFindFriends()">✕</button></div>'+
    '<div class="ff-tabs">'+
      '<button class="ff-tab active" id="ffTabSearch" onclick="ffSwitchTab(\'search\')">🔍 Search</button>'+
      '<button class="ff-tab" id="ffTabShare" onclick="ffSwitchTab(\'share\')">🔗 Share Link</button>'+
    '</div>'+
    '<div class="ff-search-pane" id="ffSearchPane">'+
      '<div class="ff-search-wrap"><input class="ff-search" id="ffSearchInput" placeholder="Search by @username…" oninput="ffFilter(this.value)" autocomplete="off"></div>'+
      '<div class="ff-list" id="ffList"></div>'+
    '</div>'+
    '<div class="ff-share-pane" id="ffSharePane" style="display:none"></div>'+
  '</div>';
  ov.classList.add('open');
  ov.onclick=function(e){if(e.target===ov)closeFindFriends();};
  _ffTab='search';
  ffRenderList('');
  setTimeout(function(){var inp=document.getElementById('ffSearchInput');if(inp)inp.focus();},300);
}
function closeFindFriends(){var ov=document.getElementById('findFriendsOv');if(ov)ov.classList.remove('open');}

function ffSwitchTab(tab){
  _ffTab=tab;
  var sp=document.getElementById('ffSearchPane'),shp=document.getElementById('ffSharePane');
  document.getElementById('ffTabSearch').classList.toggle('active',tab==='search');
  document.getElementById('ffTabShare').classList.toggle('active',tab==='share');
  if(sp)sp.style.display=tab==='search'?'flex':'none';
  if(shp)shp.style.display=tab==='share'?'flex':'none';
  if(tab==='share')_ffRenderShare();
}
// ─── QR Customiser (Drop I.2b) ───────────────────────────────────────────────
var _ffQrStyle={color:'red',frame:'neon',overlay:'pokemon'};
var _ffQrPkmn='';var _ffQrUrl='';var _ffSaveTimer=null;
var _FF_COLORS={
  red:    {d:'ef4444',db:'111318',l:'dc2626',lb:'f8fafc',hex:'#ef4444'},
  gold:   {d:'f59e0b',db:'111318',l:'d97706',lb:'f8fafc',hex:'#f59e0b'},
  purple: {d:'a78bfa',db:'111318',l:'7c3aed',lb:'f8fafc',hex:'#a78bfa'},
  sky:    {d:'7dd3fc',db:'111318',l:'0284c7',lb:'f8fafc',hex:'#7dd3fc'},
  pink:   {d:'ec4899',db:'111318',l:'db2777',lb:'f8fafc',hex:'#ec4899'},
  green:  {d:'22c55e',db:'111318',l:'16a34a',lb:'f8fafc',hex:'#22c55e'},
};

function _ffRenderShare(){
  if(_ffQrDone)return;_ffQrDone=true;
  var pane=document.getElementById('ffSharePane');if(!pane)return;
  var username=userProfile&&userProfile.username;
  if(!username){
    pane.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;padding:2rem 1rem;text-align:center;gap:.5rem">'+
      '<div style="font-size:1.5rem">🔗</div>'+
      '<div style="font-size:.82rem;font-weight:700">No username set</div>'+
      '<a href="#" onclick="showUsernameModal(null);closeFindFriends()" style="color:var(--pink);font-size:.8rem;font-weight:800">Set one now →</a>'+
    '</div>';
    return;
  }
  // Load saved style or use defaults (red+neon+pokemon)
  var saved={color:'red',frame:'neon',overlay:'pokemon'};
  if(userProfile&&userProfile.qr_style){try{saved=JSON.parse(userProfile.qr_style);}catch(e){}}
  _ffQrStyle=saved;
  _ffQrUrl=location.origin+location.pathname.replace(/\/index\.html$/,'/')+'#/u/'+encodeURIComponent(username);
  _ffQrPkmn=allBuilds&&allBuilds.length?(allBuilds[0].image_url||allBuilds[0].sprite_url||''):'';
  // Build colour swatches
  var swatches=['red','gold','purple','sky','pink','green'].map(function(c){
    return'<div class="ff-swatch'+(c===saved.color?' ff-swatch-act':'')+'" data-color="'+c+'" style="background:'+_FF_COLORS[c].hex+'" onclick="_ffPickColor(\''+c+'\')"></div>';
  }).join('');
  // Build frame options
  var frames=[['none','None'],['glow','Glow'],['ring','Ring'],['gradient','Gradient'],['neon','Neon'],['champion','Champion']];
  var frameOpts=frames.map(function(f){
    return'<button class="ff-frame-opt'+(f[0]===saved.frame?' active':'')+'" data-frame="'+f[0]+'" onclick="_ffPickFrame(\''+f[0]+'\')">'+f[1]+'</button>';
  }).join('');
  // Build overlay options
  var ovOpts=
    '<div class="ff-ov-opt'+(saved.overlay==='none'?' active':'')+'" data-ov="none" onclick="_ffPickOv(\'none\')" style="font-size:.58rem;font-weight:700;color:var(--muted)">None</div>'+
    '<div class="ff-ov-opt'+(saved.overlay==='bolt'?' active':'')+'" data-ov="bolt" onclick="_ffPickOv(\'bolt\')">⚡</div>'+
    '<div class="ff-ov-opt'+(saved.overlay==='pokeball'?' active':'')+'" data-ov="pokeball" onclick="_ffPickOv(\'pokeball\')"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="10" fill="#ef4444" stroke="#fff" stroke-width="1.5"/><path d="M1 11h20" stroke="white" stroke-width="1.5"/><circle cx="11" cy="11" r="3.5" fill="#333" stroke="white" stroke-width="1.5"/><circle cx="11" cy="11" r="1.5" fill="white"/></svg></div>'+
    (_ffQrPkmn?'<div class="ff-ov-opt'+(saved.overlay==='pokemon'?' active':'')+'" data-ov="pokemon" onclick="_ffPickOv(\'pokemon\')"><img src="'+_fesc(_ffQrPkmn)+'" style="width:28px;height:28px;image-rendering:pixelated" onerror="this.parentElement.style.display=\'none\'"></div>':'')+
    '<div class="ff-ov-opt'+(saved.overlay==='mega'?' active':'')+'" data-ov="mega" onclick="_ffPickOv(\'mega\')"><img src="icons/mega-stone.png" style="width:24px;height:24px;object-fit:contain" onerror="this.parentElement.innerHTML=\'💎\'"></div>';
  pane.innerHTML=
    '<div class="ff-qr-area">'+
      '<div class="ff-qr-hint">Scan to add me as a friend</div>'+
      '<div id="ffQrWrap"></div>'+
      '<div class="ff-qr-user" id="ffQrUser">@'+_fesc(username)+'</div>'+
    '</div>'+
    '<div class="ff-link-row"><span class="ff-link-txt" id="ffLinkTxt">'+_fesc(_ffQrUrl)+'</span><button class="ff-copy-btn" id="ffCopyBtn" onclick="ffCopyLink()">Copy</button></div>'+
    '<button class="ff-share-btn" onclick="ffShareNative()"><i class="ph-bold ph-share-network"></i> Share via…</button>'+
    '<div class="ff-cust">'+
      '<div class="ff-cust-row"><span class="ff-cust-lbl">Colour</span><div class="ff-swatch-row">'+swatches+'</div></div>'+
      '<div class="ff-cust-row"><span class="ff-cust-lbl">Frame</span><div class="ff-frame-row">'+frameOpts+'</div></div>'+
      '<div class="ff-cust-row"><span class="ff-cust-lbl">Icon</span><div class="ff-ov-row">'+ovOpts+'</div></div>'+
    '</div>'+
    '<div class="ff-share-hint">Anyone with your link can send you a friend request</div>';
  _ffApplyQrStyle();
}

function _ffAccent(){
  var c=_FF_COLORS[_ffQrStyle.color]||_FF_COLORS.red;
  var dark=document.documentElement.getAttribute('data-theme')!=='light';
  return{hex:'#'+(dark?c.d:c.l),qrCol:dark?c.d:c.l,qrBg:dark?c.db:c.lb};
}

function _ffApplyQrStyle(){
  var wrap=document.getElementById('ffQrWrap');if(!wrap)return;
  var s=_ffQrStyle;var a=_ffAccent();
  var qrUrl='https://api.qrserver.com/v1/create-qr-code/?data='+encodeURIComponent(_ffQrUrl)+
    '&size=500x500&color='+a.qrCol+'&bgcolor='+a.qrBg+'&margin=4&ecc=H';
  var imgSt='width:200px;height:200px;display:block;image-rendering:pixelated;border-radius:12px';
  var wrapHtml='';
  // Frame
  switch(s.frame){
    case'glow':  wrapHtml='<div style="position:relative;display:inline-block"><img style="'+imgSt+';box-shadow:0 0 28px 8px '+a.hex+'55,0 0 12px 3px '+a.hex+'33" src="'+qrUrl+'"></div>';break;
    case'ring':  wrapHtml='<div style="position:relative;display:inline-block"><img style="'+imgSt+';border:3px solid '+a.hex+';box-shadow:0 4px 20px '+a.hex+'33" src="'+qrUrl+'"></div>';break;
    case'gradient': wrapHtml='<div style="position:relative;display:inline-block;border-radius:16px;padding:3px;background:linear-gradient(135deg,'+a.hex+','+a.hex+'55,'+a.hex+'cc);box-shadow:0 6px 24px '+a.hex+'33"><div style="border-radius:14px;overflow:hidden;line-height:0"><img style="width:200px;height:200px;display:block;image-rendering:pixelated;border-radius:0" src="'+qrUrl+'"></div></div>';break;
    case'neon':  wrapHtml='<div style="position:relative;display:inline-block"><img style="'+imgSt+';border:1.5px solid '+a.hex+'99;box-shadow:0 0 6px 2px '+a.hex+',0 0 20px 6px '+a.hex+'66,0 0 40px 10px '+a.hex+'22" src="'+qrUrl+'"></div>';break;
    case'champion':
      var corners=['tl','tr','bl','br'].map(function(p){
        var t=p[0]==='t'?'-2px':'auto',b2=p[0]==='b'?'-2px':'auto',l=p[1]==='l'?'-2px':'auto',r=p[1]==='r'?'-2px':'auto';
        var rot={tl:0,tr:90,br:180,bl:270}[p];
        return'<div style="position:absolute;width:18px;height:18px;top:'+t+';bottom:'+b2+';left:'+l+';right:'+r+';pointer-events:none"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 16V4a2 2 0 0 1 2-2h12" stroke="'+a.hex+'" stroke-width="2.5" stroke-linecap="round" fill="none" transform="rotate('+rot+',9,9)"/></svg></div>';
      }).join('');
      wrapHtml='<div style="position:relative;display:inline-block"><img style="'+imgSt+';border:2px solid '+a.hex+'66" src="'+qrUrl+'">'+corners+'</div>';break;
    default: wrapHtml='<div style="position:relative;display:inline-block"><img style="'+imgSt+'" src="'+qrUrl+'"></div>';
  }
  // Overlay
  var bg=document.documentElement.getAttribute('data-theme')==='light'?'#ffffff':'#111318';
  var ovHtml='';
  if(s.overlay==='bolt')ovHtml='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:'+bg+';border-radius:50%;border:3px solid '+bg+';width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;line-height:1">⚡</div>';
  else if(s.overlay==='pokeball')ovHtml='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:'+bg+';border-radius:50%;border:3px solid '+bg+';width:44px;height:44px;display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" fill="#ef4444" stroke="'+bg+'" stroke-width="1.5"/><path d="M1 14h26" stroke="'+bg+'" stroke-width="1.5"/><circle cx="14" cy="14" r="4.5" fill="#1a1a2e" stroke="'+bg+'" stroke-width="1.5"/><circle cx="14" cy="14" r="2.5" fill="'+bg+'"/></svg></div>';
  else if(s.overlay==='pokemon'&&_ffQrPkmn)ovHtml='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:'+bg+';border-radius:50%;border:3px solid '+bg+';width:48px;height:48px;display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="'+_fesc(_ffQrPkmn)+'" style="width:42px;height:42px;object-fit:contain;image-rendering:pixelated" onerror="this.parentElement.remove()"></div>';
  else if(s.overlay==='mega')ovHtml='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:'+bg+';border-radius:50%;border:3px solid '+bg+';width:44px;height:44px;display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="icons/mega-stone.png" style="width:32px;height:32px;object-fit:contain" onerror="this.parentElement.innerHTML=\'💎\'"></div>';
  // Inject overlay into the position:relative container
  var tmp=document.createElement('div');tmp.innerHTML=wrapHtml;
  var inner=tmp.querySelector('[style*="position:relative"]');
  if(inner&&ovHtml)inner.insertAdjacentHTML('beforeend',ovHtml);
  wrap.innerHTML=tmp.innerHTML;
  // Update username colour
  var uEl=document.getElementById('ffQrUser');if(uEl)uEl.style.color=a.hex;
  // Update picker active states
  document.querySelectorAll('.ff-swatch').forEach(function(el){
    var isAct=el.dataset.color===s.color;
    el.classList.toggle('ff-swatch-act',isAct);
    el.style.boxShadow=isAct?'0 0 0 2px var(--bg2),0 0 0 4px '+el.style.background:'';
    el.style.transform=isAct?'scale(1.2)':'';
  });
  document.querySelectorAll('.ff-frame-opt').forEach(function(el){
    var isAct=el.dataset.frame===s.frame;
    el.classList.toggle('active',isAct);
    el.style.borderColor=isAct?a.hex:'';el.style.color=isAct?a.hex:'';
  });
  document.querySelectorAll('.ff-ov-opt').forEach(function(el){
    var isAct=el.dataset.ov===s.overlay;
    el.classList.toggle('active',isAct);
    el.style.borderColor=isAct?a.hex:'';
  });
}

function _ffPickColor(c){_ffQrStyle.color=c;_ffApplyQrStyle();_ffPersistStyle();}
function _ffPickFrame(f){_ffQrStyle.frame=f;_ffApplyQrStyle();_ffPersistStyle();}
function _ffPickOv(o){_ffQrStyle.overlay=o;_ffApplyQrStyle();_ffPersistStyle();}
function _ffPersistStyle(){
  clearTimeout(_ffSaveTimer);
  _ffSaveTimer=setTimeout(function(){
    if(!usr||!userProfile)return;
    var j=JSON.stringify(_ffQrStyle);
    upd('user_profiles',{'user_id':'eq.'+usr.id},{qr_style:j},true)
      .then(function(){if(userProfile)userProfile.qr_style=j;}).catch(function(){});
  },500);
}
// ─────────────────────────────────────────────────────────────────────────────
function ffFilter(v){ffRenderList(v);}
async function ffRenderList(term){
  var el=document.getElementById('ffList');if(!el)return;
  term=(term||'').trim();
  if(!term){el.innerHTML='<div class="ff-empty">Type a @username or name to search</div>';return;}
  el.innerHTML='<div class="ff-empty">Searching…</div>';
  try{
    // Authenticated search — new "Authenticated users can search profiles" RLS policy (Drop I.2)
    // Use authFetch + string URL to avoid URLSearchParams encoding the * wildcards
    var results=await authFetch(
      API+'/rest/v1/user_profiles?username=ilike.*'+encodeURIComponent(term)+'*&select=user_id,display_name,username,avatar_url&limit=10',
      {headers:h(true)},true
    ).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()});
    if(!results||results.error){el.innerHTML='<div class="ff-empty">Search failed</div>';return;}
    results=results.filter(function(p){return p.user_id!==usr.id;});
    if(!results.length){el.innerHTML='<div class="ff-empty">No trainers found for "'+term+'"</div>';return;}
    el.innerHTML=results.map(function(p){
      var ex=allFriends.find(function(f){return f.friend_id===p.user_id;});
      var st=ex?ex.status:'none';var iReq=ex?ex.i_am_requester:false;
      var bc=st==='accepted'?' friends':st==='pending'&&iReq?' pending':st==='pending'&&!iReq?' recv':'';
      var bt=st==='accepted'?'✓ Friends':st==='pending'&&iReq?'⏳ Sent':st==='pending'&&!iReq?'Accept ✓':'+ Add';
      var dis=bc?' disabled':'';
      var av=p.avatar_url?'<img src="'+_fesc(p.avatar_url)+'" style="width:34px;height:34px;border-radius:10px;object-fit:cover" onerror="this.style.display=\'none\'">':'<span style="font-size:.9rem">👤</span>';
      return'<div class="ff-result">'+
        '<div class="fr-av">'+av+'</div>'+
        '<div class="ff-r-info"><div class="ff-r-name">'+_fesc(p.display_name||'Trainer')+'</div>'+(p.username?'<div class="ff-r-un">@'+_fesc(p.username)+'</div>':'')+'</div>'+
        '<button class="ff-add-btn'+bc+'"'+dis+' onclick="ffSendRequest(this,\''+p.user_id+'\')">'+bt+'</button>'+
      '</div>';
    }).join('');
  }catch(e){el.innerHTML='<div class="ff-empty">Search failed — check connection</div>';}
}
async function ffSendRequest(btn,toId){
  if(btn.disabled)return;
  btn.disabled=true;btn.textContent='Sending…';
  try{
    await authFetch(API+'/rest/v1/friends',{method:'POST',headers:Object.assign(h(true),{'Prefer':'return=representation'}),body:JSON.stringify({requester_id:usr.id,addressee_id:toId,status:'pending'})});
    btn.classList.add('pending');btn.textContent='⏳ Sent';
    if(!allFriends.find(function(f){return f.friend_id===toId;}))
      allFriends.push({id:'local-'+Date.now(),friend_id:toId,status:'pending',i_am_requester:true,display_name:'',username:'',avatar_url:''});
    toast('Friend request sent! 👥');
  }catch(e){
    btn.disabled=false;btn.textContent='+ Add';
    toast((e.message||'').includes('23505')?'Request already pending':'Failed to send request','err');
  }
}
function ffCopyLink(){
  var lt=document.getElementById('ffLinkTxt');if(!lt)return;
  navigator.clipboard.writeText(lt.textContent).catch(function(){});
  var btn=document.getElementById('ffCopyBtn');
  if(btn){btn.textContent='Copied!';btn.classList.add('copied');setTimeout(function(){btn.textContent='Copy';btn.classList.remove('copied');},2000);}
}
function ffShareNative(){
  var lt=document.getElementById('ffLinkTxt');if(!lt)return;
  if(navigator.share)navigator.share({title:'Champions Forge',url:lt.textContent}).catch(function(){});
  else ffCopyLink();
}
// Get friendship status with a specific user_id (used by app-router public profile)
function getFriendStatus(userId){
  var f=allFriends.find(function(x){return x.friend_id===userId;});
  if(!f)return{status:'none',rowId:null,iAmReq:false};
  return{status:f.status,rowId:f.id,iAmReq:f.i_am_requester};
}
// ─────────────────────────────────────────────────────────────────────────────

// #SECTION: ACCOUNT ACTIONS (Drop F.3)
// ═══════════════════════════════════════

function confirmDeleteAccount(){
  resetConfirmMod();
  document.getElementById('cmEmoji').textContent='⚠️';
  document.getElementById('cmTitle').textContent='Delete Account?';
  document.getElementById('cmMsg').textContent='This permanently deletes your account, all builds, teams, and Pokédex progress. This cannot be undone.';
  var btn=document.getElementById('cmBtn');
  btn.textContent='Yes, delete everything';
  btn.className='btn btn-red';
  btn.onclick=function(){deleteAccount();};
  document.getElementById('confirmMod').classList.add('open');
}

async function deleteAccount(){
  closeCm();
  toast('Deleting account…','info');
  try{
    var uid=usr.id;
    // Delete all user data — order matters: junction tables first, then owned rows.
    // build_likes / team_likes cascade from builds/teams but we delete explicitly to be safe.
    // team_builds rows for this user's teams are handled by the teams DELETE cascade.
    await Promise.allSettled([
      rm('build_likes',{'user_id':'eq.'+uid},true),
      rm('team_likes',{'user_id':'eq.'+uid},true),
      rm('user_achievements',{'user_id':'eq.'+uid},true),
      rm('user_pokedex',{'user_id':'eq.'+uid},true),
      rm('user_items',{'user_id':'eq.'+uid},true)
    ]);
    // Builds and teams next (their cascade deletes handle remaining likes + team_builds)
    await Promise.allSettled([
      rm('builds',{'user_id':'eq.'+uid},true),
      rm('teams',{'user_id':'eq.'+uid},true)
    ]);
    // Profile last
    await rm('user_profiles',{'user_id':'eq.'+uid},true).catch(function(){});
    // Revoke server-side session
    await fetch(API+'/auth/v1/logout',{
      method:'POST',
      headers:{'apikey':ANON,'Authorization':'Bearer '+tk}
    }).catch(function(){});
    // Clear local state
    clearSessionState();
    allBuilds=[];allTeams=[];uDex={};uShinyDex={};uItems={};userProfile=null;
    saveSession();
    updAuth();renderDash();renderDex();renderItems();renderBuilds();renderTeams();renderProfile();updProfileNavIcon();
    toast('Account data deleted. Sorry to see you go.');
  }catch(e){
    toast(e.message||'Could not delete account','err');
  }
}

// #SECTION: USERNAME MODAL (Drop F.3)
// ═══════════════════════════════════════
// Bottom-sheet modal for setting a username.
// Triggered by edToggleShare / tmToggleShare when usr has no username.
// onSuccess callback is called after a successful save.
// ═══════════════════════════════════════

var _unSuccessCb=null,_unTimer=null;

function showUsernameModal(onSuccess){
  _unSuccessCb=onSuccess||null;
  var mod=document.getElementById('usernameMod');if(!mod)return;
  var inp=document.getElementById('unInput');
  var hint=document.getElementById('unHint');
  var btn=document.getElementById('unSaveBtn');
  var titleEl=mod.querySelector('.un-sheet-title');
  var descEl=mod.querySelector('.un-sheet-desc');
  var existing=userProfile&&userProfile.username?userProfile.username:'';
  // Pre-fill for "change" flow
  if(inp){inp.value=existing;inp.className='un-input'+(existing?' un-ok':'');}
  if(hint){hint.className='un-hint'+(existing?' ok':'');hint.textContent=existing?'@'+existing+' — current username':'';}
  if(btn){btn.disabled=true;btn.textContent='Set username';}
  if(titleEl)titleEl.textContent=existing?'Change your username':'Choose your username';
  if(descEl)descEl.textContent=existing?'Pick a new username. Your current links will continue to work.':'You need a username before sharing publicly. This is how other trainers will see you across Champions Forge.';
  mod.classList.add('open');
  setTimeout(function(){if(inp){inp.focus();inp.select();}},120);
}

function closeUsernameModal(){
  var mod=document.getElementById('usernameMod');
  if(mod)mod.classList.remove('open');
  _unSuccessCb=null;
  if(_unTimer){clearTimeout(_unTimer);_unTimer=null;}
}

function unCheckAvailability(el){
  if(_unTimer)clearTimeout(_unTimer);
  var v=el.value.trim();
  var hint=document.getElementById('unHint');
  var btn=document.getElementById('unSaveBtn');
  el.classList.remove('un-ok','un-err');
  if(hint){hint.className='un-hint';hint.textContent='';}
  if(btn)btn.disabled=true;
  if(!v)return;
  if(!/^[a-zA-Z0-9_-]{3,20}$/.test(v)){
    el.classList.add('un-err');
    if(hint){hint.className='un-hint err';hint.textContent='3–20 characters, letters numbers _ -';}
    return;
  }
  if(hint){hint.className='un-hint neutral';hint.textContent='Checking…';}
  _unTimer=setTimeout(async function(){
    try{
      // Exclude current user so editing back to their own username shows "available"
      var qParams={'username':'ilike.'+v.toLowerCase(),select:'id'};
      if(usr)qParams['user_id']='neq.'+usr.id;
      var rows=await q('user_profiles',qParams,false);
      if(rows&&rows.length>0){
        el.classList.add('un-err');
        if(hint){hint.className='un-hint err';hint.textContent='@'+v+' is taken';}
      }else{
        el.classList.add('un-ok');
        if(hint){hint.className='un-hint ok';hint.textContent='@'+v+' is available';}
        if(btn)btn.disabled=false;
      }
    }catch(e){
      if(hint){hint.className='un-hint neutral';hint.textContent='Could not check availability';}
    }
  },450);
}

async function unSave(){
  var inp=document.getElementById('unInput');
  var btn=document.getElementById('unSaveBtn');
  if(!inp||!usr||!userProfile)return;
  var v=inp.value.trim().toLowerCase();
  if(!v||!/^[a-zA-Z0-9_-]{3,20}$/.test(v))return;
  btn.disabled=true;btn.textContent='Saving…';
  try{
    await upd('user_profiles',{'user_id':'eq.'+usr.id},{username:v},true);
    userProfile.username=v;
    toast('Username set to @'+v+' ✨');
    closeUsernameModal();
    if(_unSuccessCb){var cb=_unSuccessCb;_unSuccessCb=null;cb();}
  }catch(e){
    toast(e.message||'Failed to save username','err');
    btn.disabled=false;btn.textContent='Set username';
  }
}
