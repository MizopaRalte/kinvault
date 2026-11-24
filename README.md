# KinVault - Collaborative Family Tree & Reconnection PWA

**KinVault** is a production-ready Progressive Web App (PWA) built for collaborative family trees, ancestral preservation, and family reconnection across generations. Designed specifically for **Cloudflare Pages + Cloudflare Pages Functions + Cloudflare D1**.

---

## 🌟 Key Features

1. **WhatsApp-Style Collaborative Role-Based Access Control (RBAC):**
   - **Super Admin (Tree Creator):** Full authority across all branches, promote/demote admins, update family PIN, and execute full cloud restores from encrypted `.fam` backups.
   - **Branch Admin:** Recursive downward permission over their household and all direct descendants.
   - **Member:** Can claim their profile by device, edit personal details, add spouses and children under themselves, and add missing ancestors *above* existing ancestors.

2. **Dual Perspective Views:**
   - **Interactive Tree Canvas:** Infinite pan & zoom canvas powered by `d3-hierarchy` to render non-overlapping household cards, orthogonal connector lines, branch colors, living/deceased indicators, and retroactive ancestor insertion.
   - **Reconnection Directory:** Searchable by name, maiden/nickname, city, country, or phone with instant filter pills for branch colors and cities. Includes 1-tap **Call**, **WhatsApp**, and **Google Maps** buttons.

3. **Multi-Language Support:**
   - Full native localization for **English (`en`)**, **Mizo (`mz`)** with proper diacritics (*Chhungkaw Ziarang, Thlahtute, Biakpawhna*), **Spanish (`es`)**, and **German (`de`)**.

4. **Client-Side Media Compression:**
   - Canvas-based WebP compression:
     - **Personal Avatar:** Center-cropped square 300 × 300 px (~15–25 KB).
     - **Family Household Photo:** Proportional max width 1280 px (~90–140 KB).
     - Live KB preview before uploading to Cloudflare D1.

5. **Panoramic Vector PDF Export:**
   - Computes true bounding box (`minX, minY, maxX, maxY`) across all expanded households with millimeter conversion.
   - Embeds `NotoSans-Regular.ttf` in the PDF VFS for complete glyph fidelity across Mizo (`ṭ/Ṭ`), German (`ä/ö/ü/ß`), and Spanish (`ñ`).

6. **Password-Protected `.fam` Vault Backup & Restore:**
   - AES-256-GCM encryption with 100,000 PBKDF2 iterations and random salt/IV.
   - Export and import all trees, households, members, and embedded photos into a single encrypted file for offline storage or Google Drive.

7. **PWA & Offline Capability:**
   - Fully installable PWA via `vite-plugin-pwa` with service worker caching.
   - Automatic snapshot caching in IndexedDB for seamless offline viewing.
   - 4-digit device **App Lock PIN** to secure family data on shared devices.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js 18+
- Cloudflare Wrangler CLI (`npm install -g wrangler` or use bundled `npx wrangler`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Local D1 Database
Execute the database schema on local D1:
```bash
npx wrangler d1 execute kinvault-db --local --file=schema.sql
```

### 4. Build Production Assets
```bash
npm run build
```

### 5. Start Local Cloudflare Pages Dev Server
```bash
npx wrangler pages dev --port 8788
```
Open [http://localhost:8788](http://localhost:8788) in your browser.

---

## ☁️ Cloudflare Deployment

### 1. Create Cloudflare D1 Database
```bash
npx wrangler d1 create kinvault-db
```
Copy the generated `database_id` into `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "kinvault-db"
database_id = "<YOUR_D1_DATABASE_ID>"
```

### 2. Apply Schema to Production D1
```bash
npx wrangler d1 execute kinvault-db --remote --file=schema.sql
```

### 3. Deploy to Cloudflare Pages
```bash
# Build the project
npm run build

# Deploy via Wrangler Pages
npx wrangler pages deploy dist --project-name=kinvault
```
Set the environment variable `JWT_SECRET` in the Cloudflare Pages dashboard under **Settings > Environment variables** (or via Wrangler secret).
