<div align="center">

# ⚔️ Champions Forge

**A mobile-first competitive team-building PWA for Pokémon Champions.**

[Live app](https://otterlyclueless.github.io/champions-forge/) · [Admin](https://otterlyclueless.github.io/champions-forge/admindb.html)

[![Support on Ko-fi](icons/kofi-badge.svg)](https://ko-fi.com/otterlyclueless)

![PWA](https://img.shields.io/badge/PWA-installable-4c51bf?style=flat-square)
![Stack](https://img.shields.io/badge/stack-vanilla_HTML_JS_CSS-f59e0b?style=flat-square)
![Backend](https://img.shields.io/badge/backend-Supabase-3ecf8e?style=flat-square)
![Mobile](https://img.shields.io/badge/designed_for-iPhone-ef4444?style=flat-square)

</div>

---

## What is Champions Forge?

Champions Forge helps competitive trainers **plan their squad before battle**. Every calculation uses the exact **Pokémon Champions** ruleset — Lv50 fixed, IVs maxed at 31, 66 SP total (32 per stat), with proper nature modifiers. Numbers you see in the app are the numbers you'll see in-game.

It's a Progressive Web App — installable on your phone home screen, works offline for cached content, and syncs competitive builds + team rosters to Supabase when you're online.

## ✨ Features

### Pokédex
- 258 Pokémon with search, type/form/obtained filters, shiny toggle
- Bottom-sheet detail panel with stat calculator (bars + hex view)
- Holographic shiny card variants
- Obtained / shiny tracking with Pokédex progress bar

### Builds
- Full CRUD with a 2-step mobile editor (Pokémon picker → form)
- Live Lv50 stat calculator — bars and hex radar views
- **22 standardised archetypes** (Physical Sweeper, Trick Room Setter, Pivot, etc.) with colour-coded chip picker and **✨ auto-suggest** based on moves + base stats
- Bottom-sheet pickers for ability, nature, item, moves, and archetype (incl. custom entry)
- Species-locked item enforcement (Light Ball, Mega Stones)
- Showdown plaintext export
- Favourites, public sharing, and share-image card generation

### Teams
- Roster builder (configurable slot count, 1–6)
- **Team Identity** — icon (12 options), colour theme (8 palettes), archetype label
- Type coverage analyser with offensive hits + defensive weaknesses
- Battle-log tracking with win/loss/draw record
- Public sharing with optional type coverage toggle on the share page

### Reference
- **Archetypes** — searchable glossary of all 22 competitive roles for new players
- **Abilities** — full list with category filter and per-Pokémon view
- **Natures** — all 25 with colour-coded stat EQ bars

### Social
- Friends system — add by username, QR code sharing, pending requests
- Public profiles at `#/u/username` with public build listings
- Likes on public builds and teams
- Activity feed on the Home dashboard (friends' builds, teams, achievements, likes)

### Profile
- Trainer card with avatar upload and display name
- Social stats — Friends, Likes Received, Public Builds, Public Teams
- **Achievement system** — 50+ achievements across 11 categories with progress bars and unlock dates
- Achievement filters: All / Unlocked / Locked / Nearly There
- Collapsible sections (Achievements, Recent Activity, Account)
- Clickable activity items — open builds or teams directly from profile; back returns to profile
- Account section with separate Danger Zone for destructive actions

### App shell
- **Light + dark themes** — toggle in sidebar (desktop) or More sheet (mobile), preference saved across sessions
- **Smart back navigation** — back button remembers whether you came from Home, Profile, or the list
- Bottom-centre toast notifications (mobile) with Phosphor icons
- Mobile: bottom tab bar (Home, Pokédex, Builds, Teams, More)
- Desktop: collapsible sidebar
- Offline-capable via Service Worker
- **PWA** — installs to home screen, standalone mode with full safe-area handling

## 🎮 Competitive ruleset (matches Pokémon Champions)

```
Level 50        fixed for all battles
IVs             maxed at 31 (no breeding/grinding system)
1 SP            = +1 stat at Lv50 (no EV/4 conversion)
66 SP total     32 max per stat
HP              floor((2 × base + 31) × 50/100) + 60 + SP
Other stats     floor((floor((2 × base + 31) × 50/100) + 5) × nature_mod) + SP
Nature mods     1.1 increased / 0.9 decreased / 1.0 neutral
```

## 📐 Design system

| | |
|---|---|
| **Font** | Plus Jakarta Sans 400–900 (Google Fonts) |
| **Icon system** | [Phosphor Icons](https://phosphoricons.com) v2.1.1 (regular + bold + duotone + fill) |
| **Stat palette** | HP violet · Atk orange / SpA peach · Def blue / SpD sky · Spe rose |
| **Nature indicators** | Green ▲ / Red ▼ (deliberately avoids stat palette collision) |
| **BST tiers** | <400 red · 400–499 gold · 500–599 green · 600+ teal |
| **Archetype colours** | 22 unique colours, one per role — threaded via `--ac` CSS custom property |
| **Touch targets** | 44×44pt minimum, `env(safe-area-inset-*)` aware |

## 🛠 Stack

- **Frontend** — Vanilla HTML/JS/CSS PWA, **no framework, no build step**
- **Modular JS** — `app/app-core.js` (shared utils + auth) · `-dashboard` · `-pokedex` · `-builds` · `-teams` · `-profile` · `-pickers` · `-router` · `-init` (bootstrap)
- **Backend** — [Supabase](https://supabase.com) (PostgreSQL + Row-Level Security + Auth)
- **Auth** — email/password, instant activation (no confirmation step), refresh-token flow via `authFetch()` wrapper
- **Hosting** — GitHub Pages (auto-deploys from `main`)

## 📊 Database

17 tables in the `public` schema, all with Row-Level Security:

| Category | Tables |
|---|---|
| Core data | `pokemon` (258) · `moves` (900) · `abilities` (191) · `items` (117) · `natures` (25) · `pokemon_moves` (16,450) |
| User-scoped | `user_profiles` · `user_items` · `user_achievements` · `user_pokedex` |
| Build / team | `builds` · `team_builds` (junction) · `team_roster` (view) · `teams` |
| Social | `friends` · `build_likes` · `team_likes` |
| System | `achievements` · `battle_log` |

## 🚀 Running locally

No build step, no package install.

```bash
git clone https://github.com/otterlyclueless/champions-forge.git
cd champions-forge

# VS Code Live Server (easiest):
#   Right-click index.html → "Open with Live Server"

# Or Python:
python3 -m http.server 5500
# Visit http://localhost:5500
```

To fork against your own Supabase project:

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL migrations (see `sql/` directory)
3. Replace `API` + `ANON` at the top of `app/app-core.js` with your project URL + anon key
4. Import reference data via the admin panel or direct SQL

## 🗺 Roadmap

- **Desktop polish** — wider layouts, multi-column builds/teams list, improved sidebar use of space
- **Email** — Resend integration for proper transactional emails (password reset, notifications)
- **Share image edge function** — server-side Puppeteer rendering to replace client-side html-to-image
- **Build import** — paste Showdown format to auto-populate a build
- **Battle formats** — BO3 series tracking, opponent team logging

## 🙏 Credits

- Sprite data: [PokéAPI](https://pokeapi.co)
- Render data: [Serebii.net](https://www.serebii.net)
- Icon system: [Phosphor Icons](https://phosphoricons.com)
- Font: [Plus Jakarta Sans](https://tokotype.github.io/plusjakarta-sans/)
- Backend: [Supabase](https://supabase.com)

## 📜 Disclaimer

This is a **personal fan-made tool** for the Pokémon Champions competitive community. Not affiliated with, endorsed by, or sponsored by Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company.

Pokémon and all related marks are © Nintendo / Creatures Inc. / GAME FREAK inc.

## 🔒 License

Copyright © 2026 [otterlyclueless](https://github.com/otterlyclueless). All rights reserved.

Source is provided publicly for transparency and community inspection. You are welcome to study the code, submit issues, or discuss features. **Copying, redistribution, or commercial use of the source code without explicit written permission is not permitted.**

---

<div align="center">

_Forge your competitive squad._ ⚔️

[![Support on Ko-fi](icons/kofi-badge.svg)](https://ko-fi.com/championsforge)

</div>
