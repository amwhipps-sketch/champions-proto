// #SECTION: TEAMS
// ═══════════════════════════════════════
// TEAMS
// Team list, detail, editor, roster selection,
// save/update/delete, and team composition logic.
// ═══════════════════════════════════════

var teamView='list',editTeamId=null,detailTeamId=null,selBuildIds=[],teamRosterSize=6;
// Mobile-first team view state
var tdView='bars'; // Bars or Hex view for team member stats
var tdCollapsed={}; // {buildId: true} means collapsed — persists across re-renders
var tmCoverageOpen=false; // Editor-only collapsible coverage summary state
var tdCoverageOpen=false; // Detail-only collapsible coverage summary state

// ── Team Identity ─────────────────────────────────────────
var TM_ICONS=['🔥','⚡','💧','🌿','❄️','🌑','🌟','🛡️','⚔️','🎯','💎','🐉'];
var TM_THEMES=['Crimson','Ocean','Storm','Forest','Gold','Shadow','Frost','Ember'];
var TM_THEME_COLORS={Crimson:'#ef4444',Ocean:'#3b82f6',Storm:'#8b5cf6',Forest:'#22c55e',Gold:'#f59e0b',Shadow:'#64748b',Frost:'#06b6d4',Ember:'#f97316'};
var TM_ARCHETYPES=['Hyper Offense','Balance','Stall','Weather','Trick Room','VoltTurn','Sand','Rain','Sun','Speed Control'];
var tmSelIcon='',tmSelTheme='',tmSelArch='';

function selTI(field,val){
  if(field==='icon'){tmSelIcon=tmSelIcon===val?'':val;}
  else if(field==='theme'){tmSelTheme=tmSelTheme===val?'':val;}
  else if(field==='arch'){tmSelArch=tmSelArch===val?'':val;}
  var pickerId={icon:'tiIconPicker',theme:'tiThemePicker',arch:'tiArchPicker'}[field];
  var el=document.getElementById(pickerId);if(!el)return;
  el.innerHTML=_tiChips(field);
}
function _tiChips(field){
  if(field==='icon')return TM_ICONS.map(function(v){return'<button class="ti-chip ti-icon-chip'+(v===tmSelIcon?' active':'')+'" onclick="selTI(\'icon\',\''+v+'\')" type="button">'+v+'</button>';}).join('');
  if(field==='theme')return TM_THEMES.map(function(v){var col=TM_THEME_COLORS[v]||'#888';return'<button class="ti-chip ti-theme-chip'+(v===tmSelTheme?' active':'')+'" onclick="selTI(\'theme\',\''+v+'\')" type="button" style="--tc:'+col+'">'+v+'</button>';}).join('');
  return TM_ARCHETYPES.map(function(v){return'<button class="ti-chip ti-arch-chip'+(v===tmSelArch?' active':'')+'" onclick="selTI(\'arch\',\''+v+'\')" type="button">'+v+'</button>';}).join('');
}
function tmIdentityHtml(){
  return '<div class="card ti-card">'+
    '<div class="ed-label" style="margin-top:0">✨ Team Identity <span class="ti-optional">optional</span></div>'+
    '<div class="ti-section"><div class="ti-section-label">Icon</div><div class="ti-picker" id="tiIconPicker">'+_tiChips('icon')+'</div></div>'+
    '<div class="ti-section"><div class="ti-section-label">Theme</div><div class="ti-picker" id="tiThemePicker">'+_tiChips('theme')+'</div></div>'+
    '<div class="ti-section ti-section-last"><div class="ti-section-label">Archetype</div><div class="ti-picker" id="tiArchPicker">'+_tiChips('arch')+'</div></div>'+
  '</div>';
}

function toggleTeamEditorCoverage(){tmCoverageOpen=!tmCoverageOpen;renderTeams()}

function teamEditorCoverageHtml(){
  var members=[];
  selBuildIds.forEach(function(bid){
    var b=allBuilds.find(function(x){return x.id===bid});
    if(!b)return;
    members.push({type_1:b.type_1,type_2:b.type_2});
  });
  var filled=members.length;
  var label=filled?filled+' / '+teamRosterSize+' slots analysed':'Add Pokémon to analyse coverage';
  return '<div class="card tm-coverage-card">'+
    '<div class="tm-coverage-head" onclick="toggleTeamEditorCoverage()" role="button" tabindex="0" aria-expanded="'+(tmCoverageOpen?'true':'false')+'" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();toggleTeamEditorCoverage()}">'+
      '<div class="tm-coverage-title">'+
        '<span class="tm-coverage-icon">🎯</span>'+
        '<div><div class="tm-coverage-name">Team Coverage</div><div class="tm-coverage-sub">'+label+'</div></div>'+
      '</div>'+
      '<span class="tm-coverage-chev '+(tmCoverageOpen?'open':'')+'">▸</span>'+
    '</div>'+
    '<div class="tm-coverage-body" style="'+(tmCoverageOpen?'':'display:none')+'">'+teamCoverageHtml(members)+'</div>'+
  '</div>';
}

function toggleTeamDetailCoverage(){tdCoverageOpen=!tdCoverageOpen;renderTeams()}

function teamDetailCoverageHtml(members){
  var filled=(members||[]).length;
  var label=filled?filled+' members analysed':'Add Pokémon to analyse coverage';
  return '<div class="card tm-coverage-card">'+
    '<div class="tm-coverage-head" onclick="toggleTeamDetailCoverage()" role="button" tabindex="0" aria-expanded="'+(tdCoverageOpen?'true':'false')+'" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();toggleTeamDetailCoverage()}">'+
      '<div class="tm-coverage-title">'+
        '<span class="tm-coverage-icon">🎯</span>'+
        '<div><div class="tm-coverage-name">Type Coverage</div><div class="tm-coverage-sub">'+label+'</div></div>'+
      '</div>'+
      '<span class="tm-coverage-chev '+(tdCoverageOpen?'open':'')+'">▸</span>'+
    '</div>'+
    '<div class="tm-coverage-body" style="'+(tdCoverageOpen?'':'display:none')+'">'+teamCoverageHtml(members||[])+'</div>'+
  '</div>';
}

function showTeamList(){teamView='list';renderTeams()}
function showTeamBack(){
  if(typeof appNavContext!=='undefined'&&appNavContext.teamSource==='home'){
    appNavContext.teamSource='list';if(typeof dashNav==='function')dashNav('dash');return;
  }
  if(typeof appNavContext!=='undefined'&&appNavContext.teamSource==='profile'){
    appNavContext.teamSource='list';if(typeof dashNav==='function')dashNav('profile');return;
  }
  showTeamList();
}
function showTeamDetail(id,source){
  if(typeof appNavContext!=='undefined')appNavContext.teamSource=source||'list';
  detailTeamId=id;
  teamView='detail';
  tdCoverageOpen=false;

  var t=allTeams.find(function(x){return x.id===id});
  if(t&&t.members){
    t.members.forEach(function(m){
      var key=m.build_id||m.id;
      if(key)tdCollapsed[key]=true;
    });
  }

  renderTeams();
}
function showTeamEditor(id){
  editTeamId=id||null;teamView='editor';
  if(id){
    var t=allTeams.find(function(x){return x.id===id});
    if(t&&t.members)selBuildIds=t.members.map(function(m){return m.build_id});
    else selBuildIds=[];
    teamRosterSize=Math.max(selBuildIds.length,Math.min(6,Number(t&&t.roster_size)||6));
    tmSelIcon=t&&t.team_icon||'';
    tmSelTheme=t&&t.team_theme||'';
    tmSelArch=t&&t.team_archetype||'';
  }else{
    selBuildIds=[];
    teamRosterSize=6;
    tmSelIcon='';tmSelTheme='';tmSelArch='';
  }
  renderTeams()
}

async function loadTeamRoster(){
  if(!tk)return;
  // Pull the base teams plus their flattened roster rows, then stitch members onto each team client-side.
  try{var teams=await q('teams',{order:'created_at.desc'},true);var roster=[];try{roster=await q('team_roster',{order:'team_id.asc,slot_position.asc'},true)}catch(e){}allTeams=teams.map(function(t){t.members=(roster||[]).filter(function(r){return r.team_id===t.id});return t});document.getElementById('nc2').textContent=allTeams.length}catch(e){}
}

// ═══════════════════════════════════════
// TEAM SHARE TOGGLE (Drop F.2)
// Team editor share card + team detail pill.
// Customise panel has one toggle: show_type_coverage (default OFF).
// ═══════════════════════════════════════

function tmShareUrl(code){
  if(!code)return '';
  var base=location.origin+location.pathname.replace(/\/index\.html$/,'/');
  if(!base.endsWith('/'))base+='/';
  return base+'#/t/'+code;
}

function tmGetShareFields(t){
  var raw=t&&t.share_fields;
  var f={type_coverage:false};
  if(raw&&typeof raw==='object'){
    if(raw.type_coverage===true)f.type_coverage=true;
  }
  return f;
}

function tmShareSummaryText(fields){
  return fields.type_coverage?'Coverage shown':'Coverage hidden';
}

function tmShareHintText(fields){
  var handle=userProfile&&userProfile.username?userProfile.username:'username';
  var base='Visible: team name, format, 6-slot roster, <strong>@'+handle.replace(/</g,'&lt;')+'</strong> byline.';
  if(fields.type_coverage)base+=' Type coverage shown.';
  else base+=' Coverage hidden.';
  base+=' Notes stay private.';
  return base;
}

// Render the Share card HTML inside the team editor. Returns '' when not
// editing an existing team.
function tmShareSectionHtml(){
  if(!editTeamId)return '';
  var t=allTeams.find(function(x){return x.id===editTeamId});if(!t)return '';
  var isOn=!!t.is_public;
  var code=t.share_code||'';
  var url=code?tmShareUrl(code):'';
  var fields=tmGetShareFields(t);
  var summaryText=tmShareSummaryText(fields);
  var hintText=tmShareHintText(fields);

  function checkRow(field,label,sub){
    var on=!!fields[field];
    return (
      '<div class="ed-check-row '+(on?'on':'off')+'" data-field="'+field+'" onclick="tmToggleShareField(\''+field+'\')" tabindex="0" role="checkbox" aria-checked="'+(on?'true':'false')+'" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();tmToggleShareField(\''+field+'\')}">'+
        '<div class="ed-check">'+(on?'<i class="ph-bold ph-check"></i>':'')+'</div>'+
        '<div>'+
          '<div class="ed-check-label">'+label+'</div>'+
          '<div class="ed-check-sub">'+sub+'</div>'+
        '</div>'+
      '</div>'
    );
  }

  return (
    '<div class="card ed-share-card'+(isOn?' active':'')+'" id="tmShareCard">'+
      '<div class="ed-share-head">'+
        '<div class="ed-share-title">'+
          '<i class="ph-bold ph-share-network"></i>'+
          '<div>'+
            '<h3>Share publicly</h3>'+
            '<span class="label-sub">Anyone with the link can view</span>'+
          '</div>'+
        '</div>'+
        '<div class="ed-share-toggle'+(isOn?' on':'')+'" id="tmShareToggle" role="switch" aria-checked="'+(isOn?'true':'false')+'" tabindex="0" onclick="tmToggleShare()" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();tmToggleShare()}">'+
          '<div class="knob"></div>'+
        '</div>'+
      '</div>'+
      '<div class="ed-share-body" id="tmShareBody" style="'+(isOn?'':'display:none')+'">'+

        // Customise panel — just 1 toggle for teams
        '<div class="ed-customise" id="tmCustomise">'+
          '<div class="ed-customise-summary" onclick="tmToggleCustomiseExpand()">'+
            '<div class="left">'+
              '<i class="ph-bold ph-sliders-horizontal"></i>'+
              '<div>'+
                '<div class="title">Customise what\'s shared</div>'+
                '<div class="sub" id="tmCustomiseSummary">'+summaryText+'</div>'+
              '</div>'+
            '</div>'+
            '<span class="chev">▸</span>'+
          '</div>'+
          '<div class="ed-customise-body">'+
            '<div class="ed-customise-inner">'+
              checkRow('type_coverage','Type Coverage','Resists + weaknesses grid on public page')+
            '</div>'+
          '</div>'+
        '</div>'+

        '<div class="ed-share-url-row">'+
          '<div class="ed-share-url" id="tmShareUrlEl">'+(url?url.replace(/^https?:\/\//,''):'')+'</div>'+
          '<button type="button" class="ed-share-copy-btn" id="tmShareCopyBtn" onclick="tmCopyShareUrl()"><i class="ph-bold ph-copy"></i></button>'+
          '<button type="button" class="ed-share-share-btn" id="tmShareShareBtn" onclick="tmShareNow()"><i class="ph-bold ph-share-network"></i> Share</button>'+
        '</div>'+
        '<div class="ed-share-hint">'+
          '<i class="ph ph-info"></i>'+
          '<span id="tmShareHint">'+hintText+'</span>'+
        '</div>'+

      '</div>'+
    '</div>'
  );
}

function tmToggleCustomiseExpand(){
  var panel=document.getElementById('tmCustomise');if(!panel)return;
  panel.classList.toggle('open');
}

async function tmToggleShare(){
  if(!editTeamId){toast('Save the team first','err');return}
  var t=allTeams.find(function(x){return x.id===editTeamId});if(!t){toast('Team not found','err');return}
  var toggle=document.getElementById('tmShareToggle');
  if(!toggle||toggle.classList.contains('loading'))return;

  var wasOn=!!t.is_public;
  var turningOn=!wasOn;

  if(turningOn&&(!userProfile||!userProfile.username)){
    showUsernameModal(function(){tmToggleShare();});
    return;
  }
  toggle.classList.add('loading');
  try{
    var code=t.share_code;
    if(turningOn&&!code){
      code=await ensureShareCode('team',editTeamId);
      t.share_code=code;
    }
    await upd('teams',{'id':'eq.'+editTeamId},{is_public:turningOn},true);
    t.is_public=turningOn;

    var card=document.getElementById('tmShareCard');
    var body=document.getElementById('tmShareBody');
    var urlEl=document.getElementById('tmShareUrlEl');
    toggle.classList.toggle('on',turningOn);
    toggle.setAttribute('aria-checked',turningOn?'true':'false');
    if(card)card.classList.toggle('active',turningOn);
    if(body)body.style.display=turningOn?'':'none';
    if(urlEl&&code)urlEl.textContent=tmShareUrl(code).replace(/^https?:\/\//,'');

    toast(turningOn?'Team is now public ✨':'Team is now private');
  }catch(e){
    console.log('tmToggleShare failed:',e);
    toast(e.message||'Failed to update sharing','err');
  }finally{
    toggle.classList.remove('loading');
  }
}

async function tmToggleShareField(field){
  if(!editTeamId){toast('Save the team first','err');return}
  if(['type_coverage'].indexOf(field)===-1)return;
  var t=allTeams.find(function(x){return x.id===editTeamId});if(!t)return;
  var row=document.querySelector('.ed-check-row[data-field="'+field+'"]');
  if(!row||row.classList.contains('loading'))return;

  var current=tmGetShareFields(t);
  var newVal=!current[field];
  var updatedFields=Object.assign({},current,(function(){var o={};o[field]=newVal;return o})());
  // For teams: default state is {type_coverage:false}. Only store if non-default.
  var isDefault=!updatedFields.type_coverage;
  var payload=isDefault?null:updatedFields;

  row.classList.add('loading');
  try{
    await upd('teams',{'id':'eq.'+editTeamId},{share_fields:payload},true);
    t.share_fields=payload;

    row.classList.toggle('on',newVal);
    row.classList.toggle('off',!newVal);
    row.setAttribute('aria-checked',newVal?'true':'false');
    var checkIcon=row.querySelector('.ed-check');
    if(checkIcon)checkIcon.innerHTML=newVal?'<i class="ph-bold ph-check"></i>':'';

    var fields=tmGetShareFields(t);
    var summaryEl=document.getElementById('tmCustomiseSummary');
    if(summaryEl)summaryEl.textContent=tmShareSummaryText(fields);
    var hintEl=document.getElementById('tmShareHint');
    if(hintEl)hintEl.innerHTML=tmShareHintText(fields);

    var fieldLabel={type_coverage:'Type Coverage'}[field];
    toast((newVal?'Showing ':'Hiding ')+fieldLabel+' on public view');
  }catch(e){
    console.log('tmToggleShareField failed:',e);
    toast(e.message||'Failed to update','err');
  }finally{
    row.classList.remove('loading');
  }
}

async function tmCopyShareUrl(){
  if(!editTeamId)return;
  var t=allTeams.find(function(x){return x.id===editTeamId});if(!t||!t.share_code){toast('No share URL yet','err');return}
  var url=tmShareUrl(t.share_code);
  var btn=document.getElementById('tmShareCopyBtn');
  var ok=false;
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);ok=true;
    }else{
      var ta=document.createElement('textarea');ta.value=url;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.focus();ta.select();try{ok=document.execCommand('copy')}catch(_){ok=false}
      document.body.removeChild(ta);
    }
  }catch(_){ok=false}
  if(ok&&btn){
    var origHtml=btn.innerHTML;btn.classList.add('copied');btn.innerHTML='<i class="ph-bold ph-check"></i> Copied!';
    setTimeout(function(){btn.classList.remove('copied');btn.innerHTML=origHtml},1500);
    toast('Share link copied');
  }else{
    toast('Copy failed — select the URL manually','err');
  }
}

// ═══════════════════════════════════════
// TEAM DETAIL PUBLIC PILL (Drop F.2)
// ═══════════════════════════════════════

function tdPublicPillHtml(t){
  if(!t||!t.is_public||!t.share_code)return '';
  var url=tmShareUrl(t.share_code);
  var fields=tmGetShareFields(t);
  var summaryText=tmShareSummaryText(fields);
  return (
    '<div class="bd-pill-wrap">'+
      '<div class="bd-pill" id="tdPill" onclick="tdTogglePill()" tabindex="0" role="button" aria-expanded="false" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();tdTogglePill()}">'+
        '<i class="ph-bold ph-globe"></i>'+
        '<span>Public</span>'+
        '<span class="chev">▸</span>'+
      '</div>'+
      '<div class="bd-pill-panel" id="tdPillPanel">'+
        '<div class="bd-pill-panel-inner">'+
          '<div class="bd-pill-stats" id="tdPillSummary">'+summaryText+'</div>'+
          '<div class="bd-pill-url-row">'+
            '<div class="bd-pill-url">'+url.replace(/^https?:\/\//,'')+'</div>'+
            '<button type="button" class="bd-pill-btn" onclick="tdPillCopy()" aria-label="Copy link"><i class="ph-bold ph-copy"></i></button>'+
            '<button type="button" class="bd-pill-btn primary" onclick="tdPillShare()"><i class="ph-bold ph-share-network"></i> Share</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'
  );
}

function tdTogglePill(){
  var pill=document.getElementById('tdPill');if(!pill)return;
  var open=pill.classList.toggle('open');
  pill.setAttribute('aria-expanded',open?'true':'false');
}

async function tdPillCopy(){
  var t=allTeams.find(function(x){return x.id===detailTeamId});
  if(!t||!t.share_code){toast('No share URL','err');return}
  var url=tmShareUrl(t.share_code);
  if(typeof copyUrl==='function')return copyUrl(url);
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(_){toast('Copy failed','err')}
}

async function tdPillShare(){
  var t=allTeams.find(function(x){return x.id===detailTeamId});
  if(!t||!t.share_code){toast('No share URL','err');return}
  // Drop F.2.1: render image card + native share
  if(typeof shareImage==='function')return shareImage('team',t.id);
  // Fallback — URL-only
  var url=tmShareUrl(t.share_code);
  var title=t.name||'Champions Forge team';
  if(typeof shareOrCopy==='function')return shareOrCopy(url,title,'Check out my Champions Forge team!');
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(_){toast('Copy failed','err')}
}

// Team editor Share button — same handler as pill
async function tmShareNow(){
  if(!editTeamId){toast('Save the team first','err');return}
  var t=allTeams.find(function(x){return x.id===editTeamId});
  if(!t){toast('Team not found','err');return}
  if(!t.is_public||!t.share_code){toast('Make the team public first','err');return}
  if(typeof shareImage==='function')return shareImage('team',t.id);
  var url=tmShareUrl(t.share_code);
  if(typeof shareOrCopy==='function')return shareOrCopy(url,t.name||'Champions Forge team','Check out my team!');
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(_){toast('Copy failed','err')}
}

function renderTeams(){
  var c=document.getElementById('teamsView');
  if(!tk){c.innerHTML='<div class="pg-head"><div class="pg-title">🏆 Teams</div><div class="pg-sub">Sign in to manage teams</div></div><div class="empty"><div class="em">🔒</div>Sign in to see teams</div>';return}
  if(teamView==='editor'){renderTeamEditor(c);return}
  if(teamView==='detail'){renderTeamDetail(c);return}
  var hdr='<div class="pg-head vh-list-header"><div class="pg-top"><div><div class="pg-title">🏆 Teams</div><div class="pg-sub">Your competitive team compositions</div></div><div class="vh-actions"><button class="vh-btn vh-btn-md vh-btn-new" onclick="showTeamEditor()">+</button></div></div></div>';
  if(!allTeams.length){c.innerHTML=hdr+'<div class="empty"><div class="em">🏆</div>No teams yet</div>';return}
  c.innerHTML=hdr+'<div class="tml-stack">'+allTeams.map(function(t){
    var fc=t.format==='Singles'?'fmt-s':'fmt-d';
    var memCount=(t.members||[]).length;
    var rosterSize=Math.max(memCount,Math.min(6,Number(t.roster_size)||6));
    var visibleMembers=(t.members||[]).slice(0,rosterSize);
    var mems=visibleMembers.map(function(m){var mImg=m.is_shiny&&m.shiny_url?m.shiny_url:(m.image_url||'');return '<div class="tml-mem"><img class="tml-mem-img" src="'+mImg+'" onerror="this.style.opacity=\'0.2\'"><div class="tml-mem-name">'+(m.pokemon_name||'?')+'</div></div>'}).join('');
    for(var i=visibleMembers.length;i<rosterSize;i++){mems+='<div class="tml-mem"><div class="tml-mem-empty">+</div></div>'}
    var safeName=t.name.replace(/'/g,"\\'");
    var tmCol=t.team_theme?TM_THEME_COLORS[t.team_theme]||null:null;
    var tmCardStyle=tmCol?'border-left:3px solid '+tmCol+';--tm-col:'+tmCol+';':'';
    var tmIcon=t.team_icon?'<span class="tml-icon-badge">'+t.team_icon+'</span>':'';
    var tmArch=t.team_archetype?'<span class="tml-arch-pill">'+t.team_archetype+'</span>':'';
    return '<div class="tml-card" style="'+tmCardStyle+'" onclick="showTeamDetail(\''+t.id+'\')">'+
'<div class="tml-head">'+
  '<div class="tml-head-text">'+
    '<div class="tml-name">'+tmIcon+t.name+'</div>'+
    '<div class="tml-meta">'+
      '<span class="tml-fmt '+fc+'">'+(t.format||'?')+'</span>'+
      '<span class="tml-count">'+memCount+' / '+rosterSize+'</span>'+
      tmArch+
    '</div>'+
  '</div>'+
'<div class="vh-actions">'+
  '<button class="vh-btn vh-btn-md vh-btn-edit" onclick="event.stopPropagation();showTeamEditor(\''+t.id+'\')" aria-label="Edit team">✏️</button>'+
  '<div class="om-wrap">'+
    '<button class="vh-btn vh-btn-md vh-btn-more" onclick="event.stopPropagation();toggleTmlOm(\''+t.id+'\')" aria-label="More">⋮</button>'+
      '<div class="om-menu" id="tmlOm-'+t.id+'">'+
        '<button class="om-item" onclick="event.stopPropagation();closeAllTmlOms();showTeamDetail(\''+t.id+'\')"><span class="om-item-icon">📋</span>View detail</button>'+
        (t.is_public&&t.share_code?'<button class="om-item" onclick="event.stopPropagation();closeAllTmlOms();shareImage(\'team\',\''+t.id+'\')"><span class="om-item-icon">🔗</span>Share team</button>':'')+
        '<div class="om-sep"></div>'+
        '<button class="om-item destructive" onclick="event.stopPropagation();closeAllTmlOms();confirmDelTeam(\''+t.id+'\',\''+safeName+'\')"><span class="om-item-icon">🗑</span>Delete team</button>'+
      '</div>'+
    '</div>'+
  '</div>'+
'</div>'+
'<div class="tml-members">'+mems+'</div>'+
'</div>';
  }).join('')+'</div>';
}

function closeAllTmlOms(){document.querySelectorAll('[id^="tmlOm-"]').forEach(function(m){m.classList.remove('open')})}
function toggleTmlOm(id){var m=document.getElementById('tmlOm-'+id);if(!m)return;var wasOpen=m.classList.contains('open');closeAllTmlOms();if(!wasOpen)m.classList.add('open')}
document.addEventListener('click',function(e){if(!e.target.closest('.om-wrap')){closeAllTmlOms();closeAllBldOms()}});

// Team member stat helpers — reuse Drop 2/3 bsCalcStatFor / bsGetCalcStatsFor
function tdGetMemberStats(m,b){
  var poke=allPkmn.find(function(p){return(p.id===m.pokemon_id)||(p.name===m.pokemon_name&&p.dex_number===m.dex_number)});
  if(!poke)return null;
  var sp={hp:b.hp_sp||0,atk:b.atk_sp||0,def:b.def_sp||0,spa:b.spa_sp||0,spd:b.spd_sp||0,spe:b.spe_sp||0};
  var nature=b.increased_stat?{increased_stat:b.increased_stat,decreased_stat:b.decreased_stat}:null;
  return{poke:poke,stats:bsGetCalcStatsFor(poke,sp,nature),nature:nature};
}

function tdRenderBars(stats){
  return '<div class="td-bs-grid">'+stats.map(function(st){
    var pct=Math.min(st.calc/300*100,100);
    var natInd=st.natMod>1?' <span style="color:var(--green)">▲</span>':st.natMod<1?' <span style="color:var(--red)">▼</span>':'';
    var natCol=st.natMod>1?'var(--green)':st.natMod<1?'var(--red)':BSC[st.key];
    return '<div class="td-bs-row"><span class="td-bs-label">'+BSN[st.key]+'</span><div class="td-bs-track"><div class="td-bs-fill" style="width:'+pct+'%;background:'+BSC[st.key]+'"></div></div><span class="td-bs-val" style="color:'+natCol+'">'+st.calc+'</span><span class="td-bs-nat-ind">'+natInd+'</span></div>';
  }).join('')+'</div>';
}

function tdRenderHex(poke,stats){
  var typeCol=(TC[poke.type_1]||TC.Normal).m;
  var cx=160,cy=140,r=62,angles=[-90,-30,30,90,150,210],order=[0,1,2,5,4,3];
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
    var si=order[i],k=BSK[si],st=stats[si],pt=polar(angles[i],r+20);
    var anchor='middle';if(angles[i]===-30||angles[i]===30)anchor='start';if(angles[i]===150||angles[i]===210)anchor='end';
    var natInd=st.natMod>1?' ▲':st.natMod<1?' ▼':'';
    var natCol=st.natMod>1?'var(--green)':st.natMod<1?'var(--red)':BSC[k];
    var isTop=angles[i]===-90,isBot=angles[i]===90;
    if(isTop){labels+='<text x="'+pt.x+'" y="'+(pt.y-8)+'" text-anchor="middle" fill="'+BSC[k]+'" font-size="9" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text><text x="'+pt.x+'" y="'+(pt.y+5)+'" text-anchor="middle" fill="'+natCol+'" font-size="11" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">'+st.calc+natInd+'</text>'}
    else if(isBot){labels+='<text x="'+pt.x+'" y="'+(pt.y+4)+'" text-anchor="middle" fill="'+natCol+'" font-size="11" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">'+st.calc+natInd+'</text><text x="'+pt.x+'" y="'+(pt.y+15)+'" text-anchor="middle" fill="'+BSC[k]+'" font-size="9" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text>'}
    else{labels+='<text x="'+pt.x+'" y="'+(pt.y-3)+'" text-anchor="'+anchor+'" fill="'+BSC[k]+'" font-size="9" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">'+BSN[k]+'</text><text x="'+pt.x+'" y="'+(pt.y+9)+'" text-anchor="'+anchor+'" fill="'+natCol+'" font-size="11" font-weight="800" font-family="Plus Jakarta Sans,sans-serif" style="font-variant-numeric:tabular-nums">'+st.calc+natInd+'</text>'}
  }
  return '<div class="td-bs-hex-wrap"><svg class="td-bs-hex-svg" viewBox="0 0 320 280">'+
    '<polygon points="'+outerPts+'" fill="none" stroke="var(--border)" stroke-width="1.2"/>'+
    '<polygon points="'+g75+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".3"/>'+
    '<polygon points="'+g50+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".3"/>'+
    '<polygon points="'+g25+'" fill="none" stroke="var(--border)" stroke-width=".5" opacity=".3"/>'+
    spokes+
    '<polygon points="'+statPts.join(' ')+'" fill="'+typeCol+'25" stroke="'+typeCol+'" stroke-width="2" stroke-linejoin="round"/>'+
    labels+'</svg></div>';
}

// Render a single team member card (collapsible). editorMode adds Change/Remove actions.
function tdRenderMember(m,slot,editorMode){
  var b=allBuilds.find(function(x){return x.id===m.build_id})||m;
  var mImg=(b.is_shiny||m.is_shiny)&&(b.shiny_url||m.shiny_url)?(b.shiny_url||m.shiny_url):(b.image_url||m.image_url||'');
  var t1=(TC[m.type_1||b.type_1]||TC.Normal).m,t2=(m.type_2||b.type_2)?((TC[m.type_2||b.type_2]||TC.Normal).m):null;
  var headerGrad=t2?'linear-gradient(135deg,'+t1+'CC,'+t2+'CC)':'linear-gradient(135deg,'+t1+'BB,'+t1+'66)';
  var statData=tdGetMemberStats(m,b);
  var collapsedKey=m.build_id||m.id||('s'+slot);
  var collapsed=!!tdCollapsed[collapsedKey];
  var dName=displayName({name:m.pokemon_name||b.pokemon_name,form:m.form||b.form});
  var isMega=(m.form||b.form)==='Mega';

  // Compact stats for collapsed header (Atk / SpA / Spe / BST)
  var compactStats='';
  if(statData){
    var atk=statData.stats.find(function(s){return s.key==='atk'});
    var spa=statData.stats.find(function(s){return s.key==='spa'});
    var spe=statData.stats.find(function(s){return s.key==='spe'});
    var bst=statData.stats.reduce(function(s,st){return s+st.calc},0);
    compactStats='<span class="td-mem-compact-stats"><span style="color:'+BSC.atk+'">'+atk.calc+'</span><span style="color:'+BSC.spa+'">'+spa.calc+'</span><span style="color:'+BSC.spe+'">'+spe.calc+'</span><span style="color:rgba(255,255,255,.5)">·</span><span>BST '+bst+'</span></span>';
  }

  var natSl={hp:'HP',attack:'Atk',defense:'Def',sp_attack:'SpA',sp_defense:'SpD',speed:'Spe'};
  var natInfo=b.nature_name?'<span class="td-mem-nature-chip">'+b.nature_name+(b.increased_stat?' <span style="color:var(--green);font-size:.6rem">▲'+natSl[b.increased_stat]+'</span> <span style="color:var(--red);font-size:.6rem">▼'+natSl[b.decreased_stat]+'</span>':'')+'</span>':'';
  var bst=statData?statData.stats.reduce(function(s,st){return s+st.calc},0):0;
  var bstCls=bst>=1100?'bst-elite':bst>=950?'bst-high':bst>=800?'bst-mid':'bst-low';

  var moves=[b.move_1||m.move_1,b.move_2||m.move_2,b.move_3||m.move_3,b.move_4||m.move_4].filter(Boolean).map(function(mv){return '<div class="td-mem-move">'+mv+'</div>'}).join('');
  var tags='';
  if(b.item_name||m.item_name)tags+='<span class="btag btag-item">'+(b.item_name||m.item_name)+'</span>';
  if(b.ability)tags+='<span class="btag btag-abi">'+b.ability+'</span>';
  if(b.archetype||m.archetype)tags+='<span class="btag btag-arch">'+(b.archetype||m.archetype)+'</span>';

  var clickHandler=editorMode?'onclick="toggleTdMember(\''+collapsedKey+'\')"':'onclick="toggleTdMember(\''+collapsedKey+'\')"';

  return '<div class="td-member'+(collapsed?' collapsed':'')+'" data-key="'+collapsedKey+'">'+
    '<div class="td-mem-head" '+clickHandler+'><div style="position:absolute;inset:0;background:'+headerGrad+';opacity:.5;z-index:0"></div>'+
      '<div class="td-mem-slot">#'+slot+'</div>'+
      '<img class="td-mem-img" src="'+mImg+'" onerror="this.style.opacity=0.2">'+
      '<div class="td-mem-head-info">'+
        '<div class="td-mem-name"><span>'+(m.pokemon_name||b.pokemon_name||'?')+'</span>'+(isMega?megaBadge(18):'')+(b.is_shiny||m.is_shiny?' <span style="color:var(--purple);font-size:.7rem">✦</span>':'')+'</div>'+
        (b.build_name||m.build_name?'<div class="td-mem-sub" style="color:rgba(255,255,255,.8)">'+(b.build_name||m.build_name)+'</div>':'')+
        '<div class="td-mem-types"><span class="type-pill" style="background:'+t1+'">'+(m.type_1||b.type_1)+'</span>'+(t2?'<span class="type-pill" style="background:'+t2+'">'+(m.type_2||b.type_2)+'</span>':'')+'</div>'+
        compactStats+
      '</div>'+
      (editorMode?'<button class="td-quick-remove" onclick="event.stopPropagation();removeTeamMember(\''+(m.build_id||m.id)+'\')" aria-label="Remove '+(m.pokemon_name||b.pokemon_name||'Pokémon')+' from team">✕</button>':'')+
      '<div class="td-chevron">▾</div>'+
    '</div>'+
    '<div class="td-mem-body-wrap"><div class="td-mem-body">'+
      '<div class="td-mem-stats">'+
        natInfo+
        (statData?(tdView==='hex'?tdRenderHex(statData.poke,statData.stats):tdRenderBars(statData.stats)):'<div style="color:var(--muted);font-size:.78rem">Stats unavailable</div>')+
        (statData?'<div class="td-bs-total"><span class="td-bs-total-label">Lv50 Total</span><span class="td-bs-total-val '+bstCls+'">'+bst+'</span></div>':'')+
      '</div>'+
      (tags||moves?'<div class="td-mem-foot">'+(tags?'<div class="td-mem-tags">'+tags+'</div>':'')+(moves?'<div class="td-mem-moves">'+moves+'</div>':'')+'</div>':'')+
      (editorMode?'<div class="td-mem-editor-actions"><button onclick="event.stopPropagation();openTeamBuildPicker('+slot+')">🔄 Change Build</button><button class="td-remove" onclick="event.stopPropagation();removeTeamMember(\''+(m.build_id||m.id)+'\')">✕ Remove</button></div>':'<div style="padding:.5rem .85rem .85rem;border-top:1px solid var(--border)"><button class="btn btn-ghost" style="width:100%;min-height:40px;font-size:.78rem" onclick="event.stopPropagation();showBuildDetail(\''+(m.build_id||m.id)+'\',\'team\')">View build detail →</button></div>')+
    '</div></div>'+
  '</div>';
}

function toggleTdMember(key){
  var card=document.querySelector('.td-member[data-key="'+key+'"]');
  if(!card)return;
  var wasCollapsed=card.classList.toggle('collapsed');
  tdCollapsed[key]=wasCollapsed;
}
function setTdView(v){tdView=v;renderTeams()}
function expandAllTdMembers(){document.querySelectorAll('.td-member').forEach(function(c){c.classList.remove('collapsed');tdCollapsed[c.dataset.key]=false})}
function collapseAllTdMembers(){document.querySelectorAll('.td-member').forEach(function(c){c.classList.add('collapsed');tdCollapsed[c.dataset.key]=true})}
function setTeamRosterSize(v){
  var n=Math.max(1,Math.min(6,Number(v)||6));
  if(n<selBuildIds.length){
    selBuildIds=selBuildIds.slice(0,n);
  }
  teamRosterSize=n;
  renderTeams();
}
function scrollToPicker(){openTeamBuildPicker(Math.min(teamRosterSize,selBuildIds.length+1))}
function removeTeamMember(buildId){var i=selBuildIds.indexOf(buildId);if(i!==-1)selBuildIds.splice(i,1);renderTeams()}

function renderTeamEditor(c){
  var t=editTeamId?allTeams.find(function(x){return x.id===editTeamId}):null;
  // Snapshot live editor values before re-render so slot changes don't wipe unsaved text
  var _ne=document.getElementById('tmName'),_no2=document.getElementById('tmNotes'),_nf=document.getElementById('tmFmt');
  var liveName=_ne!==null?_ne.value:(t?t.name||'':'');
  var liveNotes=_no2!==null?_no2.value:(t?t.notes||'':'');
  var liveFmt=_nf!==null?_nf.value:(t?t.format||'Singles':'Singles');

  var hdr='<div class="pg-head"><div class="pg-top"><div><div class="pg-title" style="cursor:pointer" onclick="showTeamList()">← '+(t?'Edit Team':'New Team')+'</div><div class="pg-sub">Assemble your roster</div></div></div></div>';
  var fmtSelectedS=liveFmt==='Singles'?' selected':'';
  var fmtSelectedD=liveFmt==='Doubles'?' selected':'';
  var fmtCls=liveFmt==='Doubles'?'fmt-d':'fmt-s';
  teamRosterSize=Math.max(selBuildIds.length,Math.min(6,teamRosterSize||Number(t&&t.roster_size)||6));
  var fmtLabel=liveFmt||'Singles';

  // Team Info card
  var teamInfo='<div class="card">'+
    '<label class="ed-label" style="margin-top:0">Team Name</label>'+
    '<input class="ed-input" id="tmName" value="'+liveName.replace(/"/g,'&quot;')+'" placeholder="e.g. Storm Surge Protocol">'+
    '<label class="ed-label">Format</label>'+
    '<select class="ed-select" id="tmFmt"><option value="Singles"'+fmtSelectedS+'>Singles</option><option value="Doubles"'+fmtSelectedD+'>Doubles</option></select>'+
    '<label class="ed-label">Roster Size</label>'+
    '<select class="ed-select" id="tmRosterSize" onchange="setTeamRosterSize(this.value)">'+
      [1,2,3,4,5,6].map(function(n){return '<option value="'+n+'"'+(teamRosterSize===n?' selected':'')+'>'+n+' Pokémon</option>'}).join('')+
    '</select>'+
    '<div style="font-size:.68rem;color:var(--muted);margin-top:.35rem">Defaults to 6. Use 4 for compact doubles rosters or practice squads.</div>'+ 
    '<label class="ed-label">Notes</label>'+
    '<textarea class="ed-textarea" id="tmNotes" placeholder="Strategy, matchups, meta notes...">'+liveNotes+'</textarea>'+
  '</div>';

  // Build members in order of selBuildIds
  var memberCards='';
  selBuildIds.forEach(function(bid,idx){
    var b=allBuilds.find(function(x){return x.id===bid});
    if(!b)return;
    // Synthesize a team-roster-shaped object from the build
    var m={
      build_id:b.id,pokemon_id:b.pokemon_id,pokemon_name:b.pokemon_name,
      type_1:b.type_1,type_2:b.type_2,form:b.form,
      image_url:b.image_url,shiny_url:b.shiny_url,is_shiny:b.is_shiny,
      build_name:b.build_name,archetype:b.archetype,item_name:b.item_name
    };
    memberCards+=tdRenderMember(m,idx+1,true);
  });
  var emptySlots='';
  for(var i=selBuildIds.length;i<teamRosterSize;i++){
    emptySlots+='<div class="td-empty-slot" onclick="openTeamBuildPicker('+(i+1)+')">+ Add Pokémon to Slot '+(i+1)+'</div>';
  }

  var viewToggle='<div style="display:flex;gap:.5rem;align-items:center">'+
    '<div class="td-view-toggle" style="flex:1"><button class="td-view-btn'+(tdView==='bars'?' active':'')+'" data-view="bars" onclick="setTdView(\'bars\')">📊 Bars</button><button class="td-view-btn'+(tdView==='hex'?' active':'')+'" data-view="hex" onclick="setTdView(\'hex\')">⬢ Hex</button></div>'+
    '<button class="btn btn-ghost" style="min-height:38px;padding:.35rem .7rem;font-size:.72rem;flex-shrink:0" onclick="expandAllTdMembers()">Expand all</button>'+
    '<button class="btn btn-ghost" style="min-height:38px;padding:.35rem .7rem;font-size:.72rem;flex-shrink:0" onclick="collapseAllTdMembers()">Collapse all</button>'+
  '</div>';

  c.innerHTML=hdr+'<div class="td-stack te-editor" style="padding-bottom:6rem">'+
    '<div class="te-left">'+teamInfo+tmIdentityHtml()+'</div>'+
    '<div class="te-right">'+
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 .2rem;margin-top:.3rem"><div style="font-weight:800;font-size:.9rem">Roster <span style="color:var(--muted);font-weight:500;font-size:.78rem;margin-left:.3rem">'+selBuildIds.length+' / '+teamRosterSize+'</span></div><span class="td-fmt '+fmtCls+'">'+fmtLabel+'</span></div>'+
      viewToggle+
      memberCards+
      emptySlots+
      teamEditorCoverageHtml()+
      // Drop F.2: Share card (only renders when editing an existing team)
      tmShareSectionHtml()+
    '</div>'+
  '</div>'+
  '<div class="save-bar"><button class="btn btn-ghost" onclick="showTeamList()">Cancel</button><button class="btn btn-red" onclick="saveTeam()">💾 Save Team</button></div>';
}

// #SECTION: TEAM DETAIL VIEW
// ───────────────────────────────────────
// TEAM DETAIL VIEW
// Detailed single-team screen layout and rendering.
// ───────────────────────────────────────

function renderTeamDetail(c){
  var t=allTeams.find(function(x){return x.id===detailTeamId});
  if(!t){showTeamList();return}
  var fc=t.format==='Singles'?'fmt-s':'fmt-d';
  var rosterSize=Math.max((t.members||[]).length,Math.min(6,Number(t.roster_size)||6));
  var safeName=t.name.replace(/'/g,"\\'");
  var tdThemeCol=t.team_theme?TM_THEME_COLORS[t.team_theme]||null:null;
  var tdHeadStyle=tdThemeCol?'border-bottom:2px solid '+tdThemeCol+';':'';
  var tdIcon=t.team_icon?'<span style="font-size:1rem;margin-right:.25rem;opacity:.9">'+t.team_icon+'</span>':'';
  var tdArch=t.team_archetype?'<span class="tml-arch-pill" style="margin-left:.35rem">'+t.team_archetype+'</span>':'';

  // Header with Edit + overflow menu
var hdr='<div class="pg-head" style="'+tdHeadStyle+'"><div class="vh-title-row">'+
      '<span class="vh-back" onclick="showTeamBack()">← '+t.name+'</span>'+
      '<div class="vh-actions" onclick="event.stopPropagation()">'+
        '<button class="vh-btn vh-btn-sm vh-btn-edit" onclick="showTeamEditor(\''+t.id+'\')" aria-label="Edit team">✏️</button>'+
        '<div class="om-wrap">'+
          '<button class="vh-btn vh-btn-sm vh-btn-more" onclick="toggleTmlOm(\''+t.id+'\')" aria-label="More">⋮</button>'+
          '<div class="om-menu" id="tmlOm-'+t.id+'">'+
            (t.is_public&&t.share_code?'<button class="om-item" onclick="closeAllTmlOms();shareImage(\'team\',\''+t.id+'\')"><span class="om-item-icon">🔗</span>Share team</button>':'')+
            (t.is_public&&t.share_code?'<div class="om-sep"></div>':'')+
            '<button class="om-item destructive" onclick="closeAllTmlOms();confirmDelTeam(\''+t.id+'\',\''+safeName+'\')"><span class="om-item-icon">🗑</span>Delete team</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div class="pg-sub">'+tdIcon+(t.format||'')+' · '+(t.members||[]).length+' / '+rosterSize+' members'+tdArch+'</div>'+
  '</div>';

  var members='';
  var detailMembers=(t.members||[]).slice(0,rosterSize);
  detailMembers.forEach(function(m,idx){members+=tdRenderMember(m,idx+1,false)});
  var emptySlots='';
  for(var i=detailMembers.length;i<rosterSize;i++){emptySlots+='<div class="td-empty-slot" style="cursor:default">Empty Slot '+(i+1)+'</div>'}

  var viewToggle='<div style="display:flex;gap:.5rem;align-items:center">'+
    '<div class="td-view-toggle" style="flex:1"><button class="td-view-btn'+(tdView==='bars'?' active':'')+'" data-view="bars" onclick="setTdView(\'bars\')">📊 Bars</button><button class="td-view-btn'+(tdView==='hex'?' active':'')+'" data-view="hex" onclick="setTdView(\'hex\')">⬢ Hex</button></div>'+
    '<button class="btn btn-ghost" style="min-height:38px;padding:.35rem .7rem;font-size:.72rem;flex-shrink:0" onclick="expandAllTdMembers()">Expand all</button>'+
    '<button class="btn btn-ghost" style="min-height:38px;padding:.35rem .7rem;font-size:.72rem;flex-shrink:0" onclick="collapseAllTdMembers()">Collapse all</button>'+
  '</div>';

  // Type coverage + battle log retained
  var rec=getTeamRecord(t.id);
  var recordHtml=rec.total?'<span style="font-size:.72rem;font-weight:500;color:var(--muted);margin-left:.4rem">'+rec.w+'W '+rec.l+'L '+rec.d+'D · <span style="color:'+(rec.rate>=50?'var(--green)':'var(--red)')+'">'+rec.rate+'% WR</span></span>':'';
  var battleLogItems=allBattles.filter(function(b){return b.team_id===t.id}).slice(0,10);
  var battleLogHtml=battleLogItems.length?battleLogItems.map(function(l){
    var icon=l.result==='win'?'🏆':l.result==='loss'?'💀':'🤝';
    var col=l.result==='win'?'var(--green)':l.result==='loss'?'var(--red)':'var(--muted)';
    var d=new Date(l.battle_date);var ds=d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    return '<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem .7rem;border-radius:10px;background:var(--surface);margin-bottom:.35rem"><span style="font-size:1rem">'+icon+'</span><span style="font-size:.78rem;font-weight:700;color:'+col+'">'+l.result.charAt(0).toUpperCase()+l.result.slice(1)+'</span>'+(l.opponent_notes?'<span style="font-size:.72rem;color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+l.opponent_notes+'</span>':'<span style="flex:1"></span>')+'<span style="font-size:.65rem;color:var(--muted)">'+ds+'</span><button style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:.7rem" onclick="event.stopPropagation();delBattle(\''+l.id+'\')">✕</button></div>';
  }).join(''):'<p style="color:var(--muted);font-size:.78rem">No battles logged yet</p>';

  // Hero banner — 6 sprites at a glance (hidden on mobile via CSS)
  var heroHtml='<div class="td-hero">'+
    detailMembers.map(function(m){
      var img=m.is_shiny&&m.shiny_url?m.shiny_url:(m.image_url||'');
      return '<div class="td-hero-mem"><img class="td-hero-img" src="'+img+'" onerror="this.style.opacity=\'0.15\'"><div class="td-hero-name">'+(m.pokemon_name||'')+'</div></div>';
    }).join('')+
    (function(){var e='';for(var i=detailMembers.length;i<rosterSize;i++){e+='<div class="td-hero-mem td-hero-slot-empty"><div class="td-hero-empty-img"><i class="ph-bold ph-plus"></i></div><div class="td-hero-name" style="opacity:.3">Slot '+(i+1)+'</div></div>'}return e})()+
  '</div>';

  c.innerHTML=hdr+heroHtml+'<div class="td-stack">'+
    // Drop F.2: Public pill (only renders when team is public)
    tdPublicPillHtml(t)+
    viewToggle+
    '<div class="td-summary"><span class="td-fmt '+fc+'">'+(t.format||'?')+'</span><span style="color:var(--muted);font-size:.72rem">'+detailMembers.length+' of '+rosterSize+' slots filled · tap to inspect</span></div>'+
    (t.notes?'<div class="card" style="padding:.8rem 1rem"><div style="font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:.3rem">Notes</div><div style="font-size:.82rem;line-height:1.45;color:var(--text2)">'+t.notes+'</div></div>':'')+
    members+
    emptySlots+
    teamDetailCoverageHtml(detailMembers)+
    '<div class="card"><h3>📈 Battle Log '+recordHtml+'</h3>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.4rem;margin-bottom:.7rem"><button class="btn btn-ghost" style="color:var(--green);min-height:40px;font-size:.78rem;padding:.4rem .3rem" onclick="logBattle(\''+t.id+'\',\'win\')">🏆 Win</button><button class="btn btn-ghost" style="color:var(--red);min-height:40px;font-size:.78rem;padding:.4rem .3rem" onclick="logBattle(\''+t.id+'\',\'loss\')">💀 Loss</button><button class="btn btn-ghost" style="min-height:40px;font-size:.78rem;padding:.4rem .3rem" onclick="logBattle(\''+t.id+'\',\'draw\')">🤝 Draw</button></div>'+
      battleLogHtml+
    '</div>'+
  '</div>';
}

function togBldPick(id){openTeamBuildPicker(Math.min(teamRosterSize,selBuildIds.length+1))}
function rmSlot(i){selBuildIds.splice(i,1);renderTeams()}

async function saveTeam(){
  var name=document.getElementById('tmName').value.trim();if(!name){toast('Enter a team name','err');return}
  var sizeEl=document.getElementById('tmRosterSize');
  var rosterSize=Math.max(selBuildIds.length,Math.min(6,Number(sizeEl&&sizeEl.value)||teamRosterSize||6));
  var body={user_id:usr.id,name:name,format:document.getElementById('tmFmt').value,notes:document.getElementById('tmNotes').value||null,status:'Testing',roster_size:rosterSize,team_icon:tmSelIcon||null,team_theme:tmSelTheme||null,team_archetype:tmSelArch||null};
  try{var tid;
  // On edit we replace the roster links so slot order stays in sync with the current picker state.
  if(editTeamId){await upd('teams',{'id':'eq.'+editTeamId},body,true);tid=editTeamId;await rm('team_builds',{'team_id':'eq.'+tid},true)}
  else{var res=await ins('teams',body,true);tid=res[0].id}
  for(var i=0;i<selBuildIds.length;i++){await ins('team_builds',{team_id:tid,build_id:selBuildIds[i],slot_position:i+1},true)}
  toast(editTeamId?'Team updated!':'Team created!');await loadTeamRoster();showTeamList();renderDash()}catch(e){toast(e.message,'err')}
}
function confirmDelTeam(id,name){
  resetConfirmMod();
  document.getElementById('cmEmoji').textContent='🏆';
  document.getElementById('cmTitle').textContent='Delete Team?';
  document.getElementById('cmMsg').textContent='Delete "'+name+'"? This cannot be undone.';
  document.getElementById('cmBtn').onclick=function(){delTeam(id)};
  document.getElementById('confirmMod').classList.add('open');
}
async function delTeam(id){try{await rm('teams',{'id':'eq.'+id},true);closeCm();toast('Team deleted');await loadTeamRoster();renderTeams();renderDash()}catch(e){toast(e.message,'err')}}

// #SECTION: TEAM COVERAGE ANALYZER
// ═══════════════════════════════════════
// TEAM COVERAGE ANALYZER
// Analyse offensive coverage and defensive weaknesses.
// ═══════════════════════════════════════

function teamCoverageHtml(members){
  if(!members||!members.length)return'<p style="color:var(--muted);font-size:.85rem">Add members to see coverage</p>';
  var offHits={},defWeaks={};
  ALL_T.forEach(function(t){offHits[t]=0;defWeaks[t]=0});
  members.forEach(function(m){
    var t1=m.type_1,t2=m.type_2;
    ALL_T.forEach(function(dt){
      var mult=TCHART[t1]&&TCHART[t1][dt]!==undefined?TCHART[t1][dt]:1;
      if(mult>=2)offHits[dt]++;
      if(t2){
        var m2=TCHART[t2]&&TCHART[t2][dt]!==undefined?TCHART[t2][dt]:1;
        if(m2>=2)offHits[dt]++;
      }
    });
    ALL_T.forEach(function(at){
      var mult=TCHART[at]&&TCHART[at][t1]!==undefined?TCHART[at][t1]:1;
      if(t2)mult*=(TCHART[at]&&TCHART[at][t2]!==undefined?TCHART[at][t2]:1);
      if(mult>=2)defWeaks[at]++;
    });
  });

  var uncov=ALL_T.filter(function(t){return offHits[t]===0});
  var danger=ALL_T.filter(function(t){return defWeaks[t]>=2}).sort(function(a,b){return defWeaks[b]-defWeaks[a]});
  var strong=ALL_T.filter(function(t){return offHits[t]>=3}).sort(function(a,b){return offHits[b]-offHits[a]});
  var isMobile=window.innerWidth<=768;

  if(isMobile){
    var riskRows=ALL_T.filter(function(t){return offHits[t]===0||defWeaks[t]>=2}).sort(function(a,b){
      var aScore=(defWeaks[a]>=2?100+defWeaks[a]:0)+(offHits[a]===0?10:0);
      var bScore=(defWeaks[b]>=2?100+defWeaks[b]:0)+(offHits[b]===0?10:0);
      return bScore-aScore;
    });

    var html='';
    html+='<div style="display:grid;grid-template-columns:1fr;gap:.75rem">';
    html+='<div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:12px;padding:.85rem">'+
      '<div style="font-size:.72rem;font-weight:800;color:var(--green);margin-bottom:.45rem;letter-spacing:.02em">⚔ Strong coverage</div>'+
      (strong.length?'<div style="display:flex;flex-wrap:wrap;gap:5px">'+strong.map(function(t){return'<span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:9px;padding:3px 8px">'+t+'</span>'}).join('')+'</div>':'<div style="font-size:.78rem;color:var(--muted)">No standout offensive clusters yet.</div>')+
    '</div>';

    html+='<div style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.14);border-radius:12px;padding:.85rem">'+
      '<div style="font-size:.72rem;font-weight:800;color:var(--red);margin-bottom:.55rem;letter-spacing:.02em">⚠ Watch-outs</div>'+
      (riskRows.length?'<div style="display:flex;flex-direction:column;gap:.45rem">'+riskRows.map(function(t){
        var notes=[];
        if(offHits[t]===0)notes.push('no coverage');
        if(defWeaks[t]>=2)notes.push('weak ×'+defWeaks[t]);
        return'<div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.5rem .6rem;border-radius:10px;background:var(--surface);border:1px solid var(--border)">'+
          '<div style="display:flex;align-items:center;gap:.45rem;min-width:0"><span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:9px;padding:3px 8px">'+t+'</span></div>'+
          '<span style="font-size:.72rem;color:var(--muted);text-align:right">'+notes.join(' · ')+'</span>'+
        '</div>';
      }).join('')+'</div>':'<div style="font-size:.78rem;color:var(--green)">No major risk clusters. ✓</div>')+
    '</div>';

    html+='<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.85rem">'+
      '<div style="font-size:.72rem;font-weight:800;color:var(--text);margin-bottom:.55rem;letter-spacing:.02em">18-type snapshot</div>'+
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.4rem">'+ALL_T.map(function(t){
        var tone=defWeaks[t]>=2?'rgba(239,68,68,.08)':offHits[t]>=2?'rgba(34,197,94,.08)':'var(--surface2)';
        var bd=defWeaks[t]>=2?'1px solid rgba(239,68,68,.25)':offHits[t]>=2?'1px solid rgba(34,197,94,.22)':'1px solid var(--border)';
        return'<div style="border-radius:10px;padding:.45rem .5rem;background:'+tone+';border:'+bd+'">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:.35rem;margin-bottom:.25rem"><span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:8px;padding:2px 6px">'+t+'</span><span style="font-size:.65rem;color:var(--muted)">⚔ '+offHits[t]+' · 🛡 '+defWeaks[t]+'</span></div>'+
        '</div>';
      }).join('')+'</div>'+
    '</div>';

    html+='</div>';
    return html;
  }

  var html='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:1.2rem">';
  ALL_T.forEach(function(t){
    var off=offHits[t],def=defWeaks[t];
    var bg=off>=2?'rgba(34,197,94,.15)':off===0?'rgba(239,68,68,.08)':'var(--surface)';
    var border=def>=2?'2px solid var(--red)':off===0?'1.5px dashed var(--border)':'1px solid var(--border)';
    html+='<div style="border-radius:8px;padding:6px 4px;text-align:center;background:'+bg+';border:'+border+'">'+
      '<span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:8px;padding:1px 5px">'+t+'</span>'+
      '<div style="display:flex;justify-content:center;gap:6px;margin-top:4px;font-size:.6rem;font-weight:600">'+
        '<span style="color:var(--green)" title="Can hit SE">⚔'+off+'</span>'+
        '<span style="color:'+(def>=2?'var(--red)':'var(--muted2)')+'" title="Threatens team">🛡'+def+'</span>'+
      '</div></div>';
  });
  html+='</div>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.8rem">';
  html+='<div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:10px;padding:.7rem"><div style="font-size:.65rem;font-weight:700;color:var(--green);margin-bottom:.4rem">⚔️ STRONG ('+strong.length+')</div>';
  html+=strong.length?'<div style="display:flex;flex-wrap:wrap;gap:3px">'+strong.map(function(t){return'<span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:8px">'+t+'</span>'}).join('')+'</div>':'<span style="font-size:.72rem;color:var(--muted)">—</span>';
  html+='</div>';
  html+='<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:.7rem"><div style="font-size:.65rem;font-weight:700;color:var(--red);margin-bottom:.4rem">❌ NO COVERAGE ('+uncov.length+')</div>';
  html+=uncov.length?'<div style="display:flex;flex-wrap:wrap;gap:3px">'+uncov.map(function(t){return'<span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:8px">'+t+'</span>'}).join('')+'</div>':'<span style="font-size:.72rem;color:var(--green)">Full coverage! ✓</span>';
  html+='</div>';
  html+='<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:.7rem"><div style="font-size:.65rem;font-weight:700;color:var(--red);margin-bottom:.4rem">⚠️ WEAK TO ('+danger.length+')</div>';
  html+=danger.length?'<div style="display:flex;flex-wrap:wrap;gap:3px">'+danger.map(function(t){return'<span class="type-pill" style="background:'+(TC[t]||TC.Normal).m+';font-size:8px">'+t+' ×'+defWeaks[t]+'</span>'}).join('')+'</div>':'<span style="font-size:.72rem;color:var(--green)">Solid! ✓</span>';
  html+='</div></div>';
  html+='<div style="margin-top:.6rem;font-size:.6rem;color:var(--muted);display:flex;gap:1rem"><span>⚔ = team members that can hit SE</span><span>🛡 = team members threatened by this type</span><span style="color:var(--green)">Green = strong coverage</span><span style="color:var(--red)">Red border = dangerous</span></div>';
  return html;
}

// #SECTION: BATTLE LOG
// ═══════════════════════════════════════
// BATTLE LOG
// Record wins/losses/draws and calculate team records.
// ═══════════════════════════════════════

var allBattles=[];
async function loadBattles(){if(!tk)return;try{allBattles=await q('battle_log',{order:'battle_date.desc',limit:'200'},true)}catch(e){}}
async function logBattle(teamId,result,notes){
  try{await ins('battle_log',{user_id:usr.id,team_id:teamId,result:result,opponent_notes:notes||null},true);
  toast(result==='win'?'🏆 Victory logged!':result==='loss'?'💀 Loss logged':'📊 Draw logged');
  await loadBattles();renderTeams()}catch(e){toast(e.message,'err')}
}
async function delBattle(bid){try{await rm('battle_log',{'id':'eq.'+bid},true);toast('Removed');await loadBattles();renderTeams()}catch(e){toast(e.message,'err')}}
function getTeamRecord(teamId){var w=0,l=0,d=0;allBattles.forEach(function(b){if(b.team_id===teamId){if(b.result==='win')w++;else if(b.result==='loss')l++;else d++}});return{w:w,l:l,d:d,total:w+l+d,rate:w+l+d>0?Math.round(w/(w+l+d)*100):0}}
