// #SECTION: APP PICKERS
// ═══════════════════════════════════════
// APP PICKERS (extracted from app-builds.js)
// Ability Picker · Nature Picker · Item Picker · Move Picker
// Depends on: app-builds.js (selPkmnId, edRefresh, editorShiny)
//             app-profile.js (NAT_SC, NAT_ARCH, allNatures)
//             app-teams.js (selBuildIds, renderTeams)
// ═══════════════════════════════════════


var ablPickerCache={};

// ─── Desktop Finder-window picker (≥1024px only) ─────────────────────────────
// On desktop, pickers open as a THIRD column — stat calc | form | picker.
// The form stays fully visible. Mobile behavior is completely unchanged.
function _edDeskPicker(html,title){
  if(window.innerWidth<1024)return false;
  var col=document.getElementById('edPickerCol');
  if(!col)return false;
  col.innerHTML=
    '<div class="ed-dp-hdr">'+
      '<span class="ed-dp-title">'+title+'</span>'+
      '<button class="ed-dp-close" onclick="_edDeskClose()">✕</button>'+
    '</div>'+
    '<div class="ed-dp-body">'+html+'</div>';
  col.classList.add('open');
  // Match height to form col so all 3 cols line up, with inner scroll
  requestAnimationFrame(function(){
    var formCol=document.querySelector('.ed-right-col');
    if(formCol){
      var h=Math.min(formCol.getBoundingClientRect().height,window.innerHeight-160);
      col.style.height=h+'px';
    }
  });
  return true;
}
function _edDeskClose(){
  var col=document.getElementById('edPickerCol');
  if(!col)return;
  col.style.height='';
  col.classList.remove('open');
  setTimeout(function(){col.innerHTML='';},300);
}
// Strategy section: desktop intercept — opens text fields in third panel
function _edStrategyClick(e){
  if(window.innerWidth<1024)return true; // mobile: normal <details> toggle
  e.preventDefault();
  var b=editBuildId?allBuilds.find(function(x){return x.id===editBuildId}):null;
  var html=
    '<div><label class="ed-label">Win Condition</label>'+
    '<textarea class="ed-textarea ed-dp-strat-ta" id="edWin">'+(b?b.win_condition||'':'')+'</textarea></div>'+
    '<div style="margin-top:.6rem"><label class="ed-label">Strengths</label>'+
    '<textarea class="ed-textarea ed-dp-strat-ta" id="edStr">'+(b?b.strengths||'':'')+'</textarea></div>'+
    '<div style="margin-top:.6rem"><label class="ed-label">Weaknesses</label>'+
    '<textarea class="ed-textarea ed-dp-strat-ta" id="edWeak">'+(b?b.weaknesses||'':'')+'</textarea></div>';
  _edDeskPicker(html,'Strategy');
  // Size textareas to fill the panel height evenly
  requestAnimationFrame(function(){
    var col=document.getElementById('edPickerCol');
    if(!col)return;
    var available=col.getBoundingClientRect().height - 54 - 24 - 3*32 - 2*10; // header + padding + labels + gaps
    var taH=Math.max(Math.floor(available/3), 60);
    ['edWin','edStr','edWeak'].forEach(function(id){
      var el=document.getElementById(id);
      if(el)el.style.height=taH+'px';
    });
  });
  return false;
}

// ═══════════════════════════════════════
// TEAM BUILD PICKER
// Slot-aware build picker used by the Teams editor.
// Opens as a bottom sheet instead of sending the user down to a long inline list.
// Writes selected build ids into selBuildIds, preserving saveTeam() contract.
// ═══════════════════════════════════════

var _tbpSlot=1,_tbpSearch='',_tbpFormat='all',_tbpType='all',_tbpMode='available';

function tbpEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function tbpJs(v){return String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}

function ensureTeamBuildPickerOverlay(){
  var ov=document.getElementById('teamBuildPickerOv');
  if(ov)return ov;
  ov=document.createElement('div');
  ov.id='teamBuildPickerOv';
  ov.setAttribute('aria-hidden','true');
  ov.style.cssText='position:fixed;inset:0;z-index:1900;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);padding:0;';
  document.body.appendChild(ov);
  return ov;
}

function openTeamBuildPicker(slot){
  var maxSlot=Math.min(6,(selBuildIds||[]).length+1);
  _tbpSlot=Math.max(1,Math.min(Number(slot)||1,maxSlot));
  _tbpSearch='';
  _tbpFormat='all';
  _tbpType='all';
  _tbpMode='available';
  var ov=ensureTeamBuildPickerOverlay();
  renderTeamBuildPickerShell();
  renderTeamBuildPickerBody();
  ov.style.display='flex';
  ov.setAttribute('aria-hidden','false');
  ov.onclick=function(e){if(e.target===ov)closeTeamBuildPicker();};
  setTimeout(function(){var input=document.getElementById('tbpSearchInput');if(input)input.focus();},60);
}

function closeTeamBuildPicker(){
  var ov=document.getElementById('teamBuildPickerOv');
  if(!ov)return;
  ov.style.display='none';
  ov.setAttribute('aria-hidden','true');
}

function setTeamBuildPickerSearch(v){_tbpSearch=(v||'').toLowerCase();renderTeamBuildPickerBody()}
function setTeamBuildPickerFormat(v){_tbpFormat=v||'all';renderTeamBuildPickerShell();renderTeamBuildPickerBody()}
function setTeamBuildPickerType(v){_tbpType=v||'all';renderTeamBuildPickerShell();renderTeamBuildPickerBody()}
function setTeamBuildPickerMode(v){_tbpMode=v||'available';renderTeamBuildPickerShell();renderTeamBuildPickerBody()}

function tbpBuildTypeOptions(){
  var seen={},out=[];
  (allBuilds||[]).forEach(function(b){
    [b.type_1,b.type_2].forEach(function(t){if(t&&!seen[t]){seen[t]=1;out.push(t)}});
  });
  return out.sort();
}

function tbpVisibleBuilds(){
  var selected=selBuildIds||[];
  var currentId=selected[_tbpSlot-1]||'';
  return (allBuilds||[]).filter(function(b){
    if(!b||!b.id)return false;
    var alreadySelected=selected.indexOf(b.id)!==-1&&b.id!==currentId;
    if(_tbpMode==='available'&&alreadySelected)return false;
    if(_tbpMode==='favourites'&&!b.is_favourite)return false;
    if(_tbpFormat!=='all'){
      var bf=b.battle_format||b.format||'';
      if(bf!==_tbpFormat)return false;
    }
    if(_tbpType!=='all'&&b.type_1!==_tbpType&&b.type_2!==_tbpType)return false;
    if(_tbpSearch){
      var hay=[b.pokemon_name,b.build_name,b.archetype,b.item_name,b.ability,b.nature_name,b.type_1,b.type_2].join(' ').toLowerCase();
      if(hay.indexOf(_tbpSearch)===-1)return false;
    }
    return true;
  });
}

function tbpPill(label,value,current,handler){
  return '<button type="button" class="it-pill'+(value===current?' active':'')+'" onclick="'+handler+'(\''+tbpJs(value)+'\')">'+label+'</button>';
}

function renderTeamBuildPickerShell(){
  var ov=ensureTeamBuildPickerOverlay();
  var selected=selBuildIds||[];
  var currentId=selected[_tbpSlot-1]||'';
  var current=currentId?(allBuilds||[]).find(function(b){return b.id===currentId}):null;
  var typeOptions=tbpBuildTypeOptions();
  var typePills=tbpPill('All Types','all',_tbpType,'setTeamBuildPickerType')+typeOptions.map(function(t){return tbpPill(t,t,_tbpType,'setTeamBuildPickerType')}).join('');
  var html='<div class="picker-sheet tbp-sheet">'+
    '<div class="picker-head tbp-head">'+
      '<div class="picker-handle"></div>'+
      '<div class="picker-title tbp-title">'+
        '<div><span>Choose build for Slot '+_tbpSlot+'</span><div class="tbp-sub">'+(current?'Replacing '+tbpEsc(current.pokemon_name||current.build_name):'Select one of your saved builds')+'</div></div>'+
        '<button type="button" class="picker-close" onclick="closeTeamBuildPicker()" aria-label="Close">✕</button>'+
      '</div>'+
      '<div class="picker-search"><input class="search-box" id="tbpSearchInput" placeholder="Search Pokémon, build, item, role..." value="'+tbpEsc(_tbpSearch)+'" oninput="setTeamBuildPickerSearch(this.value)" autocomplete="off"></div>'+
      '<div class="picker-tabs tbp-tabs">'+
        tbpPill('Available','available',_tbpMode,'setTeamBuildPickerMode')+
        tbpPill('All','all',_tbpMode,'setTeamBuildPickerMode')+
        tbpPill('Favourites','favourites',_tbpMode,'setTeamBuildPickerMode')+
        '<span class="tbp-tab-sep"></span>'+
        tbpPill('All Formats','all',_tbpFormat,'setTeamBuildPickerFormat')+
        tbpPill('Singles','Singles',_tbpFormat,'setTeamBuildPickerFormat')+
        tbpPill('Doubles','Doubles',_tbpFormat,'setTeamBuildPickerFormat')+
      '</div>'+
      '<div class="picker-tabs tbp-tabs tbp-type-tabs">'+typePills+'</div>'+
    '</div>'+
    '<div class="picker-body tbp-body" id="teamBuildPickerBody"></div>'+
  '</div>';
  ov.innerHTML=html;
}

function renderTeamBuildPickerBody(){
  var body=document.getElementById('teamBuildPickerBody');
  if(!body)return;
  var builds=tbpVisibleBuilds();
  var selected=selBuildIds||[];
  var currentId=selected[_tbpSlot-1]||'';
  if(!(allBuilds||[]).length){
    body.innerHTML='<div class="empty" style="padding:2rem 0;text-align:center;color:var(--muted);font-size:.82rem">No builds yet. Create some in the Builds page first.</div>';
    return;
  }
  if(!builds.length){
    body.innerHTML='<div class="empty" style="padding:2rem 0;text-align:center;color:var(--muted);font-size:.82rem">No builds match those filters.</div>';
    return;
  }
  body.innerHTML='<div class="tbp-list">'+builds.map(function(b){
    var picked=b.id===currentId;
    var alreadySelected=selected.indexOf(b.id)!==-1&&!picked;
    var img=b.is_shiny&&b.shiny_url?b.shiny_url:(b.image_url||'');
    var isMega=b.form==='Mega';
    var t1=b.type_1,t2=b.type_2;
    var t1Col=t1&&TC[t1]?TC[t1].m:'var(--muted)';
    var t2Col=t2&&TC[t2]?TC[t2].m:'';
    var sub=[b.archetype,b.nature_name,b.item_name].filter(Boolean).join(' · ')||'No build notes yet';
    var format=b.battle_format||b.format||'';
    return '<button type="button" class="tbp-build-row'+(picked?' selected':'')+(alreadySelected?' already':'')+'" onclick="selectTeamBuildForSlot(\''+tbpJs(b.id)+'\')">'+
      '<div class="tbp-sprite" style="background:linear-gradient(135deg,'+t1Col+'26,var(--surface2))"><img src="'+tbpEsc(img)+'" alt="" onerror="this.style.opacity=\'0.2\'"></div>'+
      '<div class="tbp-info">'+
        '<div class="tbp-name"><span>'+(picked?'✓ ':'')+tbpEsc(b.pokemon_name||'?')+'</span>'+(isMega&&typeof megaBadge==='function'?megaBadge(16):'')+(b.is_shiny?' <span class="tbp-shiny">✦</span>':'')+'</div>'+
        '<div class="tbp-build-name">'+tbpEsc(b.build_name||'Untitled build')+'</div>'+
        '<div class="tbp-meta">'+tbpEsc(sub)+' · '+(b.total_sp||0)+' SP</div>'+
      '</div>'+
      '<div class="tbp-right">'+
        '<div class="tbp-types">'+(t1?'<span class="type-pill" style="background:'+t1Col+'">'+tbpEsc(t1)+'</span>':'')+(t2?'<span class="type-pill" style="background:'+t2Col+'">'+tbpEsc(t2)+'</span>':'')+'</div>'+
        (format?'<span class="tbp-format">'+tbpEsc(format)+'</span>':'')+
        (alreadySelected?'<span class="tbp-already">Already in team</span>':'')+
      '</div>'+
    '</button>';
  }).join('')+'</div>';
}

function selectTeamBuildForSlot(buildId){
  if(!buildId)return;
  var existing=selBuildIds.indexOf(buildId);
  var currentIndex=_tbpSlot-1;
  if(existing!==-1&&existing!==currentIndex){
    toast('That build is already on this team','err');
    return;
  }

  if(typeof tdCollapsed==='object'&&tdCollapsed){
    var previousId=selBuildIds[currentIndex];
    if(previousId&&previousId!==buildId)delete tdCollapsed[previousId];
  }

  if(currentIndex<selBuildIds.length){
    selBuildIds[currentIndex]=buildId;
  }else if(selBuildIds.length<6){
    selBuildIds.push(buildId);
  }else{
    toast('Team is already full','err');
    return;
  }

  if(typeof tdCollapsed==='object'&&tdCollapsed){
    tdCollapsed[buildId]=true;
  }

  closeTeamBuildPicker();
  renderTeams();
}

async function _loadAblOptionsForPkmn(pokemonId){
  if(ablPickerCache[pokemonId])return ablPickerCache[pokemonId];
  try{
    var rows=await q('pokemon_abilities',{'pokemon_id':'eq.'+pokemonId,select:'slot,ability_id',order:'slot.asc'});
    var opts=rows.map(function(row){
      var abl=(window.allAbilities||[]).find(function(a){return a.id===row.ability_id});
      return{slot:row.slot,id:row.ability_id,name:abl?abl.name:'?',desc:abl?abl.short_description||'':''};
    });
    ablPickerCache[pokemonId]=opts;
    return opts;
  }catch(e){ablPickerCache[pokemonId]=[];return[];}
}

function openAbilityPicker(){
  var curAbi=document.getElementById('edAbi')?document.getElementById('edAbi').value||''  :'';
  var pkmnName=selPkmnId?(window.allPkmn||[]).find(function(p){return p.id===selPkmnId}):null;
  var pkmnLabel=pkmnName?pkmnName.name:'';
  // Desktop: render inline in right column
  if(_edDeskPicker('<div class="abl-pk-list" id="ablPkList"><div class="abl-pk-empty">Loading…</div></div>',
    'Choose Ability'+(pkmnLabel?' — '+pkmnLabel:''))){
    if(!selPkmnId){var l=document.getElementById('ablPkList');if(l)l.innerHTML='<div class="abl-pk-empty">Select a Pokémon first to see its legal abilities.</div>';return;}
    _loadAblOptionsForPkmn(selPkmnId).then(function(opts){_renderAblPickerContent(opts,curAbi);});
    return;
  }
  // Mobile: bottom-sheet overlay
  var ov=document.getElementById('abilityPickerOv');
  if(!ov)return;
  ov.innerHTML='<div class="abl-pk-sheet">'+
    '<div class="abl-pk-handle"></div>'+
    '<div class="abl-pk-head">'+
      '<div><div class="abl-pk-title">Choose Ability</div>'+(pkmnLabel?'<div class="abl-pk-sub">'+pkmnLabel+'</div>':'')+'</div>'+
      '<button class="abl-pk-close" onclick="closeAbilityPicker()">✕</button>'+
    '</div>'+
    '<div class="abl-pk-list" id="ablPkList"><div class="abl-pk-empty">Loading…</div></div>'+
  '</div>';
  ov.classList.add('open');
  ov.onclick=function(e){if(e.target===ov)closeAbilityPicker();};
  if(!selPkmnId){
    document.getElementById('ablPkList').innerHTML='<div class="abl-pk-empty">Select a Pokémon first to see its legal abilities.</div>';
    return;
  }
  _loadAblOptionsForPkmn(selPkmnId).then(function(opts){_renderAblPickerContent(opts,curAbi);});
}

function _renderAblPickerContent(opts,curAbi){
  var listEl=document.getElementById('ablPkList');
  if(!listEl)return;
  var SLOT_LABELS={'1':'Ability 1','2':'Ability 2','hidden':'Hidden Ability'};
  if(!opts||!opts.length){
    listEl.innerHTML='<div class="abl-pk-empty">No ability data for this Pokémon.<br>Use the admin panel to add entries.</div>';
    return;
  }
  listEl.innerHTML=opts.map(function(opt){
    var isSel=opt.name===curAbi;
    return '<div class="abl-pk-card'+(isSel?' sel':'')+'" onclick="pickAbility(\''+opt.name.replace(/'/g,"\\'")+'\')">'+
      '<div class="abl-pk-slot">'+(SLOT_LABELS[opt.slot]||opt.slot)+'</div>'+
      '<div class="abl-pk-name">'+opt.name+'</div>'+
      (opt.desc?'<div class="abl-pk-desc">'+opt.desc+'</div>':'')+
    '</div>';
  }).join('');
}

function pickAbility(name){
  var inp=document.getElementById('edAbi');
  var lbl=document.getElementById('edAbiLabel');
  var btn=document.getElementById('edAbiBtn');
  var warn=document.getElementById('edAbiWarn');
  if(inp)inp.value=name;
  if(lbl)lbl.textContent=name;
  if(btn)btn.classList.remove('empty');
  if(warn)warn.style.display=abilityLegalityState(name,selPkmnId)==='illegal'?'inline':'none';
  _edDeskClose(); // desktop: return to form
  closeAbilityPicker(); // mobile: close overlay
}

function closeAbilityPicker(){
  var ov=document.getElementById('abilityPickerOv');
  if(ov)ov.classList.remove('open');
}

// ─── Drop H: Nature Picker ───────────────────────────────────────────────────
// Bottom-sheet replacement for the native nature <select>.
// Hidden input #edNat preserves saveBuild() / edGetNature() read contract.
// NAT_SC, NAT_ARCH, _natEqBars are global from app-profile.js.
// ─────────────────────────────────────────────────────────────────────────────

var _NAT_GROUPS=[
  {key:'attack',    label:'Attack ▲'},
  {key:'sp_attack', label:'Sp. Atk ▲'},
  {key:'defense',   label:'Defense ▲'},
  {key:'sp_defense',label:'Sp. Def ▲'},
  {key:'speed',     label:'Speed ▲'},
];

function openNaturePicker(){
  var curId=(document.getElementById('edNat')||{}).value||'';
  // Desktop: render inline in right column
  if(_edDeskPicker('<div class="nat-pk-list" id="natPkList">'+_renderNaturePickerContent(curId)+'</div>','Choose Nature'))return;
  // Mobile: bottom-sheet overlay
  var ov=document.getElementById('naturePickerOv');
  if(!ov)return;
  ov.innerHTML='<div class="nat-pk-sheet">'+
    '<div class="nat-pk-handle"></div>'+
    '<div class="nat-pk-head">'+
      '<div class="nat-pk-title">Choose Nature</div>'+
      '<button class="nat-pk-close" onclick="closeNaturePicker()">✕</button>'+
    '</div>'+
    '<div class="nat-pk-list" id="natPkList">'+_renderNaturePickerContent(curId)+'</div>'+
  '</div>';
  ov.classList.add('open');
  ov.onclick=function(e){if(e.target===ov)closeNaturePicker();};
}

function _renderNaturePickerContent(curId){
  var html='<div class="nat-pk-none'+(curId===''?' sel':'')+'" onclick="pickNature(\'\')">'+
    '<span class="nat-pk-none-lbl">— None —</span>'+
  '</div>';
  _NAT_GROUPS.forEach(function(g){
    var nats=allNatures.filter(function(n){return n.increased_stat===g.key;});
    if(!nats.length)return;
    var sc=NAT_SC[g.key];
    html+='<div class="nat-pk-grp" style="color:'+sc.c+'">'+g.label+'</div>';
    nats.forEach(function(n){
      var isSel=n.id===curId;
      var arch=NAT_ARCH[n.name]||'—';
      html+='<div class="nat-pk-row'+(isSel?' sel':'')+'" onclick="pickNature(\''+n.id+'\')">'+
        '<div class="nat-pk-row-left">'+
          '<div class="nat-pk-row-name">'+n.name+'</div>'+
          '<div class="nat-pk-row-arch">'+arch+'</div>'+
        '</div>'+
        '<div class="nat-pk-row-eq">'+_natEqBarsCompact(n)+'</div>'+
      '</div>';
    });
  });
  return html;
}

// 2-bar compact EQ: only boosted (▲ tall) + lowered (▼ short). Used in picker only.
// For full 5-bar EQ used in Reference tab, see _natEqBars() in app-profile.js.
function _natEqBarsCompact(n){
  if(!n.increased_stat)return '';
  var u=NAT_SC[n.increased_stat],d=NAT_SC[n.decreased_stat];
  return '<div class="eq-bars" style="gap:5px;justify-content:center">'+
    '<div class="eq-col">'+
      '<div class="eq-track" style="height:20px;background:var(--surface2);">'+
        '<div class="eq-fill" style="height:90%;background:'+u.c+';opacity:.95;"></div>'+
      '</div>'+
      '<div class="eq-lbl" style="color:'+u.c+';font-weight:900;">'+u.s+'</div>'+
    '</div>'+
    '<div class="eq-col">'+
      '<div class="eq-track" style="height:20px;background:var(--surface2);opacity:.28;">'+
        '<div class="eq-fill" style="height:12%;background:'+d.c+';opacity:.9;"></div>'+
      '</div>'+
      '<div class="eq-lbl" style="opacity:.35;">'+d.s+'</div>'+
    '</div>'+
  '</div>';
}

function pickNature(id){
  var hidEl=document.getElementById('edNat');
  if(hidEl)hidEl.value=id;
  edRefresh();
  _edDeskClose(); // desktop: return to form
  closeNaturePicker(); // mobile: close overlay
}

function closeNaturePicker(){
  var ov=document.getElementById('naturePickerOv');
  if(ov)ov.classList.remove('open');
}

// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ITEM PICKER (Drop D.2)
// Bottom-sheet replacement for the native <select>.
// Filters items by the selected Pokémon's species_lock and hides
// Mega Stones entirely when the Pokémon is already a Mega form.
// ═══════════════════════════════════════

var _pickerCategory='all',_pickerSearch='';

function openItemPicker(){
  _pickerCategory='all';_pickerSearch='';
  // Desktop: render item picker inside third panel
  if(window.innerWidth>=1024){
    // Inject a stub #itemPickerOv into the panel; render functions target it by id
    if(_edDeskPicker('<div id="itemPickerOv" style="display:block;background:transparent"></div>','Choose Item')){
      renderItemPickerShell();
      renderItemPickerBody();
      return;
    }
  }
  renderItemPickerShell();
  renderItemPickerBody();
  document.getElementById('itemPickerOv').classList.add('open');
}
function closeItemPicker(){
  _edDeskClose(); // desktop: close third panel
  var ov=document.getElementById('itemPickerOv');
  if(ov)ov.classList.remove('open'); // mobile
}
// Search & filter changes update ONLY the body — shell (with the focused input) stays intact.
function setPickerCategory(cat){_pickerCategory=cat||'all';updatePickerTabs();renderItemPickerBody()}
function setPickerSearch(val){_pickerSearch=(val||'').toLowerCase();updatePickerTabs();renderItemPickerBody()}

// Items eligible for THIS Pokémon (species-lock + mega-form rules).
function pickerEligibleItems(){
  var p=selPkmnId?allPkmn.find(function(x){return x.id===selPkmnId}):null;
  var pname=p?p.name:null;
  var isMega=p&&p.form==='Mega';
  return allItems.filter(function(i){
    // Mega stones: hide entirely for Mega forms; otherwise match species_lock
    if(i.category==='mega_stone'){
      if(isMega)return false;
      return i.species_lock&&pname&&i.species_lock===pname;
    }
    // Other species-locked items (e.g. Light Ball → Pikachu)
    if(i.species_lock){
      return pname&&i.species_lock===pname;
    }
    return true;
  });
}

function pickerVpBadge(item){
  if(item.acquisition==='base_game')return '<span class="picker-item-cost"><i class="ph-bold ph-gift"></i> Free</span>';
  if(item.acquisition==='mega_tutorial')return '<span class="picker-item-cost"><i class="ph-bold ph-trophy"></i> Tutorial</span>';
  if(item.acquisition==='transfer_plza')return '<span class="picker-item-cost"><i class="ph-bold ph-arrows-clockwise"></i> Z-A</span>';
  if(item.acquisition==='shop'&&item.vp_cost)return '<span class="picker-item-cost"><i class="ph-bold ph-shopping-cart"></i> '+item.vp_cost+'</span>';
  return '';
}

// Tab counts that respect the current search but ignore the current category.
function pickerTabCounts(){
  var eligible=pickerEligibleItems();
  var counts={all:0,hold:0,berry:0,mega_stone:0};
  eligible.forEach(function(i){
    if(_pickerSearch&&i.name.toLowerCase().indexOf(_pickerSearch)===-1)return;
    counts.all++;
    if(counts[i.category]!==undefined)counts[i.category]++;
  });
  return counts;
}

// Rebuild the sticky shell once per open. This writes the search <input> which
// is then LEFT ALONE during search/filter updates so focus and cursor position
// stay intact on every keystroke.
function renderItemPickerShell(){
  var p=selPkmnId?allPkmn.find(function(x){return x.id===selPkmnId}):null;
  var pname=p?p.name:'';
  var counts=pickerTabCounts();
  var tabs=['all','hold','berry','mega_stone'].map(function(cat){
    var label={all:'All',hold:'Hold',berry:'Berries',mega_stone:'Megas'}[cat];
    var active=_pickerCategory===cat?' active':'';
    return '<button class="it-pill'+active+'" data-cat="'+cat+'" onclick="setPickerCategory(\''+cat+'\')">'+label+'<span class="count">'+counts[cat]+'</span></button>';
  }).join('');
  var html='<div class="picker-sheet">'+
    '<div class="picker-head">'+
      '<div class="picker-handle"></div>'+
      '<div class="picker-title"><span>Choose Item'+(pname?' for '+pname:'')+'</span><button class="picker-close" onclick="closeItemPicker()" aria-label="Close">✕</button></div>'+
      '<div class="picker-search"><input class="search-box" id="pickerSearchInput" placeholder="Search items..." value="'+_pickerSearch.replace(/"/g,'&quot;')+'" oninput="setPickerSearch(this.value)" autocomplete="off"></div>'+
      '<div class="picker-tabs" id="pickerTabs">'+tabs+'</div>'+
    '</div>'+
    '<div class="picker-body" id="pickerBody"></div>'+
  '</div>';
  document.getElementById('itemPickerOv').innerHTML=html;
}

// Update just the tab labels + counts + active class. Doesn't touch search input.
function updatePickerTabs(){
  var wrap=document.getElementById('pickerTabs');if(!wrap)return;
  var counts=pickerTabCounts();
  wrap.querySelectorAll('.it-pill').forEach(function(btn){
    var cat=btn.dataset.cat;
    btn.classList.toggle('active',_pickerCategory===cat);
    var c=btn.querySelector('.count');if(c)c.textContent=counts[cat];
  });
}

// Rebuild ONLY the item list. Called on every search/filter change.
function renderItemPickerBody(){
  var p=selPkmnId?allPkmn.find(function(x){return x.id===selPkmnId}):null;
  var pname=p?p.name:'';
  var currentId=(document.getElementById('edItem')||{}).value||'';
  var eligible=pickerEligibleItems();
  var filtered=eligible.filter(function(i){
    if(_pickerSearch&&i.name.toLowerCase().indexOf(_pickerSearch)===-1)return false;
    if(_pickerCategory!=='all'&&i.category!==_pickerCategory)return false;
    return true;
  });
  // Group by category for section headers
  var groups={hold:[],berry:[],mega_stone:[]};
  filtered.forEach(function(i){if(groups[i.category])groups[i.category].push(i)});
  var groupLabels={
    hold:'Hold Items',
    berry:'Berries',
    mega_stone:'Mega Stones'+(pname?' for '+pname:'')
  };
  var body='';
  // "None" option at the very top (keeps "no item" selectable)
  body+='<div class="picker-item'+(currentId===''?' selected':'')+'" onclick="pickItem(\'\')"'+
    '><div class="picker-sprite"><i class="ph-bold ph-prohibit" style="color:var(--muted);font-size:1rem"></i></div>'+
    '<div class="picker-item-name">— None —</div></div>';
  ['hold','berry','mega_stone'].forEach(function(cat){
    if(!groups[cat].length)return;
    if(_pickerCategory!=='all'&&_pickerCategory!==cat)return;
    body+='<div class="picker-group-label">'+groupLabels[cat]+'</div>';
    groups[cat].forEach(function(i){
      var sel=currentId===i.id?' selected':'';
      var sprite=i.sprite_url?'<img src="'+i.sprite_url+'" alt="" onerror="this.style.display=\'none\'">':'';
      body+='<div class="picker-item'+sel+'" onclick="pickItem(\''+i.id+'\')">'+
        '<div class="picker-sprite">'+sprite+'</div>'+
        '<div class="picker-item-name">'+i.name+'</div>'+
        pickerVpBadge(i)+
      '</div>';
    });
  });
  if(!filtered.length){
    body+='<div class="empty" style="padding:2rem 0;text-align:center;color:var(--muted);font-size:.82rem">No items match</div>';
  }
  var el=document.getElementById('pickerBody');if(el)el.innerHTML=body;
}

// User taps an item in the picker.
function pickItem(id){
  var hidden=document.getElementById('edItem');if(hidden)hidden.value=id;
  var btn=document.getElementById('edItemBtn');
  if(btn){
    if(!id){
      btn.innerHTML='<span class="placeholder">— None —</span><i class="ph-bold ph-caret-down" style="color:var(--muted)"></i>';
    }else{
      var item=allItems.find(function(i){return i.id===id});
      if(item){
        btn.innerHTML=(item.sprite_url?'<div class="be-select-chosen"><img src="'+item.sprite_url+'" alt=""><span>'+item.name+'</span></div>':'<div class="be-select-chosen"><span>'+item.name+'</span></div>')+
          '<i class="ph-bold ph-caret-down" style="color:var(--muted)"></i>';
      }
    }
  }
  closeItemPicker();
}
// Backdrop click dismisses the picker.
document.addEventListener('click',function(e){
  var ov=document.getElementById('itemPickerOv');
  if(ov&&e.target===ov)closeItemPicker();
});

// #SECTION: MOVE PICKER (Drop E)
// ═══════════════════════════════════════
// MOVE PICKER
// Full-screen sheet that lists the selected Pokémon's legal move pool,
// with search, legal-types-only filter, STAB watermark, an expandable
// glossary, and used-slot dimming. Writes the chosen move name back to
// hidden inputs (edM1..edM4) so saveBuild() contract stays unchanged.
// Mirrors the Drop D.2 item picker pattern: stable shell + re-rendered
// body so the search input never loses focus mid-keystroke.
// ═══════════════════════════════════════

// Picker state (underscore-prefixed to match item-picker convention)
var _mpSlot=0,_mpSearch='',_mpType='all',_mpGlossOpen=false,_mpLearnset=[];

// Small category letters for inline chips: P / S / St
function mpCatAbbr(c){return c==='Status'?'St':(c||'').charAt(0)}

// Pulls the 4 currently-held move names from hidden inputs (so the shared
// font size reflects live state, including after a pick).
function msCurrentNames(){
  var out=[];
  for(var i=1;i<=4;i++){var el=document.getElementById('edM'+i);out.push(el?el.value:'')}
  return out;
}

// Slot field for the editor: hidden input (saveBuild reads this) + clickable card
// that shows type-gradient + name when filled, or a dashed empty placeholder.
// Legality: flagged via moveLegalityState(name, selPkmnId) so legacy free-text
// picks surface as "unknown" or "illegal" warnings instead of silently rendering.
// fontSize is a shared rem value computed across all 4 slots so the row stays uniform.
function msSlotField(slot,curName,fontSize){
  var id='edM'+slot;
  var esc=(curName||'').replace(/"/g,'&quot;');
  var state=moveLegalityState(curName,selPkmnId);
  return '<input type="hidden" id="'+id+'" value="'+esc+'">'+
    '<button type="button" class="ms-slot'+(curName?' filled':'')+' ms-state-'+state+'" id="'+id+'Btn" data-slot="'+slot+'" onclick="openMovePicker('+slot+')">'+
      msSlotInner(curName,selPkmnId,fontSize)+
    '</button>';
}

// Inner markup for a slot button — reused when the picker updates the button after a pick.
// Two-line stack: name on top, small type chip below. Keeps the row fixed height,
// prevents horizontal overflow from long names + type labels.
function msSlotInner(name,pokemonId,fontSize){
  if(!name){
    return '<span class="ms-empty"><i class="ph-bold ph-plus-circle"></i>Pick a move</span>'+
      '<i class="ph-bold ph-caret-down ms-chev"></i>';
  }
  var state=moveLegalityState(name,pokemonId);
  var m=allMoveIndex[name];
  var type=m?m.type:null;
  var col=type&&TC[type]?TC[type]:null;
  // Unknown moves: no gradient (no type info); neutral surface so the warning
  // icon reads clearly. Illegal moves: keep the gradient (type is known) but
  // overlay the warning.
  var bg=(col&&state!=='unknown')?'linear-gradient(135deg,'+col.m+','+col.d+')':'var(--surface)';
  var typeLbl=(type&&state!=='unknown')?('<span class="ms-type-mini">'+type.toUpperCase()+'</span>'):'';
  var warn='';
  if(state==='unknown')warn='<span class="ms-warn" title="Unknown move name — not in Champions"><i class="ph-fill ph-warning"></i></span>';
  else if(state==='illegal'){
    var p=pokemonId?allPkmn.find(function(x){return x.id===pokemonId}):null;
    var pname=p?displayName(p):'this Pokémon';
    warn='<span class="ms-warn" title="Not legal for '+pname.replace(/"/g,'&quot;')+'"><i class="ph-fill ph-warning"></i></span>';
  }
  var nameStyle=fontSize?(' style="font-size:'+fontSize+'"'):'';
  return '<span class="ms-filled-bg" style="background:'+bg+'"></span>'+
    '<span class="ms-text">'+
      '<span class="ms-name"'+nameStyle+'>'+name+'</span>'+
      typeLbl+
    '</span>'+
    warn+
    '<i class="ph-bold ph-caret-down ms-chev"></i>';
}

// Re-render all 4 slot buttons — used after loadLearnset resolves so 'pending'
// legality states flip, and after a pick so the shared font size re-computes
// against the new set of 4 names.
function msRefreshSlots(){
  var names=msCurrentNames();
  var fs=movesetFontSize(names);
  for(var i=1;i<=4;i++){
    var id='edM'+i;
    var btn=document.getElementById(id+'Btn');
    if(!btn)continue;
    var name=names[i-1];
    var state=moveLegalityState(name,selPkmnId);
    btn.className='ms-slot'+(name?' filled':'')+' ms-state-'+state;
    btn.innerHTML=msSlotInner(name,selPkmnId,fs);
  }
}

// Build detail move card — name only over a type-matched gradient.
// Uses allMoveIndex as the lookup (preloaded at boot). Falls back to a
// neutral tile for empty / unknown moves. Adds a ⚠️ badge for legacy
// free-text moves that are unknown or illegal for the species.
// Passes a shared font-size so every card in the grid stays visually uniform.
function bdMoveCard(name,pokemonId,fontSize){
  var fs=fontSize?' style="font-size:'+fontSize+'"':'';
  if(!name)return '<div class="bd-move bd-move-empty"'+fs+'>—</div>';
  var state=moveLegalityState(name,pokemonId);
  var m=allMoveIndex[name];
  // Unknown: no type info, plain card + warning badge
  if(state==='unknown'||!m||!TC[m.type]){
    return '<div class="bd-move bd-move-plain bd-move-warn"'+fs+' title="Unknown move name — not in Champions">'+
      '<i class="ph-fill ph-warning bd-move-flag"></i>'+
      '<span class="bd-move-name">'+name+'</span>'+
    '</div>';
  }
  var col=TC[m.type];
  var warnCls=(state==='illegal')?' bd-move-warn':'';
  var warnIcon='';
  if(state==='illegal'){
    var p=pokemonId?allPkmn.find(function(x){return x.id===pokemonId}):null;
    var pname=p?displayName(p):'this Pokémon';
    warnIcon='<i class="ph-fill ph-warning bd-move-flag" title="Not legal for '+pname.replace(/"/g,'&quot;')+'"></i>';
  }
  var bgStyle='background:linear-gradient(135deg,'+col.m+','+col.d+')';
  var style=fontSize?(' style="'+bgStyle+';font-size:'+fontSize+'"'):(' style="'+bgStyle+'"');
  return '<div class="bd-move bd-move-typed'+warnCls+'"'+style+'>'+
    warnIcon+
    '<span class="bd-move-name">'+name+'</span>'+
  '</div>';
}

// Open picker for slot N. Loads the learnset (cached), builds shell + body.
async function openMovePicker(slot){
  if(!selPkmnId){toast('Pick a Pokémon first','warn');return}
  _mpSlot=slot;_mpSearch='';_mpType='all';_mpGlossOpen=false;
  _mpLearnset=learnsetCache[selPkmnId]||[];

  // Desktop: persistent 4-tab Finder-window pane
  if(window.innerWidth>=1024){
    var p=allPkmn.find(function(x){return x.id===selPkmnId});
    var pname=p?displayName(p):'';
    var slotTabs=[1,2,3,4].map(function(n){
      var el=document.getElementById('edM'+n);var filled=el&&el.value;
      return '<button class="ed-dp-slot-tab'+(n===slot?' active':'')+'" onclick="switchPickerSlot('+n+')">'+
        '<span class="ed-dp-slot-n">Move '+n+'</span>'+
        '<span class="ed-dp-slot-lbl">'+(filled?el.value:'Pick a move')+'</span>'+
      '</button>';
    }).join('');
    var deskHtml=
      '<div class="ed-dp-slot-tabs" id="mpDeskTabs">'+slotTabs+'</div>'+
      '<div style="margin-bottom:.6rem"><input id="mpSearch" type="text" placeholder="Search moves…" value="" oninput="setMovePickerSearch(this.value)" autocomplete="off" style="width:100%;padding:.52rem .9rem;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-size:.85rem"></div>'+
      '<div class="ed-dp-type-wrap" id="mpTypes"></div>'+
      '<div id="mpList" class="ed-dp-move-list"></div>';
    if(_edDeskPicker(deskHtml,'Pick Moves — '+pname)){
      var types=mpLegalTypes();
      var tw=document.getElementById('mpTypes');
      if(tw)tw.innerHTML='<button class="mp-tp all on" onclick="setMovePickerType(\'all\')">ALL</button>'+
        types.map(function(t){return '<button class="mp-tp t-'+t+'" onclick="setMovePickerType(\''+t+'\')">'+t.toUpperCase()+'</button>'}).join('');
      renderMovePickerBody();
      if(!learnsetCache[selPkmnId]){_mpLearnset=await loadLearnset(selPkmnId);renderMovePickerBody();}
      return;
    }
  }

  // Mobile: existing bottom-sheet overlay
  renderMovePickerShell();
  renderMovePickerBody();
  document.getElementById('movePickerOv').classList.add('open');
  if(!learnsetCache[selPkmnId]){
    _mpLearnset=await loadLearnset(selPkmnId);
    renderMovePickerShell();
    renderMovePickerBody();
  }
}
function closeMovePicker(){
  _edDeskClose(); // desktop: return to form (no-op on mobile)
  document.getElementById('movePickerOv').classList.remove('open'); // mobile
}

// Search / filter handlers — body-only re-render so search input keeps focus.
function setMovePickerSearch(v){_mpSearch=(v||'').toLowerCase();renderMovePickerBody()}
function setMovePickerType(t){_mpType=t||'all';updateMovePickerTypePills();renderMovePickerBody()}
function toggleMoveGloss(){_mpGlossOpen=!_mpGlossOpen;var p=document.getElementById('mpGloss');var b=document.getElementById('mpGlossBtn');if(p)p.classList.toggle('open',_mpGlossOpen);if(b)b.classList.toggle('open',_mpGlossOpen)}

// Drop E QoL: Tap a slot chip at the top of the picker to switch slots without
// closing. Re-renders shell + body since the slot badge, used-dimming, current
// highlight, footer count, and warning banner all depend on _mpSlot. Search
// value is preserved via state (_mpSearch is already written on every keystroke).
function switchPickerSlot(n){
  if(!n||n===_mpSlot)return;
  _mpSlot=n;
  // Desktop: update tabs + crossfade move list (no re-animation)
  var deskTabs=document.getElementById('mpDeskTabs');
  if(deskTabs){
    deskTabs.querySelectorAll('.ed-dp-slot-tab').forEach(function(btn,i){
      var s=i+1;var el=document.getElementById('edM'+s);var filled=el&&el.value;
      btn.classList.toggle('active',s===n);
      var lbl=btn.querySelector('.ed-dp-slot-lbl');
      if(lbl)lbl.textContent=filled?el.value:'Pick a move';
    });
    var list=document.getElementById('mpList');
    if(list){
      list.style.opacity='0';
      setTimeout(function(){renderMovePickerBody();list.style.opacity='1';},150);
    }
    return;
  }
  // Mobile: existing full shell re-render
  renderMovePickerShell();
  renderMovePickerBody();
}

// Names currently sitting in the OTHER slots — used to dim already-picked rows.
function mpUsedMoves(){
  var out={};
  for(var i=1;i<=4;i++){
    if(i===_mpSlot)continue;
    var el=document.getElementById('edM'+i);
    if(el&&el.value)out[el.value]=i;
  }
  return out;
}

// Legal types present in THIS species' learnset — used to build pills.
function mpLegalTypes(){
  var s={},o=[];
  _mpLearnset.forEach(function(m){if(!s[m.type]){s[m.type]=1;o.push(m.type)}});
  return o.sort();
}

// Stable shell: header (back · title · slot badge · glossary button),
// sticky species context chip, search input, legal-types-only pills.
// Writes the <input> once so focus survives filter re-renders.
function renderMovePickerShell(){
  var p=allPkmn.find(function(x){return x.id===selPkmnId});
  var pname=p?displayName(p):'';
  var types=mpLegalTypes();
  var typeBtns='<button class="mp-tp all'+(_mpType==='all'?' on':'')+'" data-t="all" onclick="setMovePickerType(\'all\')">ALL</button>'+
    types.map(function(t){return '<button class="mp-tp t-'+t+(_mpType===t?' on':'')+'" data-t="'+t+'" onclick="setMovePickerType(\''+t+'\')">'+t.toUpperCase()+'</button>'}).join('');
  // Species context chip (matches proof)
  var t1=p&&p.type_1?p.type_1:null,t2=p&&p.type_2?p.type_2:null;
  var t1Col=t1&&TC[t1]?TC[t1]:null,t2Col=t2&&TC[t2]?TC[t2]:null;
  var ctxBg=t1Col?('linear-gradient(135deg,'+t1Col.m+'26,'+(t2Col?t2Col.m:t1Col.d)+'20)'):'rgba(255,255,255,.04)';
  var slots=[1,2,3,4].map(function(n){
    var el=document.getElementById('edM'+n);
    var filled=el&&el.value;
    var cls='mp-ctx-slot'+(n===_mpSlot?' current':(filled?' filled':''));
    var titleText='Slot '+n+(filled?': '+(el.value.replace(/"/g,'&quot;')):'')+(n===_mpSlot?' (editing)':' — tap to switch');
    return '<button type="button" class="'+cls+'" title="'+titleText+'" onclick="switchPickerSlot('+n+')">'+n+'</button>';
  }).join('');
  var ctx='<div class="mp-ctx" style="background:'+ctxBg+'">'+
    (p&&p.image_url?'<img src="'+p.image_url+'" alt="" onerror="this.style.opacity=\'0.2\'">':'<div class="mp-ctx-sprite"></div>')+
    '<div class="mp-ctx-info">'+
      '<div class="mp-ctx-name">'+pname+'</div>'+
      '<div class="mp-ctx-types">'+
        (t1?'<span class="tt t-'+t1+'">'+t1.toUpperCase()+'</span>':'')+
        (t2?'<span class="tt t-'+t2+'">'+t2.toUpperCase()+'</span>':'')+
      '</div>'+
    '</div>'+
    '<div class="mp-ctx-slots">'+slots+'</div>'+
  '</div>';
  // Glossary content (hidden by default; toggled open via mpGloss button)
  var gloss='<div class="gloss-inner">'+
    '<div class="gloss-title"><i class="ph-fill ph-info"></i> Move key</div>'+
    '<div class="gloss-grid">'+
      '<div class="gloss-item"><div class="k"><span class="swatch" style="background:#fb923c"></span>Power</div><div class="v">Base damage before modifiers. Higher = stronger hit.</div></div>'+
      '<div class="gloss-item"><div class="k"><span class="swatch" style="background:#a78bfa"></span>Accuracy</div><div class="v">% chance the move hits. — means always hits.</div></div>'+
      '<div class="gloss-item"><div class="k"><span class="swatch" style="background:#7dd3fc"></span>PP</div><div class="v">Uses per battle. Runs out, then Struggle.</div></div>'+
      '<div class="gloss-item"><div class="k"><span class="mp-cat Physical" style="width:12px;height:12px;font-size:7px">P</span>Physical</div><div class="v">Uses the user\'s Attack stat.</div></div>'+
      '<div class="gloss-item"><div class="k"><span class="mp-cat Special" style="width:12px;height:12px;font-size:7px">S</span>Special</div><div class="v">Uses the user\'s Sp. Atk stat.</div></div>'+
      '<div class="gloss-item"><div class="k"><span class="mp-cat Status" style="width:12px;height:12px;font-size:7px">St</span>Status</div><div class="v">No damage. Buffs, debuffs, or field effects.</div></div>'+
      '<div class="gloss-item" style="grid-column:1 / -1;margin-top:3px"><div class="k"><span class="swatch" style="background:linear-gradient(90deg,#fbbf24,rgba(251,191,36,.2))"></span>STAB (highlighted row)</div><div class="v">Same Type Attack Bonus. Moves matching the Pokémon\'s type deal 1.5× damage.</div></div>'+
    '</div>'+
  '</div>';
  // Count used + total
  var usedCount=(document.getElementById('edM1')&&document.getElementById('edM1').value?1:0)+
    (document.getElementById('edM2')&&document.getElementById('edM2').value?1:0)+
    (document.getElementById('edM3')&&document.getElementById('edM3').value?1:0)+
    (document.getElementById('edM4')&&document.getElementById('edM4').value?1:0);
  var vpTotal=usedCount*250;
  var html='<div class="mp-sheet">'+
    '<div class="mp-head">'+
      '<div class="mp-top">'+
        '<button class="mp-back" onclick="closeMovePicker()" aria-label="Close"><i class="ph-bold ph-caret-left"></i></button>'+
        '<div class="mp-title">'+
          '<div class="mp-title-main">Pick a Move <button class="mp-gloss-btn'+(_mpGlossOpen?' open':'')+'" id="mpGlossBtn" onclick="toggleMoveGloss()">?</button></div>'+
          '<div class="mp-title-sub">'+_mpLearnset.length+' available'+(pname?' for '+pname:'')+'</div>'+
        '</div>'+
        '<span class="mp-slot-badge">Slot '+_mpSlot+'</span>'+
      '</div>'+
      '<div class="mp-search"><i class="ph-bold ph-magnifying-glass"></i><input id="mpSearch" placeholder="Search moves..." value="'+_mpSearch.replace(/"/g,'&quot;')+'" oninput="setMovePickerSearch(this.value)" autocomplete="off"></div>'+
      '<div class="mp-types" id="mpTypes">'+typeBtns+'</div>'+
    '</div>'+
    '<div class="mp-gloss-panel'+(_mpGlossOpen?' open':'')+'" id="mpGloss">'+gloss+'</div>'+
    ctx+
    '<div class="mp-list" id="mpList"></div>'+
    '<div class="mp-foot">'+
      '<div class="mp-foot-left"><b>'+usedCount+' / 4</b> moves selected<br><span>Tap a move to fill Slot '+_mpSlot+'</span></div>'+
      '<div class="mp-foot-vp"><i class="ph-fill ph-coin-vertical"></i>'+vpTotal.toLocaleString()+' VP</div>'+
    '</div>'+
  '</div>';
  document.getElementById('movePickerOv').innerHTML=html;
}

// Type-pill active class refresh (body-level) — no full shell re-render.
function updateMovePickerTypePills(){
  var wrap=document.getElementById('mpTypes');if(!wrap)return;
  wrap.querySelectorAll('.mp-tp').forEach(function(btn){btn.classList.toggle('on',btn.dataset.t===_mpType)});
}

// Helpers to format a meta line like "100 · 100% · 16pp", colour-coded.
function mpFmtMeta(m){
  var parts=[];
  parts.push(m.power>0?'<span class="pwr">'+m.power+'</span>':'<span class="none">—</span>');
  parts.push('<span class="dot">·</span>');
  parts.push(m.accuracy?'<span class="acc">'+m.accuracy+'%</span>':'<span class="none">—</span>');
  parts.push('<span class="dot">·</span>');
  parts.push('<span class="pp">'+m.pp+'pp</span>');
  return parts.join(' ');
}

// Body re-render: filters + row build. Called on every search/filter keystroke.
function renderMovePickerBody(){
  var list=document.getElementById('mpList');if(!list)return;
  var used=mpUsedMoves();
  var p=allPkmn.find(function(x){return x.id===selPkmnId});
  var stabTypes={};
  if(p){if(p.type_1)stabTypes[p.type_1]=1;if(p.type_2)stabTypes[p.type_2]=1}
  var currentName=(document.getElementById('edM'+_mpSlot)||{}).value||'';
  var filtered=_mpLearnset.filter(function(m){
    if(_mpSearch&&m.name.toLowerCase().indexOf(_mpSearch)===-1)return false;
    if(_mpType!=='all'&&m.type!==_mpType)return false;
    return true;
  });
  if(!_mpLearnset.length){list.innerHTML='<div class="mp-empty">Loading legal moves…</div>';return}
  // Drop E: If the current slot holds a move that isn't in this species' legal pool,
  // show a warning banner so the user knows why they can't see it in the list.
  var warnBanner='';
  if(currentName){
    var inLearnset=false;
    for(var i=0;i<_mpLearnset.length;i++){if(_mpLearnset[i].name===currentName){inLearnset=true;break}}
    if(!inLearnset){
      var pp=allPkmn.find(function(x){return x.id===selPkmnId});
      var pname=pp?displayName(pp):'this Pokémon';
      var reason=allMoveIndex[currentName]?('isn\'t legal for '+pname):'isn\'t a known Champions move';
      warnBanner='<div class="mp-warn-banner">'+
        '<i class="ph-fill ph-warning"></i>'+
        '<div><b>Current pick &ldquo;'+currentName+'&rdquo; '+reason+'.</b><br>Pick a replacement below.</div>'+
      '</div>';
    }
  }
  if(!filtered.length){list.innerHTML=warnBanner+'<div class="mp-empty">No moves match</div>';return}
  var html=warnBanner+filtered.map(function(m){
    var stab=!!stabTypes[m.type];
    var inOther=used[m.name];
    var isCurrent=m.name===currentName;
    var cls='mp-row'+(stab?' stab':'')+(inOther?' used':'')+(isCurrent?' current':'');
    var rightSide=inOther
      ?'<span class="mp-used-badge">IN SLOT '+inOther+'</span>'
      :'<div class="mp-meta">'+mpFmtMeta(m)+'</div>';
    var onclick=inOther?'':' onclick="pickMove(\''+m.name.replace(/'/g,"\\'")+'\')"';
    return '<div class="'+cls+'"'+onclick+'>'+
      '<div class="mp-top-line">'+
        '<span class="mp-type-pill t-'+m.type+'">'+m.type.toUpperCase()+'</span>'+
        '<span class="mp-cat '+m.category+'" title="'+m.category+'">'+mpCatAbbr(m.category)+'</span>'+
        '<span class="mp-name">'+m.name+'</span>'+
        rightSide+
      '</div>'+
      '<div class="mp-desc">'+(m.short||'')+'</div>'+
    '</div>';
  }).join('');
  list.innerHTML=html;
}

// Write choice back to hidden input, refresh ALL 4 slot buttons so the shared
// font size re-balances across the row, then close. Also writes the legality
// state class in case the user replaced an illegal move.
function pickMove(name){
  var id='edM'+_mpSlot;
  var hidden=document.getElementById(id);
  if(hidden)hidden.value=name;
  msRefreshSlots();
  closeMovePicker();
}

// Backdrop click dismisses the move picker.
document.addEventListener('click',function(e){
  var ov=document.getElementById('movePickerOv');
  if(ov&&e.target===ov)closeMovePicker();
});

// ═══════════════════════════════════════
// ARCHETYPE PICKER
// Bottom-sheet picker for build archetype.
// 22 predefined roles + custom text entry at the bottom.
// ═══════════════════════════════════════

var _archPkCatIcons={Offense:'ph-sword',Setup:'ph-trend-up',Defense:'ph-shield',Support:'ph-gear',VGC:'ph-trophy'};
var _archPkCatOrder=['Offense','Setup','Defense','Support','VGC'];

function openArchPicker(){
  // Desktop: render as third panel
  var archContent='<div class="arch-pk-list" id="archPkList">'+_archPickerRows()+'</div>'+
    '<div class="arch-pk-custom">'+
      '<div class="arch-pk-custom-label"><i class="ph-bold ph-pencil"></i> Custom</div>'+
      '<div class="arch-pk-custom-row">'+
        '<input class="arch-pk-custom-input" id="archCustomIn" type="text" placeholder="Type a custom archetype…" maxlength="40" value="'+(edSelArch&&!BLD_ARCHETYPES.find(function(a){return a.name===edSelArch;})?edSelArch:'')+'" autocomplete="off">'+
        '<button class="arch-pk-custom-btn" onclick="_archPickCustom()" type="button">Use</button>'+
      '</div>'+
    '</div>';
  if(_edDeskPicker(archContent,'Archetype')){
    setTimeout(function(){
      var inp=document.getElementById('archCustomIn');
      if(inp)inp.onkeydown=function(e){if(e.key==='Enter')_archPickCustom();};
    },0);
    return;
  }
  // Mobile: bottom-sheet overlay
  var ov=document.getElementById('archPickerOv');
  if(!ov){
    ov=document.createElement('div');ov.id='archPickerOv';
    ov.style.cssText='position:fixed;inset:0;z-index:1800;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);';
    document.body.appendChild(ov);
  }
  ov.innerHTML='<div class="arch-pk-sheet">'+
    '<div class="arch-pk-handle"></div>'+
    '<div class="arch-pk-head">'+
      '<div class="arch-pk-title">Archetype</div>'+
      '<button class="arch-pk-close" onclick="closeArchPicker()" type="button">✕</button>'+
    '</div>'+
    '<div class="arch-pk-list" id="archPkList">'+_archPickerRows()+'</div>'+
    '<div class="arch-pk-custom">'+
      '<div class="arch-pk-custom-label"><i class="ph-bold ph-pencil"></i> Custom</div>'+
      '<div class="arch-pk-custom-row">'+
        '<input class="arch-pk-custom-input" id="archCustomIn" type="text" placeholder="Type a custom archetype…" maxlength="40" value="'+(edSelArch&&!BLD_ARCHETYPES.find(function(a){return a.name===edSelArch;})?edSelArch:'')+'" autocomplete="off">'+
        '<button class="arch-pk-custom-btn" onclick="_archPickCustom()" type="button">Use</button>'+
      '</div>'+
    '</div>'+
  '</div>';
  ov.style.display='flex';
  ov.onclick=function(e){if(e.target===ov)closeArchPicker();};
  // Submit custom on Enter
  setTimeout(function(){
    var inp=document.getElementById('archCustomIn');
    if(inp)inp.onkeydown=function(e){if(e.key==='Enter')_archPickCustom();};
  },0);
}

function _archPickerRows(){
  var list=typeof BLD_ARCHETYPES!=='undefined'?BLD_ARCHETYPES:[];
  var cats={};
  list.forEach(function(a){if(!cats[a.cat])cats[a.cat]=[];cats[a.cat].push(a);});
  var curPreset=edSelArch&&list.find(function(a){return a.name===edSelArch;});
  var html='<div class="arch-pk-none'+(edSelArch===''?' sel':'')+'" onclick="pickArch(\'\')">'+
    '<span>— None —</span>'+
    (edSelArch===''?'<i class="ph-bold ph-check" style="color:var(--red)"></i>':'')+
  '</div>';
  _archPkCatOrder.forEach(function(cat){
    if(!cats[cat])return;
    html+='<div class="arch-pk-cat"><i class="ph-bold '+_archPkCatIcons[cat]+'"></i>'+cat+'</div>';
    cats[cat].forEach(function(a){
      var sel=edSelArch===a.name;
      html+='<div class="arch-pk-row'+(sel?' sel':'')+'" style="--ac:'+a.color+'" onclick="pickArch(\''+a.name.replace(/'/g,"\\'")+'\')">'+
        '<div class="arch-pk-icon"><i class="ph-bold '+a.icon+'"></i></div>'+
        '<div class="arch-pk-info">'+
          '<div class="arch-pk-name">'+a.name+'</div>'+
          '<div class="arch-pk-desc">'+a.desc+'</div>'+
        '</div>'+
        (sel?'<i class="ph-bold ph-check arch-pk-check"></i>':'')+
      '</div>';
    });
  });
  return html;
}

function _archPickCustom(){
  var inp=document.getElementById('archCustomIn');
  var val=inp?inp.value.trim():'';
  if(!val)return;
  pickArch(val);
}

function pickArch(name){
  selBldArch(name);
  _edDeskClose(); // desktop: close third panel
  closeArchPicker(); // mobile: close overlay
}

function closeArchPicker(){
  var ov=document.getElementById('archPickerOv');
  if(ov){ov.style.display='none';ov.innerHTML='';}
}
