// LOADUSER BOOTSTRAP OVERRIDE
// Expand the signed-in bootstrap so all dashboard,
// profile, team, and battle data loads together.
// ═══════════════════════════════════════
var origLoadUser=loadUser;
loadUser=async function(){await Promise.all([loadBuilds(),loadTeamRoster(),loadUDex(),loadUItems(),loadProfile(),loadUserAch(),loadBattles(),loadFriends()]);renderDash();renderDex();renderBuilds();renderTeams();renderItems();renderProfile();checkAchievements();updProfileNavBadge()};

// ═══════════════════════════════════════
// APP INITIALIZATION
// Initial data loading and startup behavior.
// Drop F.1: detect public route (#/b/<code>, #/t/<code>, #/u/<name>) on first load.
// If on a public route, suppress the initial auth prompt and let the router take
// over — reference data (pokemon, moves, etc.) still loads so the public view
// can render properly. Subsequent hash changes are handled by the router itself.
// ═══════════════════════════════════════
var _onPublicRoute=!!(window._championsRouter&&_championsRouter.parseHash(location.hash));
// Restore saved theme preference
try{var _st=localStorage.getItem('champions_theme');if(_st==='light'||_st==='dark')setTheme(_st);}catch(e){}
restoreSession();updAuth();loadPkmn();loadItems();loadNatures();loadAbilities();loadMoveIndex();loadAchievements();loadAllPkmnAbilities();
if(usr){loadUser()}else if(!_onPublicRoute){maybeShowInitialAuthPrompt()}
if(window._championsRouter)_championsRouter.init();

// ═══════════════════════════════════════
// PWA / SERVICE WORKER
// Register service worker for installable app behavior.
// ═══════════════════════════════════════
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(function(){console.log('SW registered')}).catch(function(e){console.log('SW failed:',e)})}