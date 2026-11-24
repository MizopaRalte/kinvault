# KinVault - Collaborative Family Tree & Reconnection PWA

<div align="center">

![KinVault Banner](https://img.shields.io/badge/Status-Production%20Ready-emerald?style=for-the-badge)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages%20Functions-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1-F38020?style=for-the-badge&logo=sqlite&logoColor=white)
![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)

### 🌐 **Live Website:** [https://kin-vault.pages.dev](https://kin-vault.pages.dev)

</div>

---

## 📖 Overview

**KinVault** is a privacy-first, serverless Progressive Web App (PWA) engineered for family tree building, ancestral preservation, and rapid family reconnection. It operates entirely on Cloudflare's serverless edge infrastructure with Cloudflare D1 for distributed SQL storage.

---

## ✨ Features

- **Tree Canvas (Pan & Zoom):** Interactive panoramic hierarchy powered by `d3-hierarchy` that arranges households with orthogonal connector lines, branch color accents, collapsible branches, and living/deceased indicators.
- **WhatsApp-Style RBAC:** Hierarchical permissions where branch administrators have scoped authority downward over their descendants without access to sibling branches or ancestors.
- **Reconnection Directory:** Instant lookup by name, clan nickname, city, or phone number with 1-tap **Call (`tel:`)**, **WhatsApp (`wa.me`)**, and **Google Maps** buttons.
- **Client-Side Photo Compression:** Automatically center-crops personal avatars to square 300 × 300 px (~15–25 KB) and family photos to max width 1280 px (~90–140 KB) using HTML5 Offscreen Canvas before transmission.
- **Panoramic Vector PDF Export:** Bypasses A4 constraints by calculating exact bounding box coordinates and registers `NotoSans-Regular.ttf` for true glyph fidelity across Mizo (`ṭ`/`Ṭ`), German (`ä/ö/ü/ß`), and Spanish (`ñ`).
- **Encrypted `.fam` Vault Backup:** Client-side PBKDF2 (100,000 iterations) + AES-256-GCM encryption with random salt and IV for local and cloud backups.
- **PWA & Offline Snapshot:** Caches data in IndexedDB for immediate offline viewing and provides an optional 4-digit **Device App Lock PIN** for shared devices.
- **4-Language Native Localization:** Full translations for English (`en`), Mizo (`mz`), Spanish (`es`), and German (`de`).

---

## 🏛️ Project Structure

```text
kinvault/
├── docs/
│   ├── ARCHITECTURE.md        # Deep dive into system design, schema, and RBAC
│   └── API.md                 # Complete REST API reference
├── functions/
│   ├── _lib/
│   │   ├── crypto.ts          # PIN hashing (SHA-256 + salt) & HMAC-SHA256 JWT
│   │   └── permissions.ts     # Recursive descendant graph RBAC check
│   └── api/
│       ├── tree/create.ts     # POST: Creates tree, root household, creator profile
│       ├── auth.ts            # POST: PIN verification & device claim lookup
│       ├── tree.ts            # GET: Complete tree metadata, households, persons
│       ├── mutate.ts          # POST: Role-enforced graph mutations
│       └── restore.ts         # POST: Super Admin batch restore from .fam file
├── public/
│   ├── fonts/
│   │   └── NotoSans-Regular.ttf # Universal TrueType font
│   ├── favicon.svg            # App icon
│   ├── pwa-192x192.png        # PWA standalone icon
│   └── pwa-512x512.png        # PWA maskable icon
├── src/
│   ├── locales/translations.ts# EN, Mizo, ES, and DE localization dictionaries
│   ├── types/family.ts        # Shared TypeScript interfaces
│   ├── utils/
│   │   ├── imageCompress.ts   # Client-side WebP canvas compressor
│   │   ├── cryptoVault.ts     # AES-256-GCM + PBKDF2 .fam encryption
│   │   ├── offlineCache.ts    # IndexedDB cache & App Lock PIN
│   │   └── pdfExport.ts       # jsPDF panoramic vector PDF generator
│   └── components/
│       ├── OnboardingView.tsx # Onboarding & invite code PIN join
│       ├── TreeCanvas.tsx     # d3-hierarchy canvas
│       ├── DirectoryView.tsx  # Searchable directory with 1-tap actions
│       ├── MemberModal.tsx    # Member & household editor
│       ├── ShareModal.tsx     # Invite link, PIN, and WhatsApp share
│       └── BackupModal.tsx    # Password-encrypted backup & restore
├── schema.sql                 # D1 SQL Schema
└── wrangler.toml              # Cloudflare Pages and D1 configuration
```

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Migrations
```bash
npx wrangler d1 execute kinvault-db --local --file=./schema.sql
```

### 3. Build & Typecheck
```bash
npm run build
```

### 4. Start Local Development Server
```bash
npx wrangler pages dev --port 8788
```
Open [http://localhost:8788](http://localhost:8788) in your browser.

---

## 🚀 Cloudflare Deployment

### 1. Create Cloudflare D1 Database
```bash
npx wrangler d1 create kinvault-db
```

### 2. Apply Schema to Production D1
```bash
npx wrangler d1 execute kinvault-db --remote --file=./schema.sql
```

### 3. Deploy Pages Project
```bash
npx wrangler pages deploy dist --project-name=kin-vault --branch=main
```

---

## 📜 Documentation

- [System Architecture & RBAC](docs/ARCHITECTURE.md)
- [REST API Reference](docs/API.md)

---

## 🔒 Privacy & License

KinVault does not include any third-party tracking scripts or advertising SDKs. All data is encrypted in transit and at rest.
Licensed under the [Apache-2.0 License](LICENSE).
