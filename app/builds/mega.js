/* mega.js — Mega Evolution state & logic for Champions Forge
 * Loaded AFTER: globals.js (allPkmn, allItems, BSK, BSDB, SP_MAX, MEGA_STONE_URL)
 * Loaded BEFORE: stats.js, item-picker.js
 * All functions are plain browser globals (no module syntax, no framework).
 *
 * SAVE/LOAD CONTRACT (implement in builds/detail.js or builds/main.js):
 *   Save:  include `mega_pokemon_id: edMegaFormId || null` in payload
 *          include `item_id: edMegaFormId ? (window._megaSaveData.stone_item_id || null) : <normal item id>` in payload
 *   Load:  call edLoadMegaState(build.mega_pokemon_id || null) after setting selPkmnId
 */

'use strict';

// ─── Core state ──────────────────────────────────────────────────────────────

/** ID of the currently selected Mega form's pokemon row, or null. */
var edMegaFormId = null;

/** Which panel is shown in the stat section: 'base' or 'mega'. */
var edMegaPreview = 'base';

/**
 * window._megaSaveData — updated whenever edMegaFormId changes.
 * The save routine should read this object's fields.
 *   mega_pokemon_id  {number|null}  FK to pokemon.id of Mega form row
 *   stone_item_id    {number|null}  id of the auto-assigned Mega Stone item
 */
window._megaSaveData = {mega_pokemon_id: null, stone_item_id: null};

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * getMegaForms(basePkmnId)
 * Returns all Pokémon rows whose base_species_id === basePkmnId.
 * @param  {number} basePkmnId
 * @returns {Array}
 */
function getMegaForms(basePkmnId) {
  return allPkmn.filter(function(p) {return p.base_species_id === basePkmnId;});
}

/**
 * getMegaStoneForForm(megaForm, baseName)
 * Finds the Mega Stone item for a given Mega form row.
 * For single-Mega Pokémon: first stone whose species_lock === baseName.
 * For dual-Mega Pokémon (names contain 'X' or 'Y' suffix):
 *   matches the suffix letter found in megaForm.name to the same letter in item.name.
 * @param  {Object} megaForm  — pokemon row with form==='Mega'
 * @param  {string} baseName  — base Pokémon name e.g. 'Charizard'
 * @returns {Object|null}
 */
function getMegaStoneForForm(megaForm, baseName) {
  var stones = allItems.filter(function(it) {
    return it.category === 'mega_stone' && it.species_lock === baseName;
  });
  if (!stones.length) {return null;}
  if (stones.length === 1) {return stones[0];}
  // Dual-Mega: extract trailing single letter from form name (e.g. 'Mega X' → 'X')
  var m = megaForm.name.match(/\b([A-Z])\s*$/);
  if (!m) {return stones[0];}
  var letter = m[1];
  var match = stones.find(function(it) {return it.name.indexOf(letter) !== -1;});
  return match || stones[0];
}

// ─── Toggle / selection ───────────────────────────────────────────────────────

/**
 * edToggleMega(checked)
 * Called by the Mega toggle checkbox onchange handler.
 * Enables or disables Mega for the current Pokémon.
 * @param {boolean} checked
 */
function edToggleMega(checked) {
  if (!checked) {
    edClearMega();
    return;
  }
  var base = edGetPoke();
  if (!base) {return;}
  var forms = getMegaForms(base.id);
  if (!forms.length) {return;}
  // Auto-select first form
  edSelectMegaForm(forms[0].id);
}

/**
 * edSelectMegaForm(formId)
 * Sets edMegaFormId, auto-assigns the Mega Stone to the item slot,
 * updates _megaSaveData, re-renders the Mega section body,
 * and triggers edRefresh().
 * @param {number|string} formId
 */
function edSelectMegaForm(formId) {
  formId = Number(formId);
  edMegaFormId = formId;

  var base = edGetPoke();
  var megaForm = allPkmn.find(function(p) {return p.id === formId;});
  var stone = megaForm && base ? getMegaStoneForForm(megaForm, base.name) : null;

  window._megaSaveData = {
    mega_pokemon_id: formId,
    stone_item_id: stone ? stone.id : null
  };

  // Auto-assign Mega Stone to item slot (programmatic pickItem call)
  if (stone && typeof pickItem === 'function') {
    pickItem(stone.id, true /* fromMega */);
  }

  // Lock the item button
  _megaLockItemBtn(stone);

  // Update form buttons active state inside mega-body
  _megaRefreshFormBtns(formId);

  // Re-render stat section and refresh
  if (typeof edRefresh === 'function') {edRefresh();}
}

/**
 * edClearMega()
 * Resets all Mega state, unlocks item button, clears hex overlay.
 */
function edClearMega() {
  edMegaFormId = null;
  edMegaPreview = 'base';
  window._megaSaveData = {mega_pokemon_id: null, stone_item_id: null};

  // Unlock item button
  var btn = document.getElementById('edItemBtn');
  if (btn) {
    btn.classList.remove('locked');
    btn.style.pointerEvents = '';
    // Remove lock badge if present
    var badge = btn.querySelector('.item-lock-badge');
    if (badge) {badge.remove();}
  }

  // Hide preview bar
  var pb = document.getElementById('edPreviewBar');
  if (pb) {pb.style.display = 'none';}

  // Clear hex overlay
  if (typeof edClearMegaHex === 'function') {edClearMegaHex();}

  // Clear bar overlays
  BSK.forEach(function(k) {
    var mo = document.getElementById('ed-mo-' + k);
    var mm = document.getElementById('ed-mm-' + k);
    if (mo) {mo.style.width = '0'; mo.style.left = '0';}
    if (mm) {mm.style.left = '-999px';}
  });

  if (typeof edRefresh === 'function') {edRefresh();}
}

/**
 * edSwitchPreview(mode)
 * Switches between 'base' and 'mega' stat preview modes.
 * @param {'base'|'mega'} mode
 */
function edSwitchPreview(mode) {
  edMegaPreview = mode;
  // Update preview button active classes
  var btns = document.querySelectorAll('.preview-btn');
  btns.forEach(function(b) {
    var bMode = b.getAttribute('data-preview');
    b.classList.toggle('active', bMode === mode);
    b.classList.toggle('mega-active', bMode === 'mega' && mode === 'mega');
  });
  if (typeof edRefresh === 'function') {edRefresh();}
}

// ─── Load from saved build ────────────────────────────────────────────────────

/**
 * edLoadMegaState(savedMegaPokemonId)
 * Called from the build loader after selPkmnId is set.
 * Pass null or undefined to clear Mega state.
 * @param {number|null} savedMegaPokemonId
 */
function edLoadMegaState(savedMegaPokemonId) {
  if (!savedMegaPokemonId) {
    edClearMega();
    return;
  }
  // Silently set state then select (which fires edRefresh)
  edMegaFormId = null; // reset first so _megaSaveData gets written fresh
  edSelectMegaForm(savedMegaPokemonId);
  // Ensure toggle checkbox reflects loaded state
  var chk = document.getElementById('edMegaCheck');
  if (chk) {chk.checked = true;}
  _megaShowBody(true);
}

// ─── HTML rendering ───────────────────────────────────────────────────────────

/**
 * edRenderMegaSection()
 * Returns the full HTML string for the Mega Evolution card.
 * Returns '' when the current Pokémon has no Mega forms.
 */
function edRenderMegaSection() {
  var base = edGetPoke();
  if (!base) {return '';}
  var forms = getMegaForms(base.id);
  if (!forms.length) {return '';}

  var isOn = !!edMegaFormId;
  var stoneNames = forms.map(function(f) {
    var s = getMegaStoneForForm(f, base.name);
    return s ? s.name : f.name;
  }).join(' \xb7 ');

  var subText = isOn ? 'Choose form below' : stoneNames;

  var bodyHtml = '';
  if (isOn && forms.length > 0) {
    var btnHtml = forms.map(function(f) {
      var isActive = f.id === edMegaFormId;
      var label = f.name.replace(base.name, '').trim() || f.name;
      var stone = getMegaStoneForForm(f, base.name);
      var stoneImg = stone && stone.sprite_url
        ? '<img src="' + _esc(stone.sprite_url) + '" onerror="this.style.display=\'none\'" alt="">'
        : '<img src="' + _esc(MEGA_STONE_URL) + '" onerror="this.style.display=\'none\'" alt="">';
      return '<button class="mfb' + (isActive ? ' active' : '') + '" data-mega-form-id="' + f.id + '" onclick="edSelectMegaForm(' + f.id + ')">' + stoneImg + ' ' + _esc(label) + '</button>';
    }).join('');
    bodyHtml = '<div class="mega-body"><div class="mega-form-row"><span class="mega-form-label">Form</span><div class="mega-form-btns">' + btnHtml + '</div></div></div>';
  }

  return '<div class="mega-section" id="edMegaSection">'
    + '<div class="mega-head">'
    + '<div class="mega-icon-wrap"><img src="' + _esc(MEGA_STONE_URL) + '" onerror="this.style.opacity=.3" alt=""></div>'
    + '<div class="mega-text"><div class="mega-title">Mega Evolution</div><div class="mega-sub" id="edMegaSub">' + _esc(subText) + '</div></div>'
    + '<label class="mega-tog"><input type="checkbox" id="edMegaCheck"' + (isOn ? ' checked' : '') + ' onchange="edToggleMega(this.checked)"><span class="tog-track"></span></label>'
    + '</div>'
    + bodyHtml
    + '</div>';
}

// ─── Internal DOM helpers ─────────────────────────────────────────────────────

/** Escape HTML entities in a string for safe insertion. */
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * _megaLockItemBtn(stone)
 * Applies locked styling to #edItemBtn and injects the Mega Stone info.
 * @param {Object|null} stone — item row
 */
function _megaLockItemBtn(stone) {
  var btn = document.getElementById('edItemBtn');
  if (!btn) {return;}
  btn.classList.add('locked');
  btn.style.pointerEvents = 'none';
  // Ensure lock badge exists
  var badge = btn.querySelector('.item-lock-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'item-lock-badge';
    btn.appendChild(badge);
  }
  badge.innerHTML = '\uD83D\uDD12 Mega';
  // Update name/icon if stone present
  var nameEl = btn.querySelector('.item-btn-name');
  if (nameEl && stone) {nameEl.textContent = stone.name;}
  var imgEl = btn.querySelector('img.item-btn-sprite');
  if (imgEl && stone && stone.sprite_url) {imgEl.src = stone.sprite_url;}
}

/**
 * _megaRefreshFormBtns(activeFormId)
 * Updates active class on .mfb buttons without a full re-render.
 */
function _megaRefreshFormBtns(activeFormId) {
  var btns = document.querySelectorAll('.mfb[data-mega-form-id]');
  btns.forEach(function(b) {
    b.classList.toggle('active', Number(b.getAttribute('data-mega-form-id')) === activeFormId);
  });
}

/**
 * _megaShowBody(show)
 * Show/hide the .mega-body element inside #edMegaSection.
 */
function _megaShowBody(show) {
  var body = document.querySelector('#edMegaSection .mega-body');
  if (!body) {return;}
  body.style.display = show ? '' : 'none';
}

// ─── Stat overlay calculations ────────────────────────────────────────────────

/**
 * edUpdateMegaOverlay(baseStats, megaStats)
 * Updates the gold extension bars (.bs-mega-fill) and marker lines (.bs-base-marker)
 * for the Mega stat preview (bar view).
 * baseStats / megaStats: arrays of {key, base, sp, calc, natMod}
 * Uses a 300-point scale (same as edUpdateBars; adjust STAT_SCALE if different).
 */
function edUpdateMegaOverlay(baseStats, megaStats) {
  var STAT_SCALE = 300;
  baseStats.forEach(function(bs) {
    var ms = megaStats.find(function(x) {return x.key === bs.key;});
    var moEl = document.getElementById('ed-mo-' + bs.key);
    var mmEl = document.getElementById('ed-mm-' + bs.key);
    var valEl = document.getElementById('ed-bv-' + bs.key);
    if (!ms) {return;}

    var basePct = Math.min(100, Math.round(bs.calc / STAT_SCALE * 100));
    var megaPct = Math.min(100, Math.round(ms.calc / STAT_SCALE * 100));
    var delta = megaPct - basePct;

    if (delta > 0) {
      if (moEl) {
        moEl.style.left = basePct + '%';
        moEl.style.width = delta + '%';
        moEl.style.display = '';
      }
      if (mmEl) {
        mmEl.style.left = basePct + '%';
        mmEl.style.display = '';
      }
      // Paint stat value in mega gold when boosted
      if (valEl) {valEl.style.color = 'var(--mega)';}
    } else {
      if (moEl) {moEl.style.width = '0'; moEl.style.left = '0'; moEl.style.display = 'none';}
      if (mmEl) {mmEl.style.left = '-999px'; mmEl.style.display = 'none';}
    }
  });
}

/**
 * edClearMegaOverlay()
 * Hides all gold overlay bars and resets stat value colors.
 */
function edClearMegaOverlay() {
  BSK.forEach(function(k) {
    var mo = document.getElementById('ed-mo-' + k);
    var mm = document.getElementById('ed-mm-' + k);
    if (mo) {mo.style.width = '0'; mo.style.left = '0'; mo.style.display = 'none';}
    if (mm) {mm.style.left = '-999px'; mm.style.display = 'none';}
    var valEl = document.getElementById('ed-bv-' + k);
    if (valEl) {valEl.style.color = '';}
  });
}

/**
 * edUpdateMegaHex(baseStats, megaStats)
 * Dims the base hex polygon and draws the Mega hex overlay.
 * baseStats / megaStats: arrays of {key, base, sp, calc, natMod}
 * Reuses the same geometry from edBuildHex (cx=180, cy=175, r=90).
 */
function edUpdateMegaHex(baseStats, megaStats) {
  var basePoly = document.getElementById('ed-hexPoly');
  var megaPoly = document.getElementById('ed-hexMegaPoly');
  if (!basePoly || !megaPoly) {return;}

  // Dim base polygon to outline only
  basePoly.setAttribute('fill-opacity', '0');
  basePoly.setAttribute('stroke-opacity', '0.4');

  // Compute mega polygon points using the same hex geometry
  var points = _megaHexPoints(megaStats);
  megaPoly.setAttribute('points', points);
  megaPoly.style.display = '';
}

/**
 * edClearMegaHex()
 * Restores the base hex polygon to full type-color fill and hides the Mega overlay.
 */
function edClearMegaHex() {
  var basePoly = document.getElementById('ed-hexPoly');
  var megaPoly = document.getElementById('ed-hexMegaPoly');
  if (basePoly) {
    basePoly.setAttribute('fill-opacity', '0.35');
    basePoly.setAttribute('stroke-opacity', '1');
  }
  if (megaPoly) {
    megaPoly.style.display = 'none';
    megaPoly.setAttribute('points', '180,175');
  }
}

/**
 * _megaHexPoints(stats)
 * Returns SVG points string for a hex chart from a stats array.
 * Geometry: cx=180, cy=175, r=90, MAX_STAT=300, 6 axes (BSK order).
 * @param {Array} stats — [{key, calc}, ...]
 * @returns {string}
 */
function _megaHexPoints(stats) {
  var cx = 180, cy = 175, r = 90, MAX = 300;
  var pts = BSK.map(function(k, i) {
    var angle = (Math.PI / 3) * i - Math.PI / 2;
    var s = stats.find(function(x) {return x.key === k;});
    var val = s ? s.calc : 0;
    var ratio = Math.min(1, val / MAX);
    var x = cx + r * ratio * Math.cos(angle);
    var y = cy + r * ratio * Math.sin(angle);
    return Math.round(x * 10) / 10 + ',' + Math.round(y * 10) / 10;
  });
  return pts.join(' ');
}
