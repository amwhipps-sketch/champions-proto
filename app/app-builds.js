// PURE STAT CALC HELPERS (shared by dex detail + build editor)
// ═══════════════════════════════════════
function bsCalcStatFor(key,base,spVal,nature){
  var m=1;
  if(nature){
    if(BSNATMAP[nature.increased_stat]===key)m=1.1;
    if(BSNATMAP[nature.decreased_stat]===key)m=0.9;
  }
  if(key==='hp')return Math.floor((2*base+31)*50/100)+60+spVal;
  return Math.floor((Math.floor((2*base+31)*50/100)+5)*m)+spVal;
}
function bsGetCalcStatsFor(poke,sp,nature){
  if(!poke)return BSK.map(function(k){return{key:k,base:0,sp:0,calc:0,natMod:1}});
  return BSK.map(function(k){
    var base=poke[BSDB[k]]||0,spVal=sp[k]||0,m=1;
    if(nature){
      if(BSNATMAP[nature.increased_stat]===k)m=1.1;
      if(BSNATMAP[nature.decreased_stat]===k)m=0.9;
    }
    return{key:k,base:base,sp:spVal,calc:bsCalcStatFor(k,base,spVal,nature),natMod:m};
  });
}

// ═══════════════════════════════════════
// BUILD EDITOR STAT PREVIEW (bars + hex + SP sliders)
// DOM IDs prefixed ed-* to avoid clash with dex detail panel
// ═══════════════════════════════════════
var edView='bars';

function edGetPoke(){return allPkmn.find(function(x){return x.id===selPkmnId})}
function edGetNature(){
  var sel=document.getElementById('edNat');
  if(!sel||!sel.value)return null;
  var n=allNatures.find(function(x){return x.id===sel.value});
  return n&&n.increased_stat?n:null;
}

function edBuildBars(){
  return '<div class="bs-grid">'+BSK.map(function(k){
    return '<div class="bs-row"><span class="bs-label">'+BSN[k]+'</span><div class="bs-track"><div class="bs-fill" id="ed-bf-'+k+'" style="background:'+BSC[k]+'"></div></div><span class="bs-val" style="color:'+BSC[k]+'" id="ed-bv-'+k+'">0</span><span class="bs-nat-ind" id="ed-bi-'+k+'"></span></div>';
  }).join('')+'</div>';
}
function edUpdateBars(stats){
  stats.forEach(function(st){
    var f=document.getElementById('ed-bf-'+st.key),v=document.getElementById('ed-bv-'+st.key),i=document.getElementById('ed-bi-'+st.key);
    if(f)f.style.width=Math.min(st.calc/300*100,100)+'%';
    if(v)v.textContent=st.calc;
    if(i)i.innerHTML=st.natMod>1?'<span style="color:var(--green)">▲</span>':st.natMod<1?'<span style="color:var(--red)">▼</span>':'';
  });
}

function edBuildHex(poke){
  var typeCol=(TC[poke.type_1]||TC.Normal).m;
  var cx=180,cy=175,r=78,angles=[-90,-30,30,90,150,210],order=[0,1,2,5,4,3];
  function polar(a,rd){var d=a*Math.PI/180;return{x:cx+rd*Math.cos(d),y:cy+rd*Math.sin(d)}}
  var outerPts=angles.map(function(a){var p=polar(a,r);return p.x+','+p.y}).join(' ');
  var g75=angles.map(function(a){var p=polar(a,r*.75);return p.x+','+p.y}).join(' ');
  var g50=angles.map(function(a){var p=polar(a,r*.5);return p.x+','+p.y}).join(' ');
  var g25=angles.map(function(a){var p=polar(a,r*.25);return p.x+','+p.y}).join(' ');
  var spokes=angles.map(function(a){var p=polar(a,r);return'<line x1="'+cx+'" y1="'+cy+'" x2="'+p.x+'" y2="'+p.y+'" stroke="var(--border)" stroke-width="1"/>'}).join('');
  var labels='';
  for(var i=0;i<6;i++){
    var si=order[i],k=BSK[si],pt=polar(angles[i],r+26);
    var anchor='middle';if(angles[i]===-30||angles[i]===30)anchor='start';if(angles[i]===150||angles[i]===210)anchor='end';
    var isTop=angles[i]===-90,isBot=angles[i]===90;
    if(isTop){labels+='<text x="'+pt.x+'" y="'+(pt.y-10)+'" text-anchor="middle" fill="'+BSC[k]+'" font-size="11" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text><text x="'+pt.x+'" y="'+(pt.y+5)+'" text-anchor="middle" id="ed-hv-'+k+'" fill="'+BSC[k]+'" font-size="14" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">0</text>'}
    else if(isBot){labels+='<text x="'+pt.x+'" y="'+(pt.y+4)+'" text-anchor="middle" id="ed-hv-'+k+'" fill="'+BSC[k]+'" font-size="14" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">0</text><text x="'+pt.x+'" y="'+(pt.y+18)+'" text-anchor="middle" fill="'+BSC[k]+'" font-size="11" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text>'}
    else{labels+='<text x="'+pt.x+'" y="'+(pt.y-4)+'" text-anchor="'+anchor+'" fill="'+BSC[k]+'" font-size="11" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text><text x="'+pt.x+'" y="'+(pt.y+12)+'" text-anchor="'+anchor+'" id="ed-hv-'+k+'" fill="'+BSC[k]+'" font-size="14" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">0</text>'}
  }
  return '<div class="bs-hex-wrap"><svg class="bs-hex-svg" viewBox="0 0 360 360"><polygon points="'+outerPts+'" fill="none" stroke="var(--border)" stroke-width="1.5"/><polygon points="'+g75+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".35"/><polygon points="'+g50+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".35"/><polygon points="'+g25+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".35"/>'+spokes+'<polygon id="ed-hexPoly" points="'+cx+','+cy+'" fill="'+typeCol+'25" stroke="'+typeCol+'" stroke-width="2.5" stroke-linejoin="round" style="transition:all .3s ease"/>'+labels+'</svg></div>';
}
function edUpdateHex(stats){
  var cx=180,cy=175,r=78,angles=[-90,-30,30,90,150,210],order=[0,1,2,5,4,3];
  function polar(a,rd){var d=a*Math.PI/180;return{x:cx+rd*Math.cos(d),y:cy+rd*Math.sin(d)}}
  var pts=[];for(var i=0;i<6;i++){var si=order[i];var pct=Math.min(stats[si].calc/300,1);var pt=polar(angles[i],r*Math.max(pct,0.05));pts.push(pt.x+','+pt.y)}
  var poly=document.getElementById('ed-hexPoly');if(poly)poly.setAttribute('points',pts.join(' '));
  for(var i=0;i<6;i++){var si=order[i],st=stats[si],el=document.getElementById('ed-hv-'+st.key);if(el){el.textContent=st.calc+(st.natMod>1?' ▲':st.natMod<1?' ▼':'');el.style.fill=st.natMod>1?'var(--green)':st.natMod<1?'var(--red)':BSC[st.key]}}
}

function edBuildSP(){
  var rows=BSK.map(function(k){
    var col=BSC[k];
    return '<div class="dsp-row">'+
      '<span class="dsp-name" style="color:'+col+'">'+BSN[k]+'</span>'+
      '<button class="dsp-pm" onpointerdown="edAdj(\''+k+'\',-1)">−</button>'+
      '<div class="dsp-slider-wrap">'+
        '<div class="dsp-slider-track"><div class="dsp-slider-fill" id="ed-sf-'+k+'" style="background:'+col+'"></div></div>'+
        '<input type="range" class="dsp-slider" id="ed-sr-'+k+'" min="0" max="32" value="'+spV[k]+'" style="--thumb-col:'+col+'" oninput="edSlide(\''+k+'\',this.value)">'+
      '</div>'+
      '<button class="dsp-pm" onpointerdown="edAdj(\''+k+'\',1)">+</button>'+
      '<input class="dsp-val-box" id="ed-sv-'+k+'" type="number" min="0" max="32" value="'+spV[k]+'" style="color:'+col+'" onchange="edSet(\''+k+'\',this.value)">'+
    '</div>';
  }).join('');
  return '<div class="dsp-section"><div class="dsp-header"><span class="dsp-title">SP Allocation</span><div class="dsp-remain-wrap"><div class="dsp-remain-num ok" id="ed-remainNum">'+SP_MAX+'</div><div class="dsp-remain-label">remaining of '+SP_MAX+'</div></div></div><div class="dsp-grid">'+rows+'</div></div>';
}
function edUpdateSP(){
  var total=BSK.reduce(function(s,k){return s+spV[k]},0),remain=SP_MAX-total;
  var el=document.getElementById('ed-remainNum');if(el){el.textContent=remain;el.className='dsp-remain-num '+(remain<0?'over':remain<=5?'warn':'ok')}
  BSK.forEach(function(k){
    var fill=document.getElementById('ed-sf-'+k),val=document.getElementById('ed-sv-'+k),range=document.getElementById('ed-sr-'+k);
    if(fill)fill.style.width=(spV[k]/32*100)+'%';
    if(range)range.value=spV[k];
    if(val&&document.activeElement!==val)val.value=spV[k];
  });
}
function edUpdateBST(stats){
  var total=stats.reduce(function(s,st){return s+st.calc},0);
  var cls=total>=600?'bst-elite':total>=500?'bst-high':total>=400?'bst-mid':'bst-low';
  var el=document.getElementById('ed-bstVal');if(el){el.textContent=total;el.className='bs-total-val '+cls}
}

function edRefresh(){
  var p=edGetPoke();
  if(!p)return;
  var nature=edGetNature();
  var stats=bsGetCalcStatsFor(p,spV,nature);
  edUpdateBars(stats);
  edUpdateHex(stats);
  edUpdateBST(stats);
  edUpdateSP();
  // Drop H: sync nature picker button label + chips
  var _natBtn=document.getElementById('edNatBtn');
  if(_natBtn){
    var _natLbl=document.getElementById('edNatLabel');
    var _natChips=document.getElementById('edNatChips');
    if(_natLbl)_natLbl.textContent=nature?nature.name:'Select nature…';
    _natBtn.classList.toggle('empty',!nature);
    if(_natChips){
      if(nature&&nature.increased_stat){
        var _u=NAT_SC[nature.increased_stat],_d=NAT_SC[nature.decreased_stat];
        _natChips.innerHTML='<span class="ed-nat-btn-chip" style="background:'+_u.bg+';color:'+_u.c+'">▲ '+_u.s+'</span>'+
          '<span class="ed-nat-btn-chip" style="background:'+_d.bg+';color:'+_d.c+'">▼ '+_d.s+'</span>';
        _natChips.style.display='flex';
      }else{_natChips.innerHTML='';_natChips.style.display='none';}
    }
  }
}

function edSwitchView(view){
  edView=view;
  document.querySelectorAll('#statSection .bs-view-btn').forEach(function(b){b.classList.toggle('active',b.dataset.view===view)});
  var b=document.getElementById('ed-barsView'),h=document.getElementById('ed-hexView');
  if(b)b.classList.toggle('active',view==='bars');
  if(h)h.classList.toggle('active',view==='hex');
  edRefresh();
}

// SP controls (respects 66-cap)
function edSet(key,val){
  var requested=Math.max(0,Math.min(32,parseInt(val)||0));
  var other=BSK.reduce(function(s,k){return s+(k===key?0:spV[k])},0);
  var maxAllowed=Math.max(0,SP_MAX-other);
  spV[key]=Math.min(requested,maxAllowed);
  edRefresh();
}
function edSlide(key,val){edSet(key,val)}
function edAdj(key,delta){edSet(key,spV[key]+delta)}

// Render the full stat section (called from renderBuildEditor and pickPk)
function edBuildStatSection(){
  var p=edGetPoke();
  if(!p)return '<div style="color:var(--muted);font-size:.82rem;padding:.5rem 0">Select a Pokémon to configure stats</div>';
  var t1=(TC[p.type_1]||TC.Normal).m,t2=p.type_2?(TC[p.type_2]||TC.Normal).m:null;
  var html='';
html+='<div style="display:flex;align-items:center;gap:.65rem;padding:.6rem .7rem;background:var(--surface);border-radius:10px;margin-bottom:.8rem"><img src="'+((editorShiny&&p.shiny_url)?p.shiny_url:(p.image_url||''))+'" onerror="this.style.opacity=0.2" style="width:42px;height:42px;object-fit:contain"><div><div style="display:flex;align-items:center;justify-content:flex-start;gap:8px;flex-wrap:nowrap;font-weight:800;font-size:.88rem"><span>'+p.name+'</span>'+(p.form==="Mega"?'<img src="'+MEGA_STONE_URL+'" alt="Mega" style="width:18px;height:18px;object-fit:contain;display:block;flex-shrink:0" onerror="this.style.display=\'none\'">':'')+'</div><div style="display:flex;gap:4px;margin-top:2px"><span class="type-pill" style="background:'+t1+'">'+p.type_1+'</span>'+(p.type_2?'<span class="type-pill" style="background:'+t2+'">'+p.type_2+'</span>':'')+'</div></div></div>';
  html+='<div class="bs-view-toggle"><button class="bs-view-btn'+(edView==='bars'?' active':'')+'" data-view="bars" onclick="edSwitchView(\'bars\')">Bars</button><button class="bs-view-btn'+(edView==='hex'?' active':'')+'" data-view="hex" onclick="edSwitchView(\'hex\')">Hex</button></div>';
  html+='<div class="bs-view'+(edView==='bars'?' active':'')+'" id="ed-barsView">'+edBuildBars()+'</div>';
  html+='<div class="bs-view'+(edView==='hex'?' active':'')+'" id="ed-hexView">'+edBuildHex(p)+'</div>';
  html+='<div class="bs-total"><span class="bs-total-label">Lv50 Stat Total</span><span class="bs-total-val" id="ed-bstVal">0</span></div>';
  html+=edBuildSP();
  html+='<div class="bs-formula">Lv50 · IVs max (31) · <code>1 SP = +1 stat</code></div>';
  return html;
}

// #SECTION: BUILDS
// ═══════════════════════════════════════
// BUILDS
// Build list, detail, editor, stat allocation,
// save/update/delete, favourites, duplication, export.
// ═══════════════════════════════════════

var buildView='list',editBuildId=null,detailBuildId=null,spV={hp:0,atk:0,def:0,spa:0,spd:0,spe:0},selPkmnId='',SP_MAX=66;
// Editor state (mobile-first 2-step flow)
var editorStep='picker',pickerShinyAll=false,editorShiny=false,pickerObtainedOnly=false,pickerTypeFilter=null,pickerFormFilter=null,pickerSearchValue='';
var statCols={hp:'#ef4444',atk:'#f08030',def:'#f7d02c',spa:'#6390f0',spd:'#7ac74c',spe:'#f95587'};
var statNames={hp:'HP',atk:'ATTACK',def:'DEFENSE',spa:'SP. ATK',spd:'SP. DEF',spe:'SPEED'};

// ── Build Archetypes ──────────────────────────────────────
var BLD_ARCHETYPES=[
  {name:'Physical Sweeper',   cat:'Offense', icon:'ph-sword',                   color:'#f97316',desc:'Fast Pokémon that hits hard with physical moves. Pairs well with Swords Dance or Dragon Dance.'},
  {name:'Special Sweeper',    cat:'Offense', icon:'ph-sparkle',                 color:'#a78bfa',desc:'Fast Pokémon dealing heavy special damage. Often boosted by Nasty Plot or Calm Mind.'},
  {name:'Mixed Attacker',     cat:'Offense', icon:'ph-arrows-merge',            color:'#fb923c',desc:'Hits from both physical and special sides to beat specially or physically defensive cores.'},
  {name:'Wallbreaker',        cat:'Offense', icon:'ph-hammer',                  color:'#ef4444',desc:'Immense raw power to break through defensive cores, even at the cost of speed.'},
  {name:'Revenge Killer',     cat:'Offense', icon:'ph-crosshair',               color:'#ec4899',desc:'Outspeeds and finishes off weakened foes — often equipped with a Choice Scarf.'},
  {name:'Setup Sweeper',      cat:'Setup',   icon:'ph-trend-up',                color:'#f59e0b',desc:'Uses boosting moves (Dragon Dance, Swords Dance, Calm Mind) then sweeps the opposing team.'},
  {name:'Trick Room Abuser',  cat:'Setup',   icon:'ph-clock-counter-clockwise', color:'#7c3aed',desc:'Very slow but hits extremely hard — designed to thrive when Trick Room is active.'},
  {name:'Physical Wall',      cat:'Defense', icon:'ph-shield',                  color:'#3b82f6',desc:'High Defence and HP. Built to tank physical hits and support the team with utility moves.'},
  {name:'Special Wall',       cat:'Defense', icon:'ph-shield-star',             color:'#06b6d4',desc:'High Sp. Defence and HP. Absorbs special attacks reliably and recovers HP over time.'},
  {name:'Tank',               cat:'Defense', icon:'ph-anchor',                  color:'#64748b',desc:'Balanced bulk with offensive presence — takes hits and dishes them back without setup.'},
  {name:'Cleric',             cat:'Defense', icon:'ph-first-aid',               color:'#22c55e',desc:'Heals and cures the team via Wish, Heal Bell, Aromatherapy, or reliable recovery moves.'},
  {name:'Trick Room Setter',  cat:'Support', icon:'ph-clock-clockwise',         color:'#8b5cf6',desc:'Sets Trick Room to invert speed order and empower slow, powerful teammates.'},
  {name:'Hazard Setter',      cat:'Support', icon:'ph-warning',                 color:'#f97316',desc:'Lays Stealth Rock, Spikes, or Toxic Spikes to chip every switching opponent.'},
  {name:'Hazard Remover',     cat:'Support', icon:'ph-eraser',                  color:'#10b981',desc:'Clears entry hazards via Rapid Spin or Defog to protect the team from chip damage.'},
  {name:'Pivot',              cat:'Support', icon:'ph-arrows-left-right',       color:'#14b8a6',desc:'Gains free switches via U-turn, Volt Switch, or Flip Turn to maintain momentum.'},
  {name:'Screens Support',    cat:'Support', icon:'ph-rectangle',               color:'#60a5fa',desc:'Sets Light Screen and Reflect (or Aurora Veil) to halve incoming damage for the whole team.'},
  {name:'Weather Setter',     cat:'Support', icon:'ph-cloud',                   color:'#38bdf8',desc:'Activates sun, rain, sand, or snow to empower weather-boosted teammates and abilities.'},
  {name:'Terrain Setter',     cat:'Support', icon:'ph-map-trifold',             color:'#4ade80',desc:'Sets Electric, Grassy, Misty, or Psychic Terrain to power up terrain-reliant strategies.'},
  {name:'Support',            cat:'Support', icon:'ph-handshake',               color:'#94a3b8',desc:'Broad utility: status moves, chip damage, disruption, and generally enabling the team.'},
  {name:'Speed Control',      cat:'VGC',     icon:'ph-gauge',                   color:'#c084fc',desc:'Controls turn order via Tailwind, Trick Room, Icy Wind, or Electroweb (VGC staple).'},
  {name:'Redirection',        cat:'VGC',     icon:'ph-person-simple-run',       color:'#fb7185',desc:'Follow Me or Rage Powder to redirect attacks away from key teammates (VGC double battles).'},
  {name:'Fake Out Lead',      cat:'VGC',     icon:'ph-hand-pointing',           color:'#fbbf24',desc:'Opens with Fake Out to flinch an opponent and waste their turn in double battles.'}
];
function archColour(name){var a=BLD_ARCHETYPES.find(function(x){return x.name===name;});return a?a.color:'#94a3b8';}
var edSelArch='';

// Move-list constants for auto-suggest
var _BA_SETUP=['Swords Dance','Dragon Dance','Calm Mind','Nasty Plot','Quiver Dance','Shell Smash','Bulk Up','Coil','Growth','Tail Glow','Geomancy','Shift Gear','Work Up','Hone Claws'];
var _BA_HAZARDS=['Stealth Rock','Spikes','Toxic Spikes','Sticky Web'];
var _BA_REMOVAL=['Rapid Spin','Defog'];
var _BA_PIVOT=['U-turn','Volt Switch','Flip Turn','Parting Shot'];
var _BA_SCREENS=['Light Screen','Reflect','Aurora Veil'];
var _BA_WEATHER=['Sunny Day','Rain Dance','Sandstorm','Hail','Snowscape','Snow'];
var _BA_TERRAIN=['Electric Terrain','Grassy Terrain','Misty Terrain','Psychic Terrain'];
var _BA_TR=['Trick Room'];
var _BA_FAKEOUT=['Fake Out'];
var _BA_REDIRECT=['Follow Me','Rage Powder'];
var _BA_SPEED=['Tailwind','Icy Wind','Electroweb','Thunder Wave'];
var _BA_HEAL=['Wish','Heal Bell','Aromatherapy','Soft-Boiled','Recover','Roost','Moonlight','Morning Sun','Synthesis','Slack Off','Shore Up','Milk Drink'];

function selBldArch(val){
  edSelArch=val||'';
  var el=document.getElementById('edArch');if(el)el.value=edSelArch;
  _refreshEdArchBtn();
}
function _refreshEdArchBtn(){
  var btn=document.getElementById('edArchBtn');if(!btn)return;
  var preset=edSelArch?BLD_ARCHETYPES.find(function(a){return a.name===edSelArch;}):null;
  var isCustom=edSelArch&&!preset;
  if(preset){
    btn.className='ed-arch-btn';
    btn.innerHTML='<i class="ph-bold '+preset.icon+'" style="font-size:.9rem;color:'+preset.color+'"></i><span style="flex:1">'+preset.name+'</span><i class="ph-bold ph-caret-right"></i>';
  }else if(isCustom){
    btn.className='ed-arch-btn';
    btn.innerHTML='<i class="ph-bold ph-pencil" style="font-size:.9rem;opacity:.7"></i><span style="flex:1">'+edSelArch+'</span><i class="ph-bold ph-caret-right"></i>';
  }else{
    btn.className='ed-arch-btn empty';
    btn.innerHTML='<span style="flex:1">Select archetype…</span><i class="ph-bold ph-caret-right"></i>';
  }
}
function _edArchBtnHtml(){
  var preset=edSelArch?BLD_ARCHETYPES.find(function(a){return a.name===edSelArch;}):null;
  var isCustom=edSelArch&&!preset;
  var inner='';
  if(preset)inner='<i class="ph-bold '+preset.icon+'" style="font-size:.9rem;color:'+preset.color+'"></i><span style="flex:1">'+preset.name+'</span><i class="ph-bold ph-caret-right"></i>';
  else if(isCustom)inner='<i class="ph-bold ph-pencil" style="font-size:.9rem;opacity:.7"></i><span style="flex:1">'+edSelArch+'</span><i class="ph-bold ph-caret-right"></i>';
  else inner='<span style="flex:1">Select archetype…</span><i class="ph-bold ph-caret-right"></i>';
  return '<button type="button" class="ed-arch-btn'+(edSelArch?'':' empty')+'" id="edArchBtn" onclick="openArchPicker()">'+inner+'</button>';
}
function suggestBuildArchetype(){
  var moves=[document.getElementById('edM1'),document.getElementById('edM2'),document.getElementById('edM3'),document.getElementById('edM4')].map(function(el){return el?el.value||'':''}).filter(Boolean);
  var poke=selPkmnId?allPkmn.find(function(p){return p.id===selPkmnId}):null;
  var moveMeta=moves.map(function(m){return allMoveIndex[m]||null}).filter(Boolean);
  var cats={physical:0,special:0,status:0};
  moveMeta.forEach(function(m){if(m.category==='Physical')cats.physical++;else if(m.category==='Special')cats.special++;else cats.status++;});
  var has=function(arr){return moves.some(function(m){return arr.indexOf(m)!==-1});};
  if(has(_BA_FAKEOUT))return 'Fake Out Lead';
  if(has(_BA_REDIRECT))return 'Redirection';
  if(has(_BA_TR))return 'Trick Room Setter';
  if(has(_BA_HAZARDS))return 'Hazard Setter';
  if(has(_BA_REMOVAL))return 'Hazard Remover';
  if(has(_BA_SCREENS))return 'Screens Support';
  if(has(_BA_WEATHER))return 'Weather Setter';
  if(has(_BA_TERRAIN))return 'Terrain Setter';
  if(has(_BA_SPEED))return 'Speed Control';
  if(has(_BA_HEAL)&&cats.status>=1)return 'Cleric';
  if(has(_BA_PIVOT))return 'Pivot';
  if(has(_BA_SETUP))return 'Setup Sweeper';
  if(!poke)return null;
  var spd=poke.base_spe||0,atk=poke.base_atk||0,spa=poke.base_spa||0,def=poke.base_def||0,spdef=poke.base_spd||0,hp=poke.base_hp||0;
  if(spd<=55&&(atk>=100||spa>=100))return 'Trick Room Abuser';
  if(def>=100&&hp>=80&&cats.physical===0&&cats.special===0)return 'Physical Wall';
  if(spdef>=100&&hp>=80&&cats.physical===0&&cats.special===0)return 'Special Wall';
  if(hp>=80&&def>=80&&spdef>=80&&(cats.physical+cats.special)>=2)return 'Tank';
  if(cats.physical>=1&&cats.special>=1&&(cats.physical+cats.special)>=3)return 'Mixed Attacker';
  var isPhys=cats.physical>=cats.special;
  var natEl=document.getElementById('edNat');var nat=natEl?natEl.value:'';
  var hasSpeedNat=(nat==='Jolly'||nat==='Timid'||nat==='Naive'||nat==='Hasty');
  if(spd<75&&((isPhys&&atk>=120)||(!isPhys&&spa>=120)))return 'Wallbreaker';
  if(spd>=90||hasSpeedNat){if(isPhys&&cats.physical>=1)return 'Physical Sweeper';if(cats.special>=1)return 'Special Sweeper';}
  if(cats.physical>=2)return 'Physical Sweeper';
  if(cats.special>=2)return 'Special Sweeper';
  return null;
}
function onSuggestArch(){
  var s=suggestBuildArchetype();
  if(!s){toast('Add more moves to get a suggestion','info');return;}
  selBldArch(s);toast('Suggested: '+s);
}

async function upd(t,m,b,a){var u=new URL(API+'/rest/v1/'+t);Object.entries(m).forEach(function(e){u.searchParams.set(e[0],e[1])});var r=await authFetch(u.toString(),{method:'PATCH',headers:Object.assign(h(a),{'Prefer':'return=representation'}),body:JSON.stringify(b)},a);if(!r.ok){var e=await r.json().catch(function(){return{}});throw new Error(e.message||r.status)}return r.json()}

function showBuildList(){buildView='list';renderBuilds()}
function showBuildBack(){
  if(typeof appNavContext!=='undefined'&&appNavContext.buildSource==='home'){
    appNavContext.buildSource='list';if(typeof dashNav==='function')dashNav('dash');return;
  }
  if(typeof appNavContext!=='undefined'&&appNavContext.buildSource==='profile'){
    appNavContext.buildSource='list';if(typeof dashNav==='function')dashNav('profile');return;
  }
  showBuildList();
}
function showBuildDetail(id,source){detailBuildId=id;buildView='detail';
  if(typeof appNavContext!=='undefined')appNavContext.buildSource=source||'list';
  // Ensure builds page is active
  document.querySelectorAll('.sb-item').forEach(function(n){n.classList.toggle('active',n.dataset.p==='builds')});
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('show')});
  document.getElementById('pg-builds').classList.add('show');
  renderBuilds()}
function showBuildEditor(id){
  editBuildId=id||null;
  buildView='editor';
pickerSearchValue='';pickerTypeFilter=null;pickerFormFilter=null;pickerShinyAll=false;pickerObtainedOnly=false;
  if(id){
    var b=allBuilds.find(function(x){return x.id===id});
    if(b){
      selPkmnId='';
      var pk=allPkmn.find(function(p){return p.name===b.pokemon_name&&p.dex_number===b.dex_number});
      if(pk)selPkmnId=pk.id;
      spV={hp:b.hp_sp||0,atk:b.atk_sp||0,def:b.def_sp||0,spa:b.spa_sp||0,spd:b.spd_sp||0,spe:b.spe_sp||0};
      editorShiny=!!b.is_shiny;
      edSelArch=b.archetype||'';
      editorStep='form'; // Existing build → jump straight to form
    }
  } else {
    selPkmnId='';
    spV={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
    editorShiny=false;
    edSelArch='';
    editorStep='picker'; // New build → start at Pokémon picker
  }
  renderBuilds();
}

// Step transitions
function editorBackToPicker(){editorStep='picker';renderBuilds()}
function togglePickerShiny(){pickerShinyAll=!pickerShinyAll;renderBuilds()}
function togglePickerObtained(){pickerObtainedOnly=!pickerObtainedOnly;renderBuilds()}
function togglePickerType(t){pickerTypeFilter=pickerTypeFilter===t?null:t;renderBuilds()}
function togglePickerForm(f){pickerFormFilter=pickerFormFilter===f?null:f;renderBuilds()}
function toggleBuildShiny(){editorShiny=!editorShiny;renderBuilds()}

function closeAllBldOms(){document.querySelectorAll('[id^="bldOm-"]').forEach(function(m){m.classList.remove('open')})}
function toggleBldOm(id){var m=document.getElementById('bldOm-'+id);if(!m)return;var wasOpen=m.classList.contains('open');closeAllBldOms();if(!wasOpen)m.classList.add('open')}
function bldMenuDelete(ev,id){
  if(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation()}
  var b=allBuilds.find(function(x){return x.id===id});
  if(!b){toast('Build not found','err');return false}
  closeAllBldOms();
  setTimeout(function(){confirmDelBuild(id,b.build_name||'this build')},0);
  return false;
}
function bindBuildListMenuActions(){
  if(window.__buildListDeleteBound)return;
  window.__buildListDeleteBound=true;

  document.addEventListener('click',function(ev){
    var delBtn=ev.target.closest&&ev.target.closest('.bld-list-delete');
    if(!delBtn)return;

    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

    closeAllBldOms();

    var id=delBtn.getAttribute('data-build-id');
    var b=allBuilds.find(function(x){return x.id===id});

    if(!b){
      toast('Build not found','err');
      return false;
    }

    confirmDelBuild(id,b.build_name||'this build');
    return false;
  },true);
}

function renderBuilds(){
  var c=document.getElementById('buildsView');
  if(!tk){c.innerHTML='<div class="pg-head"><div class="pg-title">⚔️ Builds</div><div class="pg-sub">Sign in to manage your builds</div></div><div class="empty"><div class="em">🔒</div>Sign in to see builds</div>';return}
  if(buildView==='editor'){renderBuildEditor(c);return}
  if(buildView==='detail'){renderBuildDetail(c);return}
  // List view — standardised header with .vh-* classes
  var hdr='<div class="pg-head vh-list-header"><div class="pg-top"><div><div class="pg-title">⚔️ Builds</div><div class="pg-sub">Your competitive Pokémon configurations</div></div><div class="vh-actions"><button class="vh-btn vh-btn-md vh-btn-new" onclick="showBuildEditor()">+</button></div></div></div>';
  if(!allBuilds.length){c.innerHTML=hdr+'<div class="empty"><div class="em">⚔️</div>No builds yet. Create your first!</div>';return}
  var sortedBuilds=allBuilds.slice().sort(function(a,b){return(b.is_favourite?1:0)-(a.is_favourite?1:0)});
  var t1,t2,bImg,safeName;
  c.innerHTML=hdr+'<div class="bld-stack">'+sortedBuilds.map(function(b){
    bImg=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');
    t1=TC[b.type_1]||TC.Normal;t2=b.type_2?TC[b.type_2]:null;
    safeName=(b.build_name||'this build').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div class="bld-card'+(b.is_favourite?' fav-card':'')+'" onclick="showBuildDetail(\''+b.id+'\')">'+
      '<div class="bld-head">'+
        '<div class="bld-head-left">'+
          '<img class="bld-head-img" src="'+bImg+'" onerror="this.style.opacity=\'0.2\'">'+
          '<div class="bld-head-text">'+
            '<div class="bld-name">'+(b.is_favourite?'<span class="fav-star">⭐</span> ':'')+b.build_name+(b.is_shiny?' <span style="color:var(--purple);font-size:.68rem">✦</span>':'')+'</div>'+
            '<div class="bld-pkmn">'+(b.pokemon_name||'?')+' · #'+String(b.dex_number||0).padStart(4,'0')+
              ' <span class="type-pill" style="background:'+t1.m+'">'+b.type_1+'</span>'+(t2?' <span class="type-pill" style="background:'+t2.m+'">'+b.type_2+'</span>':'')+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="vh-actions" onclick="event.stopPropagation()">'+
          '<button class="vh-btn vh-btn-md vh-btn-edit" onclick="showBuildEditor(\''+b.id+'\')" aria-label="Edit build">✏️</button>'+
          '<div class="om-wrap">'+
            '<button class="vh-btn vh-btn-md vh-btn-more" onclick="toggleBldOm(\''+b.id+'\')" aria-label="More">⋮</button>'+
            '<div class="om-menu" id="bldOm-'+b.id+'">'+
              '<button class="om-item" onclick="event.stopPropagation();closeAllBldOms();togFav(null,\''+b.id+'\')"><span class="om-item-icon">'+(b.is_favourite?'⭐':'☆')+'</span>'+(b.is_favourite?'Remove favourite':'Add to favourites')+'</button>'+
              '<button class="om-item" onclick="event.stopPropagation();closeAllBldOms();dupBuild(\''+b.id+'\')"><span class="om-item-icon">🔄</span>Duplicate build</button>'+
              (b.is_public&&b.share_code?'<button class="om-item" onclick="event.stopPropagation();closeAllBldOms();shareImage(\'build\',\''+b.id+'\')"><span class="om-item-icon">🔗</span>Share build</button>':'')+
              '<button class="om-item" onclick="event.stopPropagation();closeAllBldOms();exportShowdown(\''+b.id+'\')"><span class="om-item-icon">📤</span>Export to Showdown</button>'+
              '<div class="om-sep"></div>'+
              '<button class="om-item destructive" type="button" onpointerup="return bldMenuDelete(event,\''+b.id+'\')" onclick="return false"><span class="om-item-icon">🗑</span>Delete build</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="bld-tags">'+(b.battle_format?'<span class="btag btag-fmt">'+b.battle_format+'</span>':'')+(b.archetype?'<span class="btag btag-arch" style="--ac:'+archColour(b.archetype)+'">'+b.archetype+'</span>':'')+(b.item_name?'<span class="btag btag-item">'+b.item_name+'</span>':'')+(b.nature_name?'<span class="btag btag-nat">'+b.nature_name+'</span>':'')+(b.ability?'<span class="btag btag-abi">'+b.ability+'</span>':'')+bldMoveWarnPill(b)+bldAbiWarnPill(b)+'</div>'+
      '<div class="bld-moves"><div class="bmove">'+(b.move_1||'—')+'</div><div class="bmove">'+(b.move_2||'—')+'</div><div class="bmove">'+(b.move_3||'—')+'</div><div class="bmove">'+(b.move_4||'—')+'</div></div>'+
    '</div>';
  }).join('')+'</div>';
}

// Drop E: Unified move-card font size. Takes the longest name across a build's
// 4 slots and returns a shared rem value so every card in the grid renders at
// the same scale — long names shrink together, short names don't bloat. This
// keeps the moveset grid visually uniform no matter the mix.
function movesetFontSize(names){
  var maxLen=0;
  for(var i=0;i<names.length;i++){var n=names[i];if(n&&n.length>maxLen)maxLen=n.length}
  if(maxLen<=9)return '.96rem';
  if(maxLen<=12)return '.86rem';
  if(maxLen<=15)return '.76rem';
  if(maxLen<=18)return '.66rem';
  if(maxLen<=22)return '.58rem';
  return '.52rem';
}

// Drop G.3: Quick list-level ability flag. Uses allPkmnAbilities (loaded at boot)
// so no async needed. Returns a btag-warn pill when ability is provably illegal.
function bldAbiWarnPill(b){
  if(!b.ability)return '';
  var st=abilityLegalityState(b.ability,b.pokemon_id);
  if(st==='illegal')return '<span class="btag btag-warn" title="\''+b.ability+'\' is not a valid ability for this Pok\u00e9mon"><i class="ph-fill ph-warning"></i> ability</span>';
  return '';
}

// Drop E: Quick list-level flag. Counts slots where the move name isn't in
// allMoveIndex (typo or not-in-champions). Doesn't trigger a learnset load,
// so it stays fast for lists. A build may also have illegal-but-known moves
// — those only surface in the detail view where a learnset check is cheap.
function bldMoveWarnPill(b){
  var moves=[b.move_1,b.move_2,b.move_3,b.move_4];
  var unknown=0;
  for(var i=0;i<moves.length;i++){
    var n=moves[i];
    if(n&&!allMoveIndex[n])unknown++;
  }
  if(!unknown)return '';
  return '<span class="btag btag-warn" title="'+unknown+' slot'+(unknown>1?'s':'')+' with unknown move names — open build to review"><i class="ph-fill ph-warning"></i>'+unknown+' to review</span>';
}

// Mobile-first 2-step build editor
function renderBuildEditor(c){
  if(editorStep==='picker'||!selPkmnId){renderEditorPicker(c);return}
  renderEditorForm(c);
}

// STEP 1: Pokémon picker (full-screen)
function renderEditorPicker(c){
  var hdr='<div class="pg-head"><div class="pg-top"><div><div class="pg-title" style="cursor:pointer" onclick="showBuildList()">← '+(editBuildId?'Edit Build':'New Build')+'</div><div class="pg-sub">Choose your Pokémon</div></div></div></div>';
  var search='<input class="ed-input" id="pkSrch" placeholder="🔍 Search by name or number" type="search" value="'+pickerSearchValue.replace(/"/g,'&quot;')+'" oninput="pickerSearchValue=this.value;filterPkPicker()">';
  var typeRow='<div class="epc-filter-row" style="margin-top:.5rem"><span class="epc-filter-lbl">Type</span><div class="epc-filter-scroll">'+Object.keys(TC).sort().map(function(t){return '<button class="epc-filter'+(pickerTypeFilter===t?' active':'')+'" onclick="togglePickerType(\''+t+'\')">'+t+'</button>'}).join('')+'</div></div>';
  var formRow='<div class="epc-filter-row" style="margin-top:.4rem;justify-content:space-between"><div style="display:flex;align-items:center;gap:.35rem;min-width:0"><span class="epc-filter-lbl">Form</span>'+['Base','Mega','Regional'].map(function(f){return '<button class="epc-filter'+(pickerFormFilter===f?' active':'')+'" onclick="togglePickerForm(\''+f+'\')">'+f+'</button>'}).join('')+'</div><div class="epc-picker-toggles"><button class="shiny-btn'+(pickerObtainedOnly?' active':'')+'" onclick="togglePickerObtained()">✓ Owned</button><button class="shiny-btn'+(pickerShinyAll?' active':'')+'" onclick="togglePickerShiny()">✦ Shiny</button></div></div>';
  c.innerHTML=hdr+'<div style="padding:.9rem 1rem 1.5rem">'+search+typeRow+formRow+'<div class="epc-grid" id="pkPicker"></div></div>';
  filterPkPicker();
}

// STEP 2: Form view (compact selected card + stats + moves + strategy + sticky save)
function renderEditorForm(c){
  var b=editBuildId?allBuilds.find(function(x){return x.id===editBuildId}):null;
  var p=allPkmn.find(function(x){return x.id===selPkmnId});
  if(!p){editorStep='picker';renderBuildEditor(c);return}

  var dName=displayName(p);
  var isMega=p.form==='Mega';
  var t1=TC[p.type_1]||TC.Normal,t2=p.type_2?TC[p.type_2]:null;
  var bg=t2?'linear-gradient(135deg,'+t1.m+','+t2.m+')':'linear-gradient(135deg,'+t1.m+','+t1.d+')';
  var img=(editorShiny&&p.shiny_url)?p.shiny_url:(p.image_url||'');
  var hasShiny=!!p.shiny_url;

  // Selected Pokémon compact card
  var selectedCard='<div class="sel-card'+(editorShiny?' shiny-holo':'')+'">'+
    '<div class="sel-bg" style="background:'+bg+'"></div>'+
    '<div class="sel-content">'+
      '<img class="sel-img" src="'+img+'" onerror="this.style.opacity=\'0.2\'">'+
      '<div class="sel-info">'+
'<div class="sel-name" style="display:flex;align-items:center;justify-content:flex-start;gap:8px;flex-wrap:nowrap;font-weight:800;font-size:1.05rem"><span>'+dName+'</span>'+(isMega?'<img src="'+MEGA_STONE_URL+'" alt="Mega" style="width:20px;height:20px;object-fit:contain;display:block;flex-shrink:0" onerror="this.style.display=\'none\'">':'')+'</div>'+        '<div class="sel-dex">#'+String(p.dex_number||0).padStart(4,'0')+'</div>'+
        '<div class="sel-types"><span class="type-pill" style="background:'+t1.m+'">'+p.type_1+'</span>'+(t2?'<span class="type-pill" style="background:'+t2.m+'">'+p.type_2+'</span>':'')+'</div>'+
      '</div>'+
      '<div class="sel-actions">'+
        '<button class="sel-btn" onclick="editorBackToPicker()">Change</button>'+
        (hasShiny?'<button class="sel-btn'+(editorShiny?' shiny-on':'')+'" onclick="toggleBuildShiny()" title="Using shiny">✦</button>':'')+
      '</div>'+
    '</div>'+
  '</div>';

  var hdr='<div class="pg-head"><div class="pg-top"><div><div class="pg-title" style="cursor:pointer" onclick="showBuildList()">← '+(b?'Edit Build':'New Build')+'</div><div class="pg-sub">'+dName+(isMega?' (Mega)':'')+'</div></div></div></div>';

  // Nature picker button (Drop H) — replaces native <select> with a bottom-sheet picker.
  // Hidden input preserves saveBuild() / edGetNature() read contract unchanged.
  var sL={hp:'HP',attack:'Atk',defense:'Def',sp_attack:'SpA',sp_defense:'SpD',speed:'Spe'};
  var curNatObj=b&&b.nature_name?allNatures.find(function(n){return n.name===b.nature_name}):null;
  var _natChipsHtml='';
  if(curNatObj&&curNatObj.increased_stat){
    var _u=NAT_SC[curNatObj.increased_stat],_d=NAT_SC[curNatObj.decreased_stat];
    _natChipsHtml='<span class="ed-nat-btn-chip" style="background:'+_u.bg+';color:'+_u.c+'">▲ '+_u.s+'</span>'+
      '<span class="ed-nat-btn-chip" style="background:'+_d.bg+';color:'+_d.c+'">▼ '+_d.s+'</span>';
  }

  // Item picker — replaces native <select> with a clickable button that opens a bottom sheet.
  // Hidden input keeps the form-compatible edItem.value = item_id.
  var curItem=null;
  if(b){
    if(b.item_id)curItem=allItems.find(function(i){return i.id===b.item_id});
    if(!curItem&&b.item_name)curItem=allItems.find(function(i){return i.name===b.item_name});
  }
  var itemFieldHtml='<input type="hidden" id="edItem" value="'+(curItem?curItem.id:'')+'">'+
    '<button type="button" class="be-select" id="edItemBtn" onclick="openItemPicker()">'+
      (curItem
        ?'<div class="be-select-chosen">'+(curItem.sprite_url?'<img src="'+curItem.sprite_url+'" alt="">':'')+'<span>'+curItem.name+'</span></div>'
        :'<span class="placeholder">— None —</span>'
      )+
      '<i class="ph-bold ph-caret-down" style="color:var(--muted)"></i>'+
    '</button>';

  // Stat calculator section (bars/hex + SP sliders + BST total)
  var statSectionHtml=edBuildStatSection();

  c.innerHTML=hdr+'<div class="editor" style="padding-bottom:5rem">'+
    selectedCard+
    '<div class="ed-desktop-layout">'+
    '<div class="ed-left-col">'+
    '<div class="ed-card"><h3 style="display:flex;align-items:center;gap:8px">Stat Allocation'+(isMega?'<img src="'+MEGA_STONE_URL+'" alt="Mega" style="width:20px;height:20px;object-fit:contain;display:block;flex-shrink:0" onerror="this.style.display=\'none\'">':'')+'</h3><div id="statSection">'+statSectionHtml+'</div></div>'+
    '</div>'+
    '<div class="ed-right-col">'+
    '<div class="ed-card"><label class="ed-label" style="margin-top:0">Build Name</label><input class="ed-input" id="edName" value="'+(b?b.build_name:'').replace(/"/g,'&quot;')+'" placeholder="e.g. Sweeper '+dName+'">'+
      '<div class="ed-row" style="margin-top:.5rem"><div><label class="ed-label">Format</label><select class="ed-select" id="edFmt"><option value="Singles"'+(b&&b.battle_format==='Singles'?' selected':'')+'>Singles</option><option value="Doubles"'+(b&&b.battle_format==='Doubles'?' selected':'')+'>Doubles</option></select></div></div>'+
      '<div style="margin-top:.55rem"><label class="ed-label" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">Archetype<button class="btn btn-ghost" style="font-size:.62rem;padding:.18rem .5rem;min-height:auto;line-height:1.3;font-family:inherit" onclick="onSuggestArch()" type="button">✨ Suggest</button></label>'+_edArchBtnHtml()+'<input type="hidden" id="edArch" value="'+edSelArch+'"></div>'+
    '</div>'+
    '<div class="ed-card" style="margin-top:1rem"><h3>Moves & Ability</h3>'+
      (function(){var curAbi=b?b.ability||'':'';return'<div class="ed-row">'+
  '<div><label class="ed-label">Ability</label>'+
    '<input type="hidden" id="edAbi" value="'+curAbi.replace(/"/g,'&quot;')+'">'+
    '<button type="button" id="edAbiBtn" class="ed-abl-btn'+(curAbi?'':' empty')+'" onclick="openAbilityPicker()">'+
      '<span id="edAbiLabel">'+(curAbi||'Select ability…')+'</span>'+
      '<span id="edAbiWarn" class="ed-abl-warn-icon" style="display:'+(abilityLegalityState(curAbi,selPkmnId)==='illegal'?'inline':'none')+'"><i class="ph-fill ph-warning"></i></span>'+
      '<i class="ph-bold ph-caret-right"></i>'+
    '</button>'+
  '</div>'+
  '<div><label class="ed-label">Item</label>'+itemFieldHtml+'</div>'+
'</div>';})()  +
      '<div style="margin-top:.5rem"><label class="ed-label">Nature</label>'+
        '<input type="hidden" id="edNat" value="'+(curNatObj?curNatObj.id:'')+'">'+
        '<button type="button" class="ed-nat-btn'+(curNatObj?'':' empty')+'" id="edNatBtn" onclick="openNaturePicker()">'+
          '<div class="ed-nat-btn-left">'+
            '<span class="ed-nat-btn-name" id="edNatLabel">'+(curNatObj?curNatObj.name:'Select nature…')+'</span>'+
            '<span class="ed-nat-btn-chips" id="edNatChips" style="'+(curNatObj&&curNatObj.increased_stat?'display:flex':'display:none')+'">'+_natChipsHtml+'</span>'+
          '</div>'+
          '<i class="ph-bold ph-caret-right"></i>'+
        '</button>'+
      '</div>'+
      // Drop E: Move slots — buttons open legal-move picker; hidden inputs preserve saveBuild() contract.
      // Shared font size across all 4 so long names don't bloat and short names don't over-scale.
      (function(){
        var ms=b?[b.move_1,b.move_2,b.move_3,b.move_4]:['','','',''];
        var fs=movesetFontSize(ms);
        return '<div class="ed-row" style="margin-top:.5rem"><div><label class="ed-label">Move 1</label>'+msSlotField(1,ms[0],fs)+'</div><div><label class="ed-label">Move 2</label>'+msSlotField(2,ms[1],fs)+'</div></div>'+
        '<div class="ed-row" style="margin-top:.5rem"><div><label class="ed-label">Move 3</label>'+msSlotField(3,ms[2],fs)+'</div><div><label class="ed-label">Move 4</label>'+msSlotField(4,ms[3],fs)+'</div></div>';
      })()+
    '</div>'+
    '<details class="ed-card" style="margin-top:1rem"><summary style="font-size:.9rem;font-weight:700;cursor:pointer;list-style:none;display:flex;align-items:center;gap:.4rem" onclick="return _edStrategyClick(event)">Strategy <span style="color:var(--muted);font-size:.72rem;font-weight:500;flex:1">optional</span><i class="ph-bold ph-caret-right ed-strat-caret"></i></summary>'+
      '<div style="margin-top:.7rem"><label class="ed-label">Win Condition</label><textarea class="ed-textarea" id="edWin">'+(b?b.win_condition||'':'')+'</textarea></div>'+
      '<div class="ed-row" style="margin-top:.5rem"><div><label class="ed-label">Strengths</label><textarea class="ed-textarea" id="edStr">'+(b?b.strengths||'':'')+'</textarea></div><div><label class="ed-label">Weaknesses</label><textarea class="ed-textarea" id="edWeak">'+(b?b.weaknesses||'':'')+'</textarea></div></div>'+
    '</details>'+
    '</div>'+ // close .ed-right-col
    '<div class="ed-picker-col" id="edPickerCol"></div>'+ // third panel — desktop picker slides in here
    '</div>'+ // close .ed-desktop-layout
    // Hidden shiny button — editorShiny state already lives in JS, but saveBuild reads #edShiny.active so we keep a hidden mirror
    '<button type="button" class="fpill'+(editorShiny?' active':'')+'" id="edShiny" style="display:none"></button>'+
    // Drop F.2a: Share toggle — only renders when editing an existing build.
    // Lives inside the .editor wrapper so it scrolls with the rest of the form,
    // positioned AFTER Strategy (the last content card) and BEFORE the sticky save-bar.
    edShareSectionHtml()+
    '</div>'+
    '<div class="save-bar"><button class="btn btn-ghost" onclick="showBuildList()">Cancel</button><button class="btn btn-red" id="saveBuildBtn" onclick="saveBuild()">💾 Save Build</button></div>';
  // Paint bars/hex after DOM is attached
  requestAnimationFrame(function(){requestAnimationFrame(edRefresh)});
  // Drop E: kick off learnset load in background so legality flags on the 4
  // slot buttons flip from 'pending' to 'legal' / 'illegal' once data arrives.
  if(selPkmnId&&!learnsetCache[selPkmnId]){
    loadLearnset(selPkmnId).then(msRefreshSlots);
  }
}

// #SECTION: SHARE TOGGLE (Drop F.2a)
// ═══════════════════════════════════════
// SHARE TOGGLE
// Share card rendered inside the build editor form when editing an existing
// build (editBuildId truthy). Toggle flips builds.is_public; first-ever ON
// call generates a share code via ensureShareCode() from app-router.js.
// share_code is preserved on OFF so re-enabling reuses the same URL.
// ═══════════════════════════════════════

// Build the share URL for a given code. Uses current origin so the link is
// right whether running on localhost (Live Server), GitHub Pages, or future
// custom domain.
function edShareUrl(code){
  if(!code)return '';
  var base=location.origin+location.pathname.replace(/\/index\.html$/,'/');
  if(!base.endsWith('/'))base+='/';
  return base+'#/b/'+code;
}

// ═══════════════════════════════════════
// ABILITY PICKER — Drop G.2b
// Replaces free-text #edAbi with a bottom
// sheet showing legal abilities for the
// selected Pokémon. saveBuild() reads the
// hidden #edAbi input unchanged.
// ═══════════════════════════════════════
// Ability picker, Nature picker, Item picker, Move picker → see app/app-pickers.js
// (extracted to reduce file size)


// Read share_fields with defaults (all visible when NULL).
// Keys: moves, ability, stats, item — all boolean.
function edGetShareFields(b){
  var raw=b&&b.share_fields;
  var f={moves:true,ability:true,stats:true,item:true};
  if(raw&&typeof raw==='object'){
    if(raw.moves===false)f.moves=false;
    if(raw.ability===false)f.ability=false;
    if(raw.stats===false)f.stats=false;
    if(raw.item===false)f.item=false;
  }
  return f;
}

// Count visible fields (out of 4) for the customise summary
function edShareVisibleCount(fields){
  var c=0;
  if(fields.moves)c++;
  if(fields.ability)c++;
  if(fields.stats)c++;
  if(fields.item)c++;
  return c;
}

// Dynamic summary for the customise panel header: "3 of 4 fields visible · Stats hidden"
function edShareSummaryText(fields){
  var visible=edShareVisibleCount(fields);
  var hiddenList=[];
  if(!fields.moves)hiddenList.push('Moves');
  if(!fields.ability)hiddenList.push('Ability');
  if(!fields.stats)hiddenList.push('Stats');
  if(!fields.item)hiddenList.push('Item');
  var base=visible+' of 4 fields visible';
  if(hiddenList.length===0)return base;
  return base+' · '+hiddenList.join(', ')+' hidden';
}

// Dynamic hint sentence showing exactly what's visible on the public page
function edShareHintText(fields){
  var visibleParts=['Pokémon','name','format'];
  if(fields.moves)visibleParts.push('Moves');
  if(fields.ability)visibleParts.push('Ability');
  if(fields.item)visibleParts.push('Item');
  visibleParts.push('Nature');
  if(fields.stats)visibleParts.push('Stats');
  var handle=userProfile&&userProfile.username?userProfile.username:'username';
  var hiddenList=[];
  if(!fields.moves)hiddenList.push('Moves');
  if(!fields.ability)hiddenList.push('Ability');
  if(!fields.stats)hiddenList.push('Stats');
  if(!fields.item)hiddenList.push('Item');
  var base='Visible: '+visibleParts.join(', ')+', <strong>@'+pubEscape(handle)+'</strong> byline.';
  if(hiddenList.length)base+=' '+hiddenList.join(', ')+' hidden.';
  return base;
}

// Small escape helper used here; router defines its own pubEscape.
function pubEscapeLocal(s){
  if(s==null)return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Render the Share card HTML. Returns '' when not editing an existing build.
// Now includes a collapsible Customise panel ABOVE the URL row (per user's
// Proof 1 v2 feedback — privacy decisions come first).
function edShareSectionHtml(){
  if(!editBuildId)return '';
  var b=allBuilds.find(function(x){return x.id===editBuildId});if(!b)return '';
  var isOn=!!b.is_public;
  var code=b.share_code||'';
  var url=code?edShareUrl(code):'';
  var fields=edGetShareFields(b);
  var summaryText=edShareSummaryText(fields);
  var hintText=edShareHintText(fields);

  // Customise panel checkboxes
  var subPreviewMoves=[b.move_1,b.move_2,b.move_3,b.move_4].filter(function(m){return m&&m.trim()}).join(', ')||'No moves set';
  var subPreviewAbility=b.ability&&b.ability.trim()?b.ability.trim():'No ability set';
  var subPreviewStats='HP '+(b.hp_sp||0)+' · Atk '+(b.atk_sp||0)+' · Def '+(b.def_sp||0)+' · SpA '+(b.spa_sp||0)+' · SpD '+(b.spd_sp||0)+' · Spe '+(b.spe_sp||0);
  var subPreviewItem='—';
  if(b.item_id){
    var itRow=(typeof allItems!=='undefined'&&allItems)?allItems.find(function(x){return x.id===b.item_id}):null;
    subPreviewItem=itRow?itRow.name:'(set)';
  }

  function checkRow(field,label,sub){
    var on=!!fields[field];
    return (
      '<div class="ed-check-row '+(on?'on':'off')+'" data-field="'+field+'" onclick="edToggleShareField(\''+field+'\')" tabindex="0" role="checkbox" aria-checked="'+(on?'true':'false')+'" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();edToggleShareField(\''+field+'\')}">'+
        '<div class="ed-check">'+(on?'<i class="ph-bold ph-check"></i>':'')+'</div>'+
        '<div>'+
          '<div class="ed-check-label">'+pubEscapeLocal(label)+'</div>'+
          '<div class="ed-check-sub">'+pubEscapeLocal(sub)+'</div>'+
        '</div>'+
      '</div>'
    );
  }

  return (
    '<div class="ed-card ed-share-card'+(isOn?' active':'')+'" id="edShareCard" style="margin-top:1rem">'+
      '<div class="ed-share-head">'+
        '<div class="ed-share-title">'+
          '<i class="ph-bold ph-share-network"></i>'+
          '<div>'+
            '<h3>Share publicly</h3>'+
            '<span class="label-sub">Anyone with the link can view</span>'+
          '</div>'+
        '</div>'+
        '<div class="ed-share-toggle'+(isOn?' on':'')+'" id="edShareToggle" role="switch" aria-checked="'+(isOn?'true':'false')+'" tabindex="0" onclick="edToggleShare()" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();edToggleShare()}">'+
          '<div class="knob"></div>'+
        '</div>'+
      '</div>'+
      '<div class="ed-share-body" id="edShareBody" style="'+(isOn?'':'display:none')+'">'+

        // CUSTOMISE PANEL — collapsible, above URL row
        '<div class="ed-customise" id="edCustomise">'+
          '<div class="ed-customise-summary" onclick="edToggleCustomiseExpand()">'+
            '<div class="left">'+
              '<i class="ph-bold ph-sliders-horizontal"></i>'+
              '<div>'+
                '<div class="title">Customise what\'s shared</div>'+
                '<div class="sub" id="edCustomiseSummary">'+pubEscapeLocal(summaryText)+'</div>'+
              '</div>'+
            '</div>'+
            '<span class="chev">▸</span>'+
          '</div>'+
          '<div class="ed-customise-body">'+
            '<div class="ed-customise-inner">'+
              checkRow('moves','Moves',subPreviewMoves)+
              checkRow('ability','Ability',subPreviewAbility)+
              checkRow('stats','Stat Allocation',subPreviewStats)+
              checkRow('item','Held Item',subPreviewItem)+
            '</div>'+
          '</div>'+
        '</div>'+

        // URL row + Copy button + Share button (Drop F.2.1)
        '<div class="ed-share-url-row">'+
          '<div class="ed-share-url" id="edShareUrl">'+(url?url.replace(/^https?:\/\//,''):'')+'</div>'+
          '<button type="button" class="ed-share-copy-btn" id="edShareCopyBtn" onclick="edCopyShareUrl()"><i class="ph-bold ph-copy"></i></button>'+
          '<button type="button" class="ed-share-share-btn" id="edShareShareBtn" onclick="edShareNow()"><i class="ph-bold ph-share-network"></i> Share</button>'+
        '</div>'+

        // Dynamic hint row
        '<div class="ed-share-hint">'+
          '<i class="ph ph-info"></i>'+
          '<span id="edShareHint">'+hintText+'</span>'+
        '</div>'+

      '</div>'+
    '</div>'
  );
}

// Expand/collapse the customise panel
function edToggleCustomiseExpand(){
  var panel=document.getElementById('edCustomise');if(!panel)return;
  panel.classList.toggle('open');
}

// Toggle a specific share field (moves / ability / stats / item).
// Persists immediately — no save button needed.
async function edToggleShareField(field){
  if(!editBuildId){toast('Save the build first','err');return}
  if(['moves','ability','stats','item'].indexOf(field)===-1)return;
  var b=allBuilds.find(function(x){return x.id===editBuildId});if(!b)return;
  var row=document.querySelector('.ed-check-row[data-field="'+field+'"]');
  if(!row||row.classList.contains('loading'))return;

  var current=edGetShareFields(b);
  var newVal=!current[field];
  var updatedFields=Object.assign({},current,(function(){var o={};o[field]=newVal;return o})());

  // If all 4 are true and share_fields is null, keep null (don't bloat the DB)
  var allTrue=updatedFields.moves&&updatedFields.ability&&updatedFields.stats&&updatedFields.item;
  var payload=allTrue?null:updatedFields;

  row.classList.add('loading');
  try{
    await upd('builds',{'id':'eq.'+editBuildId},{share_fields:payload},true);
    b.share_fields=payload;

    // Optimistic DOM update — no full re-render
    row.classList.toggle('on',newVal);
    row.classList.toggle('off',!newVal);
    row.setAttribute('aria-checked',newVal?'true':'false');
    var checkIcon=row.querySelector('.ed-check');
    if(checkIcon)checkIcon.innerHTML=newVal?'<i class="ph-bold ph-check"></i>':'';

    // Refresh dynamic text
    var fields=edGetShareFields(b);
    var summaryEl=document.getElementById('edCustomiseSummary');
    if(summaryEl)summaryEl.textContent=edShareSummaryText(fields);
    var hintEl=document.getElementById('edShareHint');
    if(hintEl)hintEl.innerHTML=edShareHintText(fields);

    var fieldLabel={moves:'Moves',ability:'Ability',stats:'Stats',item:'Item'}[field];
    toast((newVal?'Showing ':'Hiding ')+fieldLabel+' on public view');
  }catch(e){
    console.log('edToggleShareField failed:',e);
    toast(e.message||'Failed to update','err');
  }finally{
    row.classList.remove('loading');
  }
}

// Flip the share toggle. Optimistic UI updates in place — no full re-render —
// so the toggle animation and slider drag patterns from other editor widgets
// aren't disrupted. Network failure reverts the visual state.
async function edToggleShare(){
  if(!editBuildId){toast('Save the build first','err');return}
  var b=allBuilds.find(function(x){return x.id===editBuildId});if(!b){toast('Build not found','err');return}
  var toggle=document.getElementById('edShareToggle');
  if(!toggle||toggle.classList.contains('loading'))return;

  var wasOn=!!b.is_public;
  var turningOn=!wasOn;

  // Username gate: show bottom-sheet modal so user can set username in-flow.
  if(turningOn&&(!userProfile||!userProfile.username)){
    showUsernameModal(function(){edToggleShare();});
    return;
  }

  // Lock the toggle during the API roundtrip
  toggle.classList.add('loading');

  try{
    var code=b.share_code;
    if(turningOn&&!code){
      // ensureShareCode is defined in app-router.js
      code=await ensureShareCode('build',editBuildId);
      b.share_code=code;
    }
    // PATCH is_public
    await upd('builds',{'id':'eq.'+editBuildId},{is_public:turningOn},true);
    b.is_public=turningOn;

    // Visual state update
    var card=document.getElementById('edShareCard');
    var body=document.getElementById('edShareBody');
    var urlEl=document.getElementById('edShareUrl');
    toggle.classList.toggle('on',turningOn);
    toggle.setAttribute('aria-checked',turningOn?'true':'false');
    if(card)card.classList.toggle('active',turningOn);
    if(body)body.style.display=turningOn?'':'none';
    if(urlEl&&code)urlEl.textContent=edShareUrl(code).replace(/^https?:\/\//,'');

    toast(turningOn?'Build is now public ✨':'Build is now private');
  }catch(e){
    console.log('edToggleShare failed:',e);
    toast(e.message||'Failed to update sharing','err');
    // Revert visual state: nothing to revert since we haven't touched the DOM on failure path
  }finally{
    toggle.classList.remove('loading');
  }
}

// ═══════════════════════════════════════
// BUILD DETAIL PUBLIC PILL (Drop F.2)
// Small "🌐 Public" pill rendered on the detail page when build is public.
// Tapping expands to show URL + Copy + Share buttons inline.
// ═══════════════════════════════════════

function bdPublicPillHtml(b){
  if(!b||!b.is_public||!b.share_code)return '';
  var url=edShareUrl(b.share_code);
  var fields=edGetShareFields(b);
  var summaryText=edShareSummaryText(fields);
  return (
    '<div class="bd-pill-wrap">'+
      '<div class="bd-pill" id="bdPill" onclick="bdTogglePill()" tabindex="0" role="button" aria-expanded="false" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();bdTogglePill()}">'+
        '<i class="ph-bold ph-globe"></i>'+
        '<span>Public</span>'+
        '<span class="chev">▸</span>'+
      '</div>'+
      '<div class="bd-pill-panel" id="bdPillPanel">'+
        '<div class="bd-pill-panel-inner">'+
          '<div class="bd-pill-stats" id="bdPillSummary">'+pubEscapeLocal(summaryText)+'</div>'+
          '<div class="bd-pill-url-row">'+
            '<div class="bd-pill-url">'+pubEscapeLocal(url.replace(/^https?:\/\//,''))+'</div>'+
            '<button type="button" class="bd-pill-btn" onclick="bdPillCopy()" aria-label="Copy link"><i class="ph-bold ph-copy"></i></button>'+
            '<button type="button" class="bd-pill-btn primary" onclick="bdPillShare()"><i class="ph-bold ph-share-network"></i> Share</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'
  );
}

function bdTogglePill(){
  var pill=document.getElementById('bdPill');if(!pill)return;
  var open=pill.classList.toggle('open');
  pill.setAttribute('aria-expanded',open?'true':'false');
}

async function bdPillCopy(){
  var b=allBuilds.find(function(x){return x.id===detailBuildId});
  if(!b||!b.share_code){toast('No share URL','err');return}
  var url=edShareUrl(b.share_code);
  if(typeof copyUrl==='function')return copyUrl(url);
  // Inline fallback
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(_){toast('Copy failed','err')}
}

async function bdPillShare(){
  var b=allBuilds.find(function(x){return x.id===detailBuildId});
  if(!b||!b.share_code){toast('No share URL','err');return}
  // Drop F.2.1: render image card + native share (OS sheet with Save to Camera Roll etc.)
  if(typeof shareImage==='function')return shareImage('build',b.id);
  // Fallback — URL-only share via shareOrCopy
  var url=edShareUrl(b.share_code);
  var title=b.build_name||'Champions Forge build';
  if(typeof shareOrCopy==='function')return shareOrCopy(url,title,'Check out my Champions Forge build!');
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(_){toast('Copy failed','err')}
}

// Editor Share button — same handler as detail pill, render image + native share
async function edShareNow(){
  if(!editBuildId){toast('Save the build first','err');return}
  var b=allBuilds.find(function(x){return x.id===editBuildId});
  if(!b){toast('Build not found','err');return}
  if(!b.is_public||!b.share_code){toast('Make the build public first','err');return}
  if(typeof shareImage==='function')return shareImage('build',b.id);
  // Fallback
  var url=edShareUrl(b.share_code);
  if(typeof shareOrCopy==='function')return shareOrCopy(url,b.name||'Champions Forge build','Check out my build!');
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(_){toast('Copy failed','err')}
}

// Copy share URL to clipboard. Modern clipboard API + legacy textarea fallback
// for older Safari. Button flashes green "Copied!" for ~1.5s on success.
async function edCopyShareUrl(){
  if(!editBuildId)return;
  var b=allBuilds.find(function(x){return x.id===editBuildId});if(!b||!b.share_code){toast('No share URL yet','err');return}
  var url=edShareUrl(b.share_code);
  var btn=document.getElementById('edShareCopyBtn');
  var ok=false;
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
      ok=true;
    }else{
      // Fallback for old iOS / permission-blocked contexts
      var ta=document.createElement('textarea');
      ta.value=url;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.focus();ta.select();
      try{ok=document.execCommand('copy')}catch(_){ok=false}
      document.body.removeChild(ta);
    }
  }catch(_){ok=false}

  if(ok&&btn){
    var origHtml=btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML='<i class="ph-bold ph-check"></i> Copied!';
    setTimeout(function(){
      btn.classList.remove('copied');
      btn.innerHTML=origHtml;
    },1500);
    toast('Share link copied');
  }else{
    toast('Copy failed — select the URL manually','err');
  }
}

// #SECTION: MATCHUP & COVERAGE HELPERS
// ═══════════════════════════════════════
// MATCHUP & COVERAGE HELPERS
// Shared type matchup and team coverage helpers.
// ═══════════════════════════════════════

function getMatchups(type1,type2){var gr={'4':[],'2':[],'0.5':[],'0.25':[],'0':[]};ALL_T.forEach(function(at){var mult=TCHART[at]&&TCHART[at][type1]!==undefined?TCHART[at][type1]:1;if(type2){mult*=(TCHART[at]&&TCHART[at][type2]!==undefined?TCHART[at][type2]:1)}if(mult===4)gr['4'].push(at);else if(mult===2)gr['2'].push(at);else if(mult===.5)gr['0.5'].push(at);else if(mult===.25)gr['0.25'].push(at);else if(mult===0)gr['0'].push(at)});return gr}
function renderMatchupHtml(type1,type2){
  var gr=getMatchups(type1,type2);
  var secs=[{l:'4× Weak',k:'4',c:'#DC2626',bg:'rgba(220,38,38,.08)',icon:'⚠️'},{l:'2× Weak',k:'2',c:'#F97316',bg:'rgba(249,115,22,.08)',icon:'🔥'},{l:'½× Resist',k:'0.5',c:'#2563EB',bg:'rgba(37,99,235,.08)',icon:'🛡️'},{l:'¼× Resist',k:'0.25',c:'#7C3AED',bg:'rgba(124,58,237,.08)',icon:'🛡️'},{l:'Immune',k:'0',c:'#059669',bg:'rgba(5,150,105,.08)',icon:'✨'}];
  var html=secs.filter(function(s){return gr[s.k].length>0}).map(function(s){
    return'<div style="background:'+s.bg+';border:1px solid '+s.c+'22;border-radius:10px;padding:.6rem .8rem;margin-bottom:.5rem">'+
      '<div style="display:flex;align-items:center;gap:5px;margin-bottom:.4rem"><span style="font-size:.8rem">'+s.icon+'</span><span style="font-size:.72rem;font-weight:700;color:'+s.c+';text-transform:uppercase;letter-spacing:.04em">'+s.l+'</span><span style="font-size:.65rem;color:var(--muted);margin-left:auto">'+gr[s.k].length+' type'+(gr[s.k].length>1?'s':'')+'</span></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:4px">'+gr[s.k].map(function(t){return'<span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:9px;padding:3px 8px">'+t+'</span>'}).join('')+'</div></div>'
  }).join('');
  return html||'<p style="color:var(--muted);font-size:.85rem;font-style:italic">No notable type interactions</p>'
}

// #SECTION: BUILD DETAIL VIEW
// ───────────────────────────────────────
// BUILD DETAIL VIEW
// Detailed single-build screen layout and rendering.
// ───────────────────────────────────────

// Build detail stat section (read-only calculated stats)
// Uses bd-* DOM IDs to avoid clashing with dex detail / build editor
var bdView='bars';
function bdSwitchView(view){bdView=view;renderBuilds()}

function bdBuildHex(poke,stats){
  var typeCol=(TC[poke.type_1]||TC.Normal).m;
  var cx=180,cy=175,r=78,angles=[-90,-30,30,90,150,210],order=[0,1,2,5,4,3];
  function polar(a,rd){var d=a*Math.PI/180;return{x:cx+rd*Math.cos(d),y:cy+rd*Math.sin(d)}}
  var outerPts=angles.map(function(a){var p=polar(a,r);return p.x+','+p.y}).join(' ');
  var g75=angles.map(function(a){var p=polar(a,r*.75);return p.x+','+p.y}).join(' ');
  var g50=angles.map(function(a){var p=polar(a,r*.5);return p.x+','+p.y}).join(' ');
  var g25=angles.map(function(a){var p=polar(a,r*.25);return p.x+','+p.y}).join(' ');
  var spokes=angles.map(function(a){var p=polar(a,r);return'<line x1="'+cx+'" y1="'+cy+'" x2="'+p.x+'" y2="'+p.y+'" stroke="var(--border)" stroke-width="1"/>'}).join('');
  var statPts=[];
  for(var i=0;i<6;i++){var si=order[i];var pct=Math.min(stats[si].calc/300,1);var pt=polar(angles[i],r*Math.max(pct,0.05));statPts.push(pt.x+','+pt.y)}
  var labels='';
  for(var i=0;i<6;i++){
    var si=order[i],k=BSK[si],st=stats[si],pt=polar(angles[i],r+26);
    var anchor='middle';if(angles[i]===-30||angles[i]===30)anchor='start';if(angles[i]===150||angles[i]===210)anchor='end';
    var isTop=angles[i]===-90,isBot=angles[i]===90;
    var natInd=st.natMod>1?' ▲':st.natMod<1?' ▼':'';
    var natCol=st.natMod>1?'var(--green)':st.natMod<1?'var(--red)':BSC[k];
    if(isTop){labels+='<text x="'+pt.x+'" y="'+(pt.y-10)+'" text-anchor="middle" fill="'+BSC[k]+'" font-size="11" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text><text x="'+pt.x+'" y="'+(pt.y+5)+'" text-anchor="middle" fill="'+natCol+'" font-size="14" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">'+st.calc+natInd+'</text>'}
    else if(isBot){labels+='<text x="'+pt.x+'" y="'+(pt.y+4)+'" text-anchor="middle" fill="'+natCol+'" font-size="14" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">'+st.calc+natInd+'</text><text x="'+pt.x+'" y="'+(pt.y+18)+'" text-anchor="middle" fill="'+BSC[k]+'" font-size="11" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text>'}
    else{labels+='<text x="'+pt.x+'" y="'+(pt.y-4)+'" text-anchor="'+anchor+'" fill="'+BSC[k]+'" font-size="11" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text><text x="'+pt.x+'" y="'+(pt.y+12)+'" text-anchor="'+anchor+'" fill="'+natCol+'" font-size="14" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">'+st.calc+natInd+'</text>'}
  }
  return '<div class="bs-hex-wrap"><svg class="bs-hex-svg" viewBox="0 0 360 360"><polygon points="'+outerPts+'" fill="none" stroke="var(--border)" stroke-width="1.5"/><polygon points="'+g75+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".35"/><polygon points="'+g50+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".35"/><polygon points="'+g25+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".35"/>'+spokes+'<polygon points="'+statPts.join(' ')+'" fill="'+typeCol+'25" stroke="'+typeCol+'" stroke-width="2.5" stroke-linejoin="round"/>'+labels+'</svg></div>';
}

function bdBuildStatCard(b){
  var poke=allPkmn.find(function(x){return x.id===b.pokemon_id});
  if(!poke)return '<div class="card" style="margin-bottom:1rem"><h3 style="font-size:.9rem;font-weight:700;margin-bottom:.8rem">Stats</h3><div style="color:var(--muted);font-size:.82rem">Pokémon data unavailable</div></div>';
  var sp={hp:b.hp_sp||0,atk:b.atk_sp||0,def:b.def_sp||0,spa:b.spa_sp||0,spd:b.spd_sp||0,spe:b.spe_sp||0};
  var nature=b.increased_stat?{increased_stat:b.increased_stat,decreased_stat:b.decreased_stat}:null;
  var stats=bsGetCalcStatsFor(poke,sp,nature);
  var bst=stats.reduce(function(s,st){return s+st.calc},0);
  var bstCls=bst>=600?'bst-elite':bst>=500?'bst-high':bst>=400?'bst-mid':'bst-low';

  // Bars HTML
  var bars='<div class="bs-grid">'+stats.map(function(st){
    var pct=Math.min(st.calc/300*100,100);
    var natInd=st.natMod>1?' <span style="color:var(--green);font-size:.6rem">▲</span>':st.natMod<1?' <span style="color:var(--red);font-size:.6rem">▼</span>':'';
    var natCol=st.natMod>1?'var(--green)':st.natMod<1?'var(--red)':BSC[st.key];
    return '<div class="bs-row">'+
      '<span class="bs-label">'+BSN[st.key]+'</span>'+
      '<div class="bs-track"><div class="bs-fill" style="width:'+pct+'%;background:'+BSC[st.key]+'"></div></div>'+
      '<span class="bs-val" style="color:'+natCol+'">'+st.calc+'</span>'+
      '<span class="bs-nat-ind">'+natInd+'</span>'+
    '</div>';
  }).join('')+'</div>';

  // SP footer — shows raw allocation
  var totalSp=BSK.reduce(function(s,k){return s+sp[k]},0);
  var maxSp=b.max_sp||66;
  var spFooter='<div style="display:flex;align-items:center;gap:8px;padding-top:8px;margin-top:8px;border-top:1px solid var(--border);font-size:.68rem;color:var(--muted);font-weight:600">'+
    '<span>SP</span>'+
    BSK.map(function(k){return '<span style="color:'+BSC[k]+';font-weight:800">'+sp[k]+'</span>'}).join('<span style="color:var(--muted2)">·</span>')+
    '<span style="margin-left:auto;color:var(--muted)">'+totalSp+' / '+maxSp+'</span>'+
  '</div>';

  return '<div class="card" style="margin-bottom:1rem">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">'+
      '<h3 style="font-size:.9rem;font-weight:700">Stats at Lv50</h3>'+
      '<div class="bs-view-toggle" style="width:auto;margin:0">'+
        '<button class="bs-view-btn'+(bdView==='bars'?' active':'')+'" onclick="bdSwitchView(\'bars\')" style="padding:4px 12px">Bars</button>'+
        '<button class="bs-view-btn'+(bdView==='hex'?' active':'')+'" onclick="bdSwitchView(\'hex\')" style="padding:4px 12px">Hex</button>'+
      '</div>'+
    '</div>'+
    (bdView==='hex'?bdBuildHex(poke,stats):bars)+
    '<div class="bs-total"><span class="bs-total-label">Stat Total</span><span class="bs-total-val '+bstCls+'">'+bst+'</span></div>'+
    spFooter+
  '</div>';
}

function renderBuildDetail(c){
  var b=allBuilds.find(function(x){return x.id===detailBuildId});
  if(!b){showBuildList();return}
  // Drop E: kick off learnset load in background so legality flags on the moveset
  // cards flip from 'pending' to 'legal' / 'illegal' once data arrives.
  if(b.pokemon_id&&!learnsetCache[b.pokemon_id]){
    loadLearnset(b.pokemon_id).then(function(){
      var grid=document.getElementById('bdMoves');
      if(grid){
        var ms=[b.move_1,b.move_2,b.move_3,b.move_4];
        var fs=movesetFontSize(ms);
        grid.innerHTML=ms.map(function(m){return bdMoveCard(m,b.pokemon_id,fs)}).join('');
      }
    });
  }
  var bImg=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');
  var t1=TC[b.type_1]||TC.Normal;var t2=b.type_2?TC[b.type_2]:null;
  var heroGrad=t2?'linear-gradient(135deg,'+t1.m+'88,'+t2.m+'88)':'linear-gradient(135deg,'+t1.m+'66,'+t1.d+'88)';
  var sL={hp:'HP',attack:'Atk',defense:'Def',sp_attack:'SpA',sp_defense:'SpD',speed:'Spe'};
  var natDetail=b.nature_name||'—';
  if(b.increased_stat)natDetail+=' <span style="color:var(--green);font-size:.68rem">▲'+sL[b.increased_stat]+'</span> <span style="color:var(--red);font-size:.68rem">▼'+sL[b.decreased_stat]+'</span>';
  var favIcon=b.is_favourite?'⭐':'☆';
  var favLabel=b.is_favourite?'Remove favourite':'Add to favourites';
  var safeName=b.build_name.replace(/'/g,"\\'");
  var isShiny=b.is_shiny;

  // Build the stat section with SP tags
  var poke=allPkmn.find(function(x){return x.id===b.pokemon_id});
  var nature=b.nature_name?allNatures.find(function(n){return n.name===b.nature_name}):null;
  var spObj={hp:b.hp_sp||0,atk:b.atk_sp||0,def:b.def_sp||0,spa:b.spa_sp||0,spd:b.spd_sp||0,spe:b.spe_sp||0};
  var totalSP=BSK.reduce(function(s,k){return s+spObj[k]},0);
  var stats=bsGetCalcStatsFor(poke,spObj,nature);
  var bstTotal=stats.reduce(function(s,st){return s+st.calc},0);
  var bstCls=bstTotal>=600?'bst-elite':bstTotal>=500?'bst-high':bstTotal>=400?'bst-mid':'bst-low';

  // Stat bars HTML with SP tags
  var barsHtml='<div class="bs-grid">'+stats.map(function(st){
    var spVal=spObj[st.key]||0;
    var pct=Math.min(st.calc/300*100,100);
    return '<div class="bs-row"><span class="bs-label">'+BSN[st.key]+'</span><div class="bs-track"><div class="bs-fill" style="width:'+pct+'%;background:'+BSC[st.key]+'"></div></div><span class="bs-val" style="color:'+BSC[st.key]+'">'+st.calc+'</span><span class="bs-sp-tag'+(spVal>0?' has-sp':'')+'">+'+spVal+'</span><span class="bs-nat-ind">'+(st.natMod>1?'<span style="color:var(--green)">▲</span>':st.natMod<1?'<span style="color:var(--red)">▼</span>':'')+'</span></div>';
  }).join('')+'</div>';

  // Hex HTML
  var typeCol=(TC[b.type_1]||TC.Normal).m;
  var hexHtml=bdBuildHex(poke,stats);

  // SP progress
  var spPct=Math.min(totalSP/SP_MAX*100,100);

  // Header — standardised .vh-* pattern matching Teams detail
  var hdr='<div class="pg-head"><div class="vh-title-row">'+
    '<span class="vh-back" onclick="showBuildBack()">← '+(b.pokemon_name||'?')+'</span>'+
    '<div class="vh-actions" onclick="event.stopPropagation()">'+
      '<button class="vh-btn vh-btn-sm vh-btn-edit" onclick="showBuildEditor(\''+b.id+'\')" aria-label="Edit build">✏️</button>'+
      '<div class="om-wrap">'+
        '<button class="vh-btn vh-btn-sm vh-btn-more" onclick="toggleBldOm(\'bd-'+b.id+'\')" aria-label="More">⋮</button>'+
        '<div class="om-menu" id="bldOm-bd-'+b.id+'">'+
          '<button class="om-item" onclick="closeAllBldOms();togFav(null,\''+b.id+'\')"><span class="om-item-icon">'+favIcon+'</span>'+favLabel+'</button>'+
          '<button class="om-item" onclick="closeAllBldOms();dupBuild(\''+b.id+'\')"><span class="om-item-icon">🔄</span>Duplicate build</button>'+
          (b.is_public&&b.share_code?'<button class="om-item" onclick="closeAllBldOms();shareImage(\'build\',\''+b.id+'\')"><span class="om-item-icon">🔗</span>Share build</button>':'')+
          '<button class="om-item" onclick="closeAllBldOms();exportShowdown(\''+b.id+'\')"><span class="om-item-icon">📤</span>Export to Showdown</button>'+
          '<div class="om-sep"></div>'+
          '<button class="om-item destructive" onclick="closeAllBldOms();confirmDelBuild(\''+b.id+'\',\''+safeName+'\')"><span class="om-item-icon">🗑</span>Delete build</button>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="pg-sub">'+b.build_name+(b.is_favourite?' ⭐':'')+(isShiny?' · <span style="color:var(--purple)">✦ Shiny</span>':'')+'</div></div>';

  // Drop G.3: pre-compute ability legality for use in detail rendering
  var _ablState=b.ability?abilityLegalityState(b.ability,b.pokemon_id):'empty';
  c.innerHTML=hdr+'<div class="bd-stack">'+
    // Drop F.2: Public pill (only renders when build is public)
    bdPublicPillHtml(b)+
    // Hero art
    '<div class="bd-hero card'+(isShiny?' shiny-holo':'')+'" style="background:'+heroGrad+'">'+
      '<div class="bd-hero-dex">#'+String(b.dex_number||0).padStart(4,'0')+'</div>'+
      '<img src="'+bImg+'" onerror="this.style.opacity=\'0.2\'">'+
      '<div class="bd-hero-types"><span class="type-pill" style="background:'+t1.m+'">'+b.type_1+'</span>'+(t2?'<span class="type-pill" style="background:'+t2.m+'">'+b.type_2+'</span>':'')+'</div>'+
      (isShiny?'<div class="bd-shiny-badge">✦ Shiny Variant</div>':'')+
    '</div>'+
    // Summary tags
    '<div class="bd-summary">'+(b.battle_format?'<span class="btag btag-fmt">'+b.battle_format+'</span>':'')+(b.archetype?'<span class="btag btag-arch" style="--ac:'+archColour(b.archetype)+'">'+b.archetype+'</span>':'')+(b.item_name?'<span class="btag btag-item">'+b.item_name+'</span>':'')+(b.nature_name?'<span class="btag btag-nat">'+b.nature_name+'</span>':'')+(b.ability?'<span class="btag btag-abi'+(_ablState==='illegal'?' btag-warn':'')+'">'+(_ablState==='illegal'?'<i class="ph-fill ph-warning"></i> ':'')+b.ability+'</span>':'')+'</div>'+
    // Configuration
    '<div class="card"><h3 style="font-size:.85rem;font-weight:800;margin-bottom:.7rem">⚙️ Configuration</h3>'+
      '<div class="bd-config">'+
        '<span class="bd-config-label">Ability</span><span class="bd-config-val">'+(b.ability||'—')+(_ablState==='illegal'?' <span style="color:var(--gold)" title="Not a valid ability for this Pok\u00e9mon"><i class="ph-fill ph-warning"></i></span>':'')+'</span>'+
        '<span class="bd-config-label">Item</span><span class="bd-config-val">'+(b.item_name||'—')+'</span>'+
        '<span class="bd-config-label">Nature</span><span class="bd-config-val">'+natDetail+'</span>'+
        '<span class="bd-config-label">Archetype</span><span class="bd-config-val">'+(b.archetype||'—')+'</span>'+
      '</div></div>'+
    // Stats with bars/hex toggle
    '<div class="card"><h3 style="font-size:.85rem;font-weight:800;margin-bottom:.7rem">📊 Stats</h3>'+
      '<div class="bs-view-toggle"><button class="bs-view-btn'+(bdView==='bars'?' active':'')+'" data-view="bars" onclick="bdSwitchView(\'bars\')">📊 Bars</button><button class="bs-view-btn'+(bdView==='hex'?' active':'')+'" data-view="hex" onclick="bdSwitchView(\'hex\')">⬢ Hex</button></div>'+
      '<div class="bs-view'+(bdView==='bars'?' active':'')+'" id="bd-barsView">'+barsHtml+'</div>'+
      '<div class="bs-view'+(bdView==='hex'?' active':'')+'" id="bd-hexView">'+hexHtml+'</div>'+
      '<div class="bs-total"><span class="bs-total-label">Lv50 Stat Total</span><span class="bs-total-val '+bstCls+'">'+bstTotal+'</span></div>'+
      '<div class="bd-sp-bar-wrap"><span class="bd-sp-label">SP Used</span><div class="bd-sp-track"><div class="bd-sp-fill" style="width:'+spPct+'%"></div></div><span class="bd-sp-val">'+totalSP+' / '+SP_MAX+'</span></div>'+
      '<div style="font-size:.58rem;color:var(--muted);margin-top:4px;text-align:right">Lv50 · IVs max (31) · <code style="font-family:inherit;background:var(--surface2);padding:1px 5px;border-radius:4px;font-size:.56rem;color:var(--text2)">1 SP = +1 stat</code></div>'+
    '</div>'+
    // Moves
    '<div class="card"><h3 style="font-size:.85rem;font-weight:800;margin-bottom:.7rem">🎯 Moveset</h3>'+
      '<div class="bd-moves" id="bdMoves">'+(function(){var ms=[b.move_1,b.move_2,b.move_3,b.move_4];var fs=movesetFontSize(ms);return ms.map(function(m){return bdMoveCard(m,b.pokemon_id,fs)}).join('')})()+'</div>'+
    '</div>'+
    // Strategy (collapsible)
    (b.win_condition||b.strengths||b.weaknesses?
      '<details class="card bd-strategy" open><summary>💡 Strategy</summary><div style="margin-top:.7rem">'+
        (b.win_condition?'<div style="margin-bottom:.7rem"><div class="bd-strat-label" style="color:var(--gold)">Win Condition</div><div class="bd-strat-text">'+b.win_condition+'</div></div>':'')+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">'+
          (b.strengths?'<div><div class="bd-strat-label" style="color:var(--green)">Strengths</div><div class="bd-strat-text">'+b.strengths.replace(/\n/g,'<br>')+'</div></div>':'')+
          (b.weaknesses?'<div><div class="bd-strat-label" style="color:var(--red)">Weaknesses</div><div class="bd-strat-text">'+b.weaknesses.replace(/\n/g,'<br>')+'</div></div>':'')+
        '</div></div></details>':'')+
    // Matchups
    '<div class="card"><h3 style="font-size:.85rem;font-weight:800;margin-bottom:.7rem">⚡ Type Effectiveness</h3>'+renderMatchupHtml(b.type_1,b.type_2)+'</div>'+
  '</div>'
}

// Mobile-first rich picker: gradient bg, Mega badge, types, shiny toggle
function filterPkPicker(){
  var inp=document.getElementById('pkSrch');
  var s=(inp?inp.value:pickerSearchValue).toLowerCase();
  pickerSearchValue=s;
  var f=allPkmn.filter(function(p){
var isObt=!!uDex[p.id]||!!uShinyDex[p.id];
if(s&&p.name.toLowerCase().indexOf(s)===-1&&String(p.dex_number).indexOf(s)===-1)return false;
if(pickerTypeFilter&&p.type_1!==pickerTypeFilter&&p.type_2!==pickerTypeFilter)return false;
if(pickerFormFilter&&p.form!==pickerFormFilter)return false;
if(pickerObtainedOnly&&!isObt)return false;
return true;
  });
  var grid=document.getElementById('pkPicker');
  if(!grid)return;
  if(!f.length){grid.innerHTML='<div style="grid-column:1/-1;color:var(--muted);text-align:center;padding:2rem;font-size:.85rem">No Pokémon match</div>';return}
  grid.innerHTML=f.slice(0,150).map(function(p){
    var t1=TC[p.type_1]||TC.Normal,t2=p.type_2?TC[p.type_2]:null;
var showShiny=(pickerShinyAll||!!uShinyDex[p.id])&&p.shiny_url;
    var img=showShiny?p.shiny_url:(p.image_url||'');
    var cls='epc-card'+(p.id===selPkmnId?' selected':'')+(showShiny?' shiny-holo':'');
    var isMega=p.form==='Mega';
    return '<div class="'+cls+'" onclick="pickPk(\''+p.id+'\')">'+
      '<div class="epc-top"><div><div class="epc-dex">#'+String(p.dex_number).padStart(4,'0')+'</div><div class="epc-name">'+displayName(p)+'</div></div></div>'+
      '<div class="epc-art" style="background:'+grad(p)+'">'+(isMega?megaBadge():'')+'<div class="wm">'+pb(60)+'</div>'+(img?'<img src="'+img+'" onerror="this.style.opacity=\'0.2\'" loading="lazy">':'')+'</div>'+
      '<div class="epc-bot"><span class="type-pill" style="background:'+t1.m+'">'+p.type_1+'</span>'+(t2?'<span class="type-pill" style="background:'+t2.m+'">'+p.type_2+'</span>':'')+'</div>'+
    '</div>';
  }).join('');
}
function pickPk(id){
  selPkmnId=id;
  var p=allPkmn.find(function(x){return x.id===id});
  // Carry shiny selection from picker into build
if(editorStep==='picker'&&p&&p.shiny_url)editorShiny=!!pickerShinyAll||!!uShinyDex[p.id];
  editorStep='form';
  renderBuilds();
}
// Clamp per-stat values and enforce the shared SP budget before syncing the slider + number input.
// Legacy setSp/adjSp kept for backward compat (no-ops that route to edSet)
function setSp(s,v){edSet(s,v)}
function adjSp(s,d){edAdj(s,d)}

async function saveBuild(){
  if(window.__savingBuild){return}
  window.__savingBuild=true;
  var btn=document.getElementById('saveBuildBtn');
  var originalText='💾 Save Build';
  if(btn){
    originalText=btn.innerHTML;
    btn.disabled=true;
    btn.style.opacity=.6;
    btn.innerHTML='Saving...';
  }
  try {
    if(!selPkmnId){toast('Select a Pokémon','err');return}
    var name=document.getElementById('edName').value.trim();if(!name){toast('Enter a build name','err');return}
    // Read shiny from JS state (mobile pass) with fallback to legacy #edShiny button
    var isShiny=editorShiny||(document.getElementById('edShiny')&&document.getElementById('edShiny').classList.contains('active'));
    // Mirror the editor fields into the flat Supabase row shape used by the `builds` table.
    var body={user_id:usr.id,pokemon_id:selPkmnId,name:name,battle_format:document.getElementById('edFmt').value,archetype:document.getElementById('edArch').value||null,item_id:document.getElementById('edItem').value||null,nature_id:document.getElementById('edNat').value||null,ability:document.getElementById('edAbi').value||null,move_1:document.getElementById('edM1').value||null,move_2:document.getElementById('edM2').value||null,move_3:document.getElementById('edM3').value||null,move_4:document.getElementById('edM4').value||null,hp_sp:spV.hp,atk_sp:spV.atk,def_sp:spV.def,spa_sp:spV.spa,spd_sp:spV.spd,spe_sp:spV.spe,is_shiny:isShiny,win_condition:document.getElementById('edWin').value||null,strengths:document.getElementById('edStr').value||null,weaknesses:document.getElementById('edWeak').value||null,status:'Testing'};
    if(editBuildId){
      await upd('builds',{'id':'eq.'+editBuildId},body,true);toast('Build updated!');
    } else {
      await ins('builds',body,true);toast('Build created!');
    }
    await loadBuilds();showBuildList();
  } catch(e) {
    toast(e.message,'err');
  } finally {
    window.__savingBuild=false;
    var btn=document.getElementById('saveBuildBtn');
    if(btn){
      btn.disabled=false;
      btn.style.opacity=1;
      btn.innerHTML=originalText;
    }
  }
}
// Reset the shared confirmMod to its default delete-style state.
// Called before opening as a delete confirmation so stale login-modal text doesn't leak through.
function resetConfirmMod(){
  var btn=document.getElementById('cmBtn');
  btn.textContent='Delete';
  btn.className='btn btn-red';
  btn.onclick=null;
  var cancel=document.querySelector('#confirmMod .btn.btn-ghost');
  if(cancel)cancel.textContent='Cancel';
}
function confirmDelBuild(id,name){
  resetConfirmMod();
  document.getElementById('cmEmoji').textContent='⚔️';
  document.getElementById('cmTitle').textContent='Delete Build?';
  document.getElementById('cmMsg').textContent='Delete "'+name+'"? This cannot be undone.';
  document.getElementById('cmBtn').onclick=function(){delBuild(id)};
  document.getElementById('confirmMod').classList.add('open');
}
async function delBuild(id){try{await rm('builds',{'id':'eq.'+id},true);closeCm();toast('Build deleted');await loadBuilds();renderBuilds();renderDash()}catch(e){toast(e.message,'err')}}
function closeCm(){authMode='login';document.getElementById('confirmMod').classList.remove('open');resetConfirmMod()}
function showLoginModal(msg){
  var isSignup=authMode==='signup';
  // Drop F.1: in-modal mode toggle so public-view visitors (where the sidebar
  // is hidden) can flip between Sign In and Create Account without losing the
  // context-specific prompt. Also a nice UX win for the sidebar-triggered modal.
  var toggleLink=isSignup
    ? 'Already have an account? <a href="#" onclick="event.preventDefault();authMode=\'login\';showLoginModal()" style="color:var(--red);font-weight:700;text-decoration:none">Sign in</a>'
    : 'New here? <a href="#" onclick="event.preventDefault();authMode=\'signup\';showLoginModal()" style="color:var(--red);font-weight:700;text-decoration:none">Create an account</a>';
  document.getElementById('cmEmoji').textContent=isSignup?'✨':'🔐';
  document.getElementById('cmTitle').textContent=isSignup?'Create Account':'Sign In';
  document.getElementById('cmMsg').innerHTML=(msg?'<div style="font-size:.84rem;color:var(--muted);margin-bottom:.9rem;line-height:1.5">'+msg+'</div>':'')+
    '<div style="display:flex;flex-direction:column;gap:.65rem;text-align:left">'+
      '<input type="email" id="loginEmail" placeholder="Email" class="ed-input">'+
      '<input type="password" id="loginPass" placeholder="Password" class="ed-input">'+
      (isSignup?'<div style="position:relative"><span style="position:absolute;left:.7rem;top:50%;transform:translateY(-50%);color:var(--muted);font-weight:700;font-size:.88rem;pointer-events:none">@</span><input type="text" id="loginUsername" placeholder="username (optional)" class="ed-input" style="padding-left:1.55rem" autocomplete="off" spellcheck="false"></div>':'')+
      '<div style="font-size:.72rem;color:var(--muted)">'+(isSignup?'Create an account to save your builds, teams, items, and Pokédex progress.':'Sign in to access your saved builds, teams, items, and collection progress.')+'</div>'+
      '<div style="font-size:.78rem;color:var(--muted);text-align:center;padding-top:.6rem;border-top:1px solid var(--border);margin-top:.25rem">'+toggleLink+'</div>'+
    '</div>';
  document.getElementById('cmBtn').textContent=isSignup?'Create Account':'Sign In';
  document.getElementById('cmBtn').className='btn btn-red';
  document.querySelector('#confirmMod .btn.btn-ghost').textContent='Close';
  document.getElementById('cmBtn').onclick=function(){if(authMode==='signup')signup();else login()};
  document.getElementById('confirmMod').classList.add('open');
  setTimeout(function(){var el=document.getElementById('loginEmail');if(el)el.focus()},0);
}

function maybeShowInitialAuthPrompt(){}

// #SECTION: BUILD UTILITIES
// ═══════════════════════════════════════
// BUILD UTILITIES
// Duplicate builds, favourites, export, and related helpers.
// ═══════════════════════════════════════

async function dupBuild(id){
  var b=allBuilds.find(function(x){return x.id===id});if(!b)return;
  var body={user_id:usr.id,pokemon_id:b.pokemon_id,name:b.build_name+' (Copy)',battle_format:b.battle_format,archetype:b.archetype,item_id:b.item_id||null,nature_id:b.nature_id||null,ability:b.ability,move_1:b.move_1,move_2:b.move_2,move_3:b.move_3,move_4:b.move_4,hp_sp:b.hp_sp,atk_sp:b.atk_sp,def_sp:b.def_sp,spa_sp:b.spa_sp,spd_sp:b.spd_sp,spe_sp:b.spe_sp,is_shiny:b.is_shiny||false,win_condition:b.win_condition,strengths:b.strengths,weaknesses:b.weaknesses,status:'Testing'};
  try{await ins('builds',body,true);toast('Build duplicated!');await loadBuilds();renderBuilds();renderDash()}catch(e){toast(e.message,'err')}
}

async function togFav(ev,id){
  if(ev)ev.stopPropagation();var b=allBuilds.find(function(x){return x.id===id});if(!b)return;
  try{await upd('builds',{'id':'eq.'+id},{is_favourite:!b.is_favourite},true);
  b.is_favourite=!b.is_favourite;toast(b.is_favourite?'⭐ Favourited!':'Unfavourited');renderBuilds()}catch(e){toast(e.message,'err')}
}

// #SECTION: SHOWDOWN EXPORT
// ───────────────────────────────────────
// SHOWDOWN EXPORT
// Build a Showdown-friendly plaintext export.
// ───────────────────────────────────────

function exportShowdown(id){
  var b=allBuilds.find(function(x){return x.id===id});if(!b)return;
  var lines=[];
  var itemStr=b.item_name?' @ '+b.item_name:'';
  // Build a Showdown-friendly plaintext export from the saved build fields.
  lines.push((b.pokemon_name||'Unknown')+itemStr);
  if(b.ability)lines.push('Ability: '+b.ability);
  if(b.nature_name)lines.push(b.nature_name+' Nature');
  // EVs (map SP to EVs — SP×8 is a rough approximation)
  var evs=[];
  if(b.hp_sp)evs.push(b.hp_sp*8+' HP');if(b.atk_sp)evs.push(b.atk_sp*8+' Atk');
  if(b.def_sp)evs.push(b.def_sp*8+' Def');if(b.spa_sp)evs.push(b.spa_sp*8+' SpA');
  if(b.spd_sp)evs.push(b.spd_sp*8+' SpD');if(b.spe_sp)evs.push(b.spe_sp*8+' Spe');
  if(evs.length)lines.push('EVs: '+evs.join(' / '));
  if(b.move_1)lines.push('- '+b.move_1);if(b.move_2)lines.push('- '+b.move_2);
  if(b.move_3)lines.push('- '+b.move_3);if(b.move_4)lines.push('- '+b.move_4);
  var text=lines.join('\n');
  // Show in modal for easy copy (clipboard API blocked in sandbox)
  var mod=document.getElementById('confirmMod');
  document.getElementById('cmEmoji').textContent='📤';
  document.getElementById('cmTitle').textContent='Showdown Export';
  document.getElementById('cmMsg').innerHTML='<textarea style="width:100%;min-height:140px;padding:.6rem;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:monospace;font-size:.82rem;resize:vertical;margin-top:.5rem" onclick="this.select()" readonly>'+text.replace(/</g,'&lt;')+'</textarea><div style="font-size:.72rem;color:var(--muted);margin-top:.4rem">Click the text → Ctrl+C / Cmd+C to copy</div>';
  document.getElementById('cmBtn').textContent='Done';
  document.getElementById('cmBtn').onclick=closeCm;
  document.getElementById('cmBtn').className='btn btn-ghost';
  mod.classList.add('open');
}

// Item picker and Move picker → see app/app-pickers.js
