/* item-picker-modified.js — Full replacement of app/pickers/item-picker.js
 * Mega Evolution additions are marked with ── MEGA ──
 * All original functions are preserved intact.
 * Globals assumed in scope: allItems, allPkmn, selPkmnId, edMegaFormId,
 *   getMegaForms, MEGA_STONE_URL
 */

'use strict';

// ─── Sheet state ──────────────────────────────────────────────────────────────

var _itemPickerOpen = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * openItemPicker()
 * Opens the item picker bottom sheet.
 * ── MEGA: Returns early (no-op) when a Mega form is selected, because the
 *    Mega Stone is auto-assigned and the item slot is locked. ──
 */
function openItemPicker() {
  // ── MEGA: lock guard ──────────────────────────────────────────────────
  if (edMegaFormId) {return;}

  _itemPickerOpen = true;
  var sheet = document.getElementById('itemPickerSheet');
  if (!sheet) {
    // First open: inject shell
    var shell = document.createElement('div');
    shell.id = 'itemPickerSheet';
    shell.innerHTML = renderItemPickerShell();
    document.body.appendChild(shell);
  }
  var el = document.getElementById('itemPickerSheet');
  if (el) {
    el.style.display = '';
    // Populate body
    renderItemPickerBody();
    // Trigger open animation on next frame
    requestAnimationFrame(function() {el.classList.add('open');});
  }
}

/**
 * closeItemPicker()
 * Closes the item picker bottom sheet.
 */
function closeItemPicker() {
  _itemPickerOpen = false;
  var el = document.getElementById('itemPickerSheet');
  if (!el) {return;}
  el.classList.remove('open');
  setTimeout(function() {el.style.display = 'none';}, 260);
}

/**
 * pickItem(id, fromMega)
 * Sets the hidden #edItem input value and updates the #edItemBtn display button.
 * Called programmatically (e.g. from edSelectMegaForm) when fromMega is true.
 * @param {number|string} id       — item id, or '' / null to clear
 * @param {boolean}       fromMega — skip close when called from mega logic
 */
function pickItem(id, fromMega) {
  var hiddenEl = document.getElementById('edItem');
  if (hiddenEl) {hiddenEl.value = id || '';}

  var btn = document.getElementById('edItemBtn');
  if (btn) {
    if (!id) {
      // Clear display
      var imgEl = btn.querySelector('img.item-btn-sprite');
      if (imgEl) {imgEl.src = ''; imgEl.style.display = 'none';}
      var nameEl = btn.querySelector('.item-btn-name');
      if (nameEl) {nameEl.textContent = '\u2014 None \u2014'; nameEl.style.color = 'var(--muted)';}
      var caret = btn.querySelector('.caret');
      if (caret) {caret.style.display = '';}
    } else {
      var item = allItems.find(function(it) {return String(it.id) === String(id);});
      if (item) {
        var imgEl2 = btn.querySelector('img.item-btn-sprite');
        if (!imgEl2) {
          imgEl2 = document.createElement('img');
          imgEl2.className = 'item-btn-sprite';
          imgEl2.style.cssText = 'width:26px;height:26px;object-fit:contain';
          btn.insertBefore(imgEl2, btn.firstChild);
        }
        imgEl2.src = item.sprite_url || '';
        imgEl2.style.display = item.sprite_url ? '' : 'none';
        var nameEl2 = btn.querySelector('.item-btn-name');
        if (nameEl2) {nameEl2.textContent = item.name; nameEl2.style.color = '';}
        var caret2 = btn.querySelector('.caret');
        if (caret2) {caret2.style.display = '';}
      }
    }
  }

  if (!fromMega) {closeItemPicker();}
}

// ─── Eligibility filter ───────────────────────────────────────────────────────

/**
 * pickerEligibleItems()
 * Returns the filtered item list for the currently selected base Pokémon.
 *
 * Rules:
 *   1. Items with category 'hold' or 'berry' are always eligible.
 *   2. Mega Stones:
 *      ── MEGA (inverted logic) ──
 *      - When the base Pokémon HAS Mega forms: show stones whose species_lock
 *        matches the base Pokémon's name. Hide all other Mega Stones.
 *      - When the Pokémon IS a Mega form row (form==='Mega'): hide all stones
 *        (safety guard — should not normally happen in this flow).
 *      - When no Mega forms: hide all Mega Stones.
 *   3. Species-locked items (non-stone): only shown when species_lock matches
 *      the base Pokémon's name or is empty/null.
 *
 * @returns {Array}
 */
function pickerEligibleItems() {
  var base = allPkmn.find(function(p) {return p.id === selPkmnId;});
  if (!base) {return allItems.filter(function(it) {return it.category !== 'mega_stone';});}

  // ── MEGA: detect whether this species has Mega forms ─────────────────
  var hasMegaForms = allPkmn.some(function(p) {return p.base_species_id === base.id;});
  var isMegaRow    = base.form === 'Mega';

  return allItems.filter(function(it) {
    // Mega stone handling
    if (it.category === 'mega_stone') {
      if (isMegaRow) {return false;} // safety guard
      if (!hasMegaForms) {return false;}
      // Show only stones whose species_lock matches this base poke's name
      return it.species_lock === base.name;
    }
    // Species-locked non-stone items
    if (it.species_lock) {
      return it.species_lock === base.name;
    }
    return true;
  });
}

// ─── Shell & body renderers ───────────────────────────────────────────────────

/**
 * renderItemPickerShell()
 * Returns the outer HTML for the item picker bottom sheet overlay.
 * The inner body is populated separately by renderItemPickerBody().
 */
function renderItemPickerShell() {
  return '<div class="ip-overlay" onclick="closeItemPicker()"></div>'
    + '<div class="ip-sheet">'
    + '<div class="ip-handle"></div>'
    + '<div class="ip-head">'
    + '<span class="ip-title">Choose Item</span>'
    + '<button class="ip-close" onclick="closeItemPicker()">\u00d7</button>'
    + '</div>'
    + '<div class="ip-search-wrap">'
    + '<input class="ip-search" id="ipSearch" type="search" placeholder="Search items\u2026" oninput="renderItemPickerBody()">'
    + '</div>'
    + '<div class="ip-cat-tabs" id="ipCatTabs"></div>'
    + '<div class="ip-body" id="ipBody"></div>'
    + '</div>';
}

/**
 * renderItemPickerBody()
 * Reads the current search query, filters eligible items, groups by category,
 * and renders category tab pills + item cards into #ipCatTabs and #ipBody.
 */
function renderItemPickerBody() {
  var eligible = pickerEligibleItems();

  // Apply search filter
  var query = '';
  var searchEl = document.getElementById('ipSearch');
  if (searchEl) {query = searchEl.value.trim().toLowerCase();}
  if (query) {
    eligible = eligible.filter(function(it) {
      return it.name.toLowerCase().indexOf(query) !== -1
        || (it.acquisition && it.acquisition.toLowerCase().indexOf(query) !== -1);
    });
  }

  // Group by category
  var CAT_ORDER = ['hold', 'berry', 'mega_stone'];
  var CAT_LABEL = {hold: 'Hold Items', berry: 'Berries', mega_stone: 'Mega Stones'};
  var groups = {};
  eligible.forEach(function(it) {
    var cat = it.category || 'hold';
    if (!groups[cat]) {groups[cat] = [];}
    groups[cat].push(it);
  });

  // Category tab pills
  var tabsEl = document.getElementById('ipCatTabs');
  if (tabsEl) {
    var tabs = CAT_ORDER.filter(function(c) {return groups[c] && groups[c].length;}).map(function(c) {
      return '<button class="ip-cat-tab" onclick="ipScrollToSection(\'' + c + '\')">'
        + (CAT_LABEL[c] || c) + '</button>';
    }).join('');
    tabsEl.innerHTML = tabs || '';
  }

  // Item cards body
  var bodyEl = document.getElementById('ipBody');
  if (!bodyEl) {return;}

  if (!eligible.length) {
    bodyEl.innerHTML = '<p class="ip-empty">No items available.</p>';
    return;
  }

  var html = '';
  CAT_ORDER.forEach(function(cat) {
    if (!groups[cat] || !groups[cat].length) {return;}
    html += '<div class="ip-section" id="ip-sec-' + cat + '">';
    html += '<div class="ip-section-label">' + (CAT_LABEL[cat] || cat) + '</div>';
    html += '<div class="ip-cards">';
    groups[cat].forEach(function(it) {
      var isMega = it.category === 'mega_stone';
      var megaClass = isMega ? ' epc-mega' : '';
      var costBadge = it.vp_cost ? '<span class="epc-cost">' + it.vp_cost + ' VP</span>' : '';
      var acqBadge  = it.acquisition ? '<span class="epc-acq">' + _escIp(it.acquisition) + '</span>' : '';
      var spriteHtml = it.sprite_url
        ? '<img class="epc-sprite" src="' + _escIp(it.sprite_url) + '" alt="">'
        : isMega ? '<img class="epc-sprite" src="' + _escIp(MEGA_STONE_URL) + '" alt="">'
        : '';
      html += '<button class="epc-card' + megaClass + '" onclick="pickItem(' + it.id + ')">'
        + spriteHtml
        + '<div class="epc-info">'
        + '<span class="epc-name">' + _escIp(it.name) + '</span>'
        + '<div class="epc-badges">' + costBadge + acqBadge + '</div>'
        + '</div></button>';
    });
    html += '</div></div>';
  });

  bodyEl.innerHTML = html;
}

/**
 * ipScrollToSection(cat)
 * Scrolls the picker body to the given category section.
 */
function ipScrollToSection(cat) {
  var sec = document.getElementById('ip-sec-' + cat);
  var body = document.getElementById('ipBody');
  if (sec && body) {body.scrollTop = sec.offsetTop - body.offsetTop;}
}

/** HTML-escape helper for item picker strings. */
function _escIp(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
