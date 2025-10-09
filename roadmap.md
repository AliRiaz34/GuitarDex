## DONT FOCUS ON LOOKS, PURE FUNCITIONALITY FOR NOW

### NEXT UP


## ⚙️ PHASE 1 — Core CRUD & Rating System

**Goal:** Be able to add songs, log plays, and auto-update ratings.

**Tasks:**

1. **Song CRUD**
   - Create routes: `/songs`, `/song/<id>`, `/add-song`, `/edit-song/<id>`, `/delete-song/<id>`
   - Forms for adding/editing songs (title, artist, rating, notes)
2. **Play Logging**
   - Add `/song/<id>/log-play` route → adds new `PlayEvent`
   - When logging a play, update `last_played` + apply rating gain (`apply_play`)
3. **Rating Decay**
   - On any song list or detail load:
      call `decay_rating()` based on days since `last_played`
   - Save the new rating automatically after decay
4. **Display**
   - Show rating and “last played X days ago” on the list
   - Color-code rating (1–3 red, 4–6 yellow, 7–10 green)

✅ **Deliverable:**
 Functional personal tracker: add songs, log practice, ratings go up and down automatically.

------

## 🎛️ PHASE 2 — Sorting, Filtering, and “Stale Songs”

**Goal:** Turn it from a data log into a tool that helps you *practice smarter.*

**Tasks:**

1. Add filters & sorting on `/songs`:
   - Sort by rating, last played, title
   - Filter by tag or “needs refresh”
2. Add computed property:
   - `days_since_last_played`
   - `staleness_score = days_since * (1 + (10 - rating)/10)`
3. Create a new route `/refresh` showing:
   - Top 10 “stale” songs (highest staleness score)
   - “Add to Refresh Playlist” button next to each

✅ **Deliverable:**
 Dashboard shows which songs to revisit soon — the first “smart” feature.

------

## 🧩 PHASE 3 — Playlists

**Goal:** Support both manual and automatic playlists.

**Tasks:**

1. Create a `Playlist` model (name, description, list of song IDs)
2. Add CRUD routes for playlists
3. Manual playlist UI:
   - Add/remove songs, reorder
4. Auto playlist generator:
   - “Generate Refresh Playlist” button creates one from top stale songs
   - Store as a playlist entry
5. Playlist view: `/playlist/<id>` shows song list with play buttons

✅ **Deliverable:**
 Can make playlists — either manual or auto-generated — and use them for daily practice sessions.

------

## 🧠 PHASE 4 — Insights & Quality of Life

**Goal:** Start making the app feel like a real companion.

**Tasks:**

1. Practice stats:
   - Graph rating history per song (use Chart.js)
   - Show total plays, avg rating trend
2. Notes/Tags:
   - Add “tags” field to songs (comma separated)
   - Filter songs by tag (e.g. “fingerstyle”, “metal”)
3. Improve UI:
   - Add navbar, icons, collapsible menus
   - Dark mode (optional)
4. Add export/import (JSON or CSV)
   - `/export` → download all songs & events
   - `/import` → upload to restore

✅ **Deliverable:**
 Feels more like a *practice log app*, not just a database.

------

## 💾 PHASE 5 — Persistence, Backup, and Polish

**Goal:** Make it durable and mobile-friendly.

**Tasks:**

1. Add **Flask-Login** and user accounts (optional if single-user now)
2. Move database from local SQLite to a cloud Postgres (optional)
3. Add **PWA support**:
   - Manifest.json + service worker → installable on phone
   - Offline cache for static files
4. Responsive layout for phone-sized screens
5. Simple “daily reminder” logic (can be local notifications later)

✅ **Deliverable:**
 Installable app that works offline and syncs automatically.

------

## 🚀 PHASE 6 — (Optional) Expansion / Mobile Conversion

**Goal:** Wrap into an actual iPhone/Android app.

**Paths:**

- **A)** PWA route → already installable
- **B)** Wrap with **Capacitor** or **Tauri** → packaged mobile app
- **C)** Use your Flask backend as API and rebuild frontend in **React Native**

✅ **Deliverable:**
 “Guitardex” running as a mobile or hybrid app, same data and behavior.