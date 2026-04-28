/* stats-modified.js — Full replacement of app/builds/stats.js
 * Mega Evolution additions are marked with ── MEGA ──
 * All original functions are preserved intact.
 * Globals assumed in scope: selPkmnId, spV, edView, edMegaFormId, edMegaPreview,
 *   allPkmn, allItems, allNatures, BSK, BSDB, BSN, BSC, SP_MAX, MEGA_STONE_URL,
 *   NAT_SC, TC, getMegaForms, getMegaStoneForForm, edUpdateMegaOverlay,
 *   edUpdateMegaHex, edClearMegaHex, edClearMegaOverlay
 */

'use strict';

// ─── Stat formula ─────────────────────────────────────────────────────────────

/**
 * bsCalcStatFor(key, base, spVal, nature)
 * Standard Lv50 competitive stat formula.
 * HP uses a different formula than other stats.
 * @param {string} key    — one of BSK
 * @param {number} base   — base stat value
 * @param {number} spVal  — SP allocation for this stat (0–SP_MAX)
 * @param {Object|null} nature — nature object or null
 * @returns {number}
 */
function bsCalcStatFor(key, base, spVal, nature) {
  var iv = 31;
  var ev = 0;
  var lvl = 50;
  var nat = (nature && NAT_SC) ? (NAT_SC[nature.name] && NAT_SC[nature.name][key]) || 1 : 1;
  var sp = Number(spVal) || 0;
  if (key === 'hp') {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * lvl / 100) + lvl + 10) + sp;
  }
  return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * lvl / 100) + 5) * nat)) + sp;
}

/**
 * bsGetCalcStatsFor(poke, sp, nature)
 * Returns an array of {key, base, sp, calc, natMod} for all six stats.
 * @param {Object} poke    — pokemon row
 * @param {Object} sp      — SP allocation object e.g. {hp:0, atk:32, ...}
 * @param {Object|null} nature
 * @returns {Array}
 */
function bsGetCalcStatsFor(poke, sp, nature) {
  return BSK.map(function(k) {
    var base = poke[BSDB[k]] || 0;
    var spVal = (sp && sp[k]) ? sp[k] : 0;
    var calc = bsCalcStatFor(k, base, spVal, nature);
    var natMod = (nature && NAT_SC && NAT_SC[nature.name]) ? NAT_SC[nature.name][k] || 1 : 1;
    return {key: k, base: base, sp: spVal, calc: calc, natMod: natMod};
  });
}

// ─── Pokémon / nature getters ─────────────────────────────────────────────────

/**
 * edGetPoke()
 * Returns the currently selected base Pokémon object, or undefined.
 */
function edGetPoke() {
  return allPkmn.find(function(x) {return x.id === selPkmnId;});
}

/**
 * edGetNature()
 * Reads #edNat select value and returns the matching nature object, or null.
 */
function edGetNature() {
  var el = document.getElementById('edNat');
  if (!el || !el.value) {return null;}
  return allNatures.find(function(n) {return String(n.id) === String(el.value);}) || null;
}

// ─── Bar view ─────────────────────────────────────────────────────────────────

/**
 * edBuildBars()
 * Returns the full HTML string for the stat-bars grid.
 * Includes Mega overlay elements (.bs-mega-fill, .bs-base-marker) per row. ── MEGA ──
 */
function edBuildBars() {
  var poke = edGetPoke();
  if (!poke) {return '';}
  var nature = edGetNature();
  var stats = bsGetCalcStatsFor(poke, spV, nature);

  var rows = stats.map(function(s) {
    var SCALE = 300;
    var pct = Math.min(100, Math.round(s.calc / SCALE * 100));
    var color = BSC[s.key] || '#fff';
    var natInd = s.natMod > 1 ? '<span class="bs-nat" id="ed-bi-' + s.key + '" style="color:var(--green)">\u25b2</span>'
               : s.natMod < 1 ? '<span class="bs-nat" id="ed-bi-' + s.key + '" style="color:var(--red)">\u25bc</span>'
               : '<span class="bs-nat" id="ed-bi-' + s.key + '"></span>';

    // ── MEGA: overlay elements (initially hidden) ──────────────────────────
    var megaOverlay = '<div class="bs-mega-fill" id="ed-mo-' + s.key + '" style="width:0;left:0;display:none"></div>'
      + '<div class="bs-base-marker" id="ed-mm-' + s.key + '" style="left:-999px;display:none"></div>';

    return '<div class="bs-row">'
      + '<span class="bs-label">' + (BSN[s.key] || s.key) + '</span>'
      + '<div class="bs-track-wrap">'
      + '<div class="bs-base-track">'
      + '<div class="bs-base-fill" id="ed-bf-' + s.key + '" style="width:' + pct + '%;background:' + color + '"></div>'
      + megaOverlay
      + '</div></div>'
      + '<span class="bs-val" id="ed-bv-' + s.key + '" style="color:' + color + '">' + s.calc + '</span>'
      + natInd
      + '</div>';
  });

  return '<div class="bs-grid">' + rows.join('') + '</div>';
}

/**
 * edUpdateBars(stats)
 * Updates bar fill widths, value labels, and nature indicators in the DOM.
 * Does NOT touch the Mega overlay elements.
 * @param {Array} stats — from bsGetCalcStatsFor
 */
function edUpdateBars(stats) {
  var SCALE = 300;
  stats.forEach(function(s) {
    var pct = Math.min(100, Math.round(s.calc / SCALE * 100));
    var fillEl = document.getElementById('ed-bf-' + s.key);
    var valEl  = document.getElementById('ed-bv-' + s.key);
    var natEl  = document.getElementById('ed-bi-' + s.key);
    if (fillEl) {fillEl.style.width = pct + '%';}
    if (valEl && !valEl.style.color.includes('var(--mega)')) {
      // don't overwrite mega gold coloring; edRefresh owns that
      valEl.textContent = s.calc;
    } else if (valEl) {
      valEl.textContent = s.calc;
    }
    if (natEl) {
      natEl.textContent = s.natMod > 1 ? '\u25b2' : s.natMod < 1 ? '\u25bc' : '';
      natEl.style.color = s.natMod > 1 ? 'var(--green)' : s.natMod < 1 ? 'var(--red)' : '';
    }
  });
}

// ─── Hex chart view ───────────────────────────────────────────────────────────

/**
 * edBuildHex(poke)
 * Returns the SVG HTML string for the hex radar chart.
 * Includes a second polygon for the Mega overlay. ── MEGA ──
 * @param {Object} poke — pokemon row
 */
function edBuildHex(poke) {
  var cx = 180, cy = 175, r = 90, MAX = 300;
  // Hex grid lines
  var gridLines = [0.33, 0.66, 1].map(function(frac) {
    var pts = BSK.map(function(_, i) {
      var angle = (Math.PI / 3) * i - Math.PI / 2;
      return (cx + r * frac * Math.cos(angle)).toFixed(1) + ',' + (cy + r * frac * Math.sin(angle)).toFixed(1);
    }).join(' ');
    return '<polygon points="' + pts + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
  }).join('');

  // Axis lines
  var axisLines = BSK.map(function(_, i) {
    var angle = (Math.PI / 3) * i - Math.PI / 2;
    var x = (cx + r * Math.cos(angle)).toFixed(1);
    var y = (cy + r * Math.sin(angle)).toFixed(1);
    return '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="var(--border)" stroke-width="1"/>';
  }).join('');

  // Stat labels
  var labels = BSK.map(function(k, i) {
    var angle = (Math.PI / 3) * i - Math.PI / 2;
    var dist = r + 14;
    var x = (cx + dist * Math.cos(angle)).toFixed(1);
    var y = (cy + dist * Math.sin(angle)).toFixed(1);
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" fill="var(--muted)" font-size="9" font-family="inherit" font-weight="700">' + (BSN[k] || k) + '</text>';
  }).join('');

  // Base polygon points (will be updated by edUpdateHex)
  var nature = edGetNature();
  var stats = bsGetCalcStatsFor(poke, spV, nature);
  var basePoints = stats.map(function(s, i) {
    var angle = (Math.PI / 3) * i - Math.PI / 2;
    var ratio = Math.min(1, s.calc / MAX);
    return (cx + r * ratio * Math.cos(angle)).toFixed(1) + ',' + (cy + r * ratio * Math.sin(angle)).toFixed(1);
  }).join(' ');

  // Type color for base polygon
  var typeColor = poke.type1 && TC ? (TC[poke.type1] || '#a78bfa') : '#a78bfa';

  return '<svg viewBox="0 0 360 350" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:200px">'
    + gridLines + axisLines + labels
    // ── MEGA: Mega polygon (initially hidden) ──
    + '<polygon id="ed-hexMegaPoly" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round" points="' + cx + ',' + cy + '" style="transition:all .3s ease;display:none"/>'
    // Base polygon
    + '<polygon id="ed-hexPoly" fill="' + typeColor + '" fill-opacity="0.35" stroke="' + typeColor + '" stroke-width="2" stroke-linejoin="round" points="' + basePoints + '" style="transition:all .3s ease"/>'
    + '</svg>';
}

/**
 * edUpdateHex(stats)
 * Updates the base polygon (#ed-hexPoly) points.
 * @param {Array} stats — from bsGetCalcStatsFor
 */
function edUpdateHex(stats) {
  var poly = document.getElementById('ed-hexPoly');
  if (!poly) {return;}
  var cx = 180, cy = 175, r = 90, MAX = 300;
  var pts = stats.map(function(s, i) {
    var angle = (Math.PI / 3) * i - Math.PI / 2;
    var ratio = Math.min(1, s.calc / MAX);
    return (cx + r * ratio * Math.cos(angle)).toFixed(1) + ',' + (cy + r * ratio * Math.sin(angle)).toFixed(1);
  }).join(' ');
  poly.setAttribute('points', pts);
}

// ─── SP sliders ───────────────────────────────────────────────────────────────

/**
 * edBuildSP()
 * Returns the HTML for all SP slider rows.
 */
function edBuildSP() {
  var used = BSK.reduce(function(a, k) {return a + (spV[k] || 0);}, 0);
  var remain = SP_MAX - used;

  var rows = BSK.filter(function(k) {return (spV[k] || 0) > 0;}).map(function(k) {
    var val = spV[k] || 0;
    var pct = Math.round(val / SP_MAX * 100);
    var color = BSC[k] || '#fff';
    return '<div class="dsp-row">'
      + '<span class="dsp-name" style="color:' + color + '">' + (BSN[k] || k) + '</span>'
      + '<button class="dsp-pm" onclick="edAdj(\'' + k + '\',-1)">\u2212</button>'
      + '<div class="dsp-track"><div class="dsp-fill" id="dsp-f-' + k + '" style="width:' + pct + '%;background:' + color + '"></div></div>'
      + '<button class="dsp-pm" onclick="edAdj(\'' + k + '\',1)">+</button>'
      + '<input class="dsp-val" id="dsp-v-' + k + '" style="color:' + color + '" value="' + val + '" onchange="edSet(\'' + k + '\',this.value)" oninput="edSlide(\'' + k + '\',this.value)">'
      + '</div>';
  });

  // Non-zero stats rows built above; also show zeros if not yet allocated
  var zeroRows = BSK.filter(function(k) {return !(spV[k] > 0);}).map(function(k) {
    var color = BSC[k] || '#fff';
    return '<div class="dsp-row">'
      + '<span class="dsp-name" style="color:' + color + '">' + (BSN[k] || k) + '</span>'
      + '<button class="dsp-pm" onclick="edAdj(\'' + k + '\',-1)">\u2212</button>'
      + '<div class="dsp-track"><div class="dsp-fill" id="dsp-f-' + k + '" style="width:0%;background:' + color + '"></div></div>'
      + '<button class="dsp-pm" onclick="edAdj(\'' + k + '\',1)">+</button>'
      + '<input class="dsp-val" id="dsp-v-' + k + '" style="color:' + color + '" value="0" onchange="edSet(\'' + k + '\',this.value)" oninput="edSlide(\'' + k + '\',this.value)">'
      + '</div>';
  });

  // ── MEGA: annotate SP title when in Mega preview mode ─────────────────
  var megaNote = (edMegaFormId && edMegaPreview === 'mega')
    ? ' <span style="color:var(--muted);font-size:.6rem;font-weight:500"> \xb7 base form</span>'
    : '';

  return '<div class="dsp-section">'
    + '<div class="dsp-hd">'
    + '<span class="dsp-title">SP Allocation' + megaNote + '</span>'
    + '<div style="display:flex;align-items:center"><span class="dsp-remain" id="dsp-remain">' + remain + '</span><span class="dsp-remain-label">of ' + SP_MAX + '</span></div>'
    + '</div>'
    + rows.concat(zeroRows).join('')
    + '</div>';
}

/**
 * edUpdateSP()
 * Updates SP slider fills, value inputs, and remaining counter without full rebuild.
 */
function edUpdateSP() {
  var used = BSK.reduce(function(a, k) {return a + (spV[k] || 0);}, 0);
  var remain = SP_MAX - used;
  var remEl = document.getElementById('dsp-remain');
  if (remEl) {remEl.textContent = remain;}

  BSK.forEach(function(k) {
    var val = spV[k] || 0;
    var pct = Math.round(val / SP_MAX * 100);
    var fEl = document.getElementById('dsp-f-' + k);
    var vEl = document.getElementById('dsp-v-' + k);
    if (fEl) {fEl.style.width = pct + '%';}
    if (vEl) {vEl.value = val;}
  });
}

// ─── SP control handlers ──────────────────────────────────────────────────────

/**
 * edSet(key, val)
 * Sets SP for a stat from a text input change event.
 */
function edSet(key, val) {
  val = parseInt(val, 10);
  if (isNaN(val)) {val = 0;}
  val = Math.max(0, Math.min(val, SP_MAX));
  spV[key] = val;
  edRefresh();
}

/**
 * edSlide(key, val)
 * Called on input event from SP text input (live slide).
 */
function edSlide(key, val) {
  edSet(key, val);
}

/**
 * edAdj(key, delta)
 * Increments or decrements a stat's SP by delta (±1).
 */
function edAdj(key, delta) {
  var cur = spV[key] || 0;
  var used = BSK.reduce(function(a, k) {return a + (spV[k] || 0);}, 0);
  var newVal = cur + delta;
  if (newVal < 0) {return;}
  if (delta > 0 && used >= SP_MAX) {return;}
  spV[key] = newVal;
  edRefresh();
}

// ─── Section builders ─────────────────────────────────────────────────────────

/**
 * edBuildStatSection()
 * Returns the full stat section HTML:
 *   [preview toggle if Mega on] + poke header + view toggle + bars|hex + BST + SP
 * ── MEGA: preview bar injected at top when edMegaFormId is set ──
 */
function edBuildStatSection() {
  var poke = edGetPoke();
  if (!poke) {return '';}
  var nature = edGetNature();

  // ── MEGA: determine which poke to display in header ───────────────────
  var displayPoke = poke;
  var isMegaPreview = !!(edMegaFormId && edMegaPreview === 'mega');
  if (isMegaPreview) {
    var mf = allPkmn.find(function(p) {return p.id === edMegaFormId;});
    if (mf) {displayPoke = mf;}
  }

  // ── MEGA: preview toggle bar ──────────────────────────────────────────
  var previewBarHtml = '';
  if (edMegaFormId) {
    var megaForm = allPkmn.find(function(p) {return p.id === edMegaFormId;});
    var megaLabel = megaForm ? megaForm.name.replace(poke.name, '').trim() : 'Mega';
    if (!megaLabel) {megaLabel = 'Mega';}
    var stone = megaForm ? getMegaStoneForForm(megaForm, poke.name) : null;
    var stoneImg = stone && stone.sprite_url
      ? '<img src="' + _escSt(stone.sprite_url) + '" onerror="this.style.display=\'none\'" alt="">'
      : '<img src="' + _escSt(MEGA_STONE_URL) + '" onerror="this.style.display=\'none\'" alt="">';
    var baseActive = edMegaPreview === 'base' ? ' active' : '';
    var megaActive = edMegaPreview === 'mega' ? ' active mega-active' : '';
    previewBarHtml = '<div class="preview-bar" id="edPreviewBar">'
      + '<span class="preview-label">Preview</span>'
      + '<div class="preview-btns">'
      + '<button class="preview-btn' + baseActive + '" data-preview="base" onclick="edSwitchPreview(\'base\')">\u2694 Base</button>'
      + '<button class="preview-btn' + megaActive + '" data-preview="mega" onclick="edSwitchPreview(\'mega\')">'
      + stoneImg + ' ' + megaLabel + '</button>'
      + '</div></div>';
  }

  // ── Header: sprite + name + ability ──────────────────────────────────
  var sprite = displayPoke.sprite_url || '';
  var abilityHtml;
  if (isMegaPreview && displayPoke.ability1) {
    abilityHtml = 'Ability: <span class="mega-ability-text">' + _escSt(displayPoke.ability1) + '</span>';
  } else {
    var abilityName = poke.ability1 || '';
    abilityHtml = 'Ability: <strong style="color:var(--text)">' + _escSt(abilityName) + '</strong>';
  }

  var nameBadge = isMegaPreview
    ? ' <span class="mega-badge"><img src="' + _escSt(MEGA_STONE_URL) + '" onerror="this.style.display=\'none\'" alt=""> MEGA</span>'
    : '';

  var pokeHead = '<div class="stat-poke-head">'
    + '<img class="stat-poke-sprite" src="' + _escSt(sprite) + '" alt="">'
    + '<div>'
    + '<div class="stat-poke-name">' + _escSt(displayPoke.name) + nameBadge + '</div>'
    + '<div class="stat-poke-ability">' + abilityHtml + '</div>'
    + '</div></div>';

  // View toggle
  var viewTog = '<div class="view-tog">'
    + '<button class="view-btn' + (edView === 'bars' ? ' active' : '') + '" onclick="edSwitchView(\'bars\')">Bars</button>'
    + '<button class="view-btn' + (edView === 'hex' ? ' active' : '') + '" onclick="edSwitchView(\'hex\')">Hex</button>'
    + '</div>';

  // Stat content (bars or hex)
  var statContent = edView === 'hex' ? edBuildHex(displayPoke) : edBuildBars();

  // BST
  var stats = bsGetCalcStatsFor(displayPoke, spV, nature);
  var bst = stats.reduce(function(a, s) {return a + s.calc;}, 0);
  var bstClass = bst >= 900 ? 'bst-elite' : bst >= 700 ? 'bst-high' : '';
  var bstNote = isMegaPreview ? ' <span class="bst-mega-note">\u2726 Mega</span>' : '';
  var bstHtml = '<div class="bs-total">'
    + '<span class="bs-total-label">Lv50 Stat Total' + bstNote + '</span>'
    + '<span class="bst-val ' + bstClass + '" id="ed-bst">' + bst + '</span>'
    + '</div>';

  return '<div class="stat-section">'
    + previewBarHtml
    + '<div class="stat-inner">'
    + pokeHead + viewTog + statContent + bstHtml + edBuildSP()
    + '</div></div>';
}

// ─── View switcher ────────────────────────────────────────────────────────────

/**
 * edSwitchView(view)
 * Switches between 'bars' and 'hex' stat views.
 * @param {'bars'|'hex'} view
 */
function edSwitchView(view) {
  edView = view;
  // Update toggle button active state
  document.querySelectorAll('.view-btn').forEach(function(b) {
    b.classList.toggle('active', b.textContent.toLowerCase().indexOf(view) !== -1);
  });
  // Swap content
  var inner = document.querySelector('.stat-section .stat-inner');
  if (!inner) {return;}
  // Re-render just the chart area (between view-tog and bs-total)
  // Simplest: full section re-render via edRefresh
  edRefresh();
}

// ─── BST update ───────────────────────────────────────────────────────────────

function _edUpdateBST(stats) {
  var bst = stats.reduce(function(a, s) {return a + s.calc;}, 0);
  var el = document.getElementById('ed-bst');
  if (!el) {return;}
  el.textContent = bst;
  el.className = 'bst-val' + (bst >= 900 ? ' bst-elite' : bst >= 700 ? ' bst-high' : '');
}

// ─── Main refresh ─────────────────────────────────────────────────────────────

/**
 * edRefresh()
 * Central update function — reads current state and pushes changes to the DOM.
 * ── MEGA: Handles mega preview mode, overlay bars, and overlay hex. ──
 */
function edRefresh() {
  var poke = edGetPoke();
  if (!poke) {return;}
  var nature = edGetNature();

  // ── MEGA: Determine which Pokémon to use for stat display ─────────────
  var isMegaPreview = !!(edMegaFormId && edMegaPreview === 'mega');
  var displayPoke = poke;
  if (isMegaPreview) {
    var mf = allPkmn.find(function(p) {return p.id === edMegaFormId;});
    if (mf) {displayPoke = mf;}
  }

  var displayStats = bsGetCalcStatsFor(displayPoke, spV, nature);
  var baseStats    = bsGetCalcStatsFor(poke, spV, nature);

  // ── Nature picker sync ───────────────────────────────────────────────
  // (nature picker widget may call its own refresh — no action needed here
  //  beyond ensuring the select value is honoured via edGetNature above)

  // ── Update stat bars ─────────────────────────────────────────────────
  if (edView === 'bars') {
    edUpdateBars(displayStats);
    if (isMegaPreview) {
      edUpdateMegaOverlay(baseStats, displayStats);
    } else {
      edClearMegaOverlay();
    }
  }

  // ── Update hex ───────────────────────────────────────────────────────
  if (edView === 'hex') {
    edUpdateHex(displayStats);
    if (isMegaPreview) {
      edUpdateMegaHex(baseStats, displayStats);
    } else {
      edClearMegaHex();
    }
  }

  // ── BST ──────────────────────────────────────────────────────────────
  _edUpdateBST(displayStats);

  // ── SP sliders ───────────────────────────────────────────────────────
  edUpdateSP();

  // ── Stat header: sprite + name + ability ─────────────────────────────
  _edRefreshStatHeader(poke, displayPoke, isMegaPreview);

  // ── Preview bar button states ─────────────────────────────────────────
  if (edMegaFormId) {
    document.querySelectorAll('.preview-btn').forEach(function(b) {
      var bMode = b.getAttribute('data-preview');
      b.classList.toggle('active', bMode === edMegaPreview);
      b.classList.toggle('mega-active', bMode === 'mega' && edMegaPreview === 'mega');
    });
    var pb = document.getElementById('edPreviewBar');
    if (pb) {pb.style.display = '';}
  } else {
    var pb2 = document.getElementById('edPreviewBar');
    if (pb2) {pb2.style.display = 'none';}
  }
}

/**
 * _edRefreshStatHeader(basePoke, displayPoke, isMegaPreview)
 * Updates the stat-poke-head sprite, name, and ability in place.
 */
function _edRefreshStatHeader(basePoke, displayPoke, isMegaPreview) {
  var spriteEl = document.querySelector('.stat-poke-sprite');
  var nameEl   = document.querySelector('.stat-poke-name');
  var abilEl   = document.querySelector('.stat-poke-ability');
  if (spriteEl && displayPoke.sprite_url) {spriteEl.src = displayPoke.sprite_url;}
  if (nameEl) {
    var badge = isMegaPreview
      ? ' <span class="mega-badge"><img src="' + _escSt(MEGA_STONE_URL) + '" onerror="this.style.display=\'none\'" alt=""> MEGA</span>'
      : '';
    nameEl.innerHTML = _escSt(displayPoke.name) + badge;
  }
  if (abilEl) {
    if (isMegaPreview && displayPoke.ability1) {
      abilEl.innerHTML = 'Ability: <span class="mega-ability-text">' + _escSt(displayPoke.ability1) + '</span>';
    } else {
      abilEl.innerHTML = 'Ability: <strong style="color:var(--text)">' + _escSt(basePoke.ability1 || '') + '</strong>';
    }
  }
}

/** HTML-escape helper (local copy; mega.js also has _esc) */
function _escSt(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
