# KinVault Architecture & Technical Specification

KinVault is a serverless, privacy-centric Progressive Web App (PWA) designed for collaborative genealogical archiving and multi-generational family reconnection.

```
                           +----------------------------------------+
                           |           Client (PWA / React)         |
                           |  - Offscreen Canvas WebP Compressor    |
                           |  - d3-hierarchy Panoramic Canvas       |
                           |  - PBKDF2 + AES-GCM .fam Vault         |
                           |  - IndexedDB Snapshot Offline Cache    |
                           |  - jsPDF + NotoSans Vector Generator   |
                           +-------------------+--------------------+
                                               |
                                     HTTPS / JSON / JWT
                                               |
                                               v
                           +----------------------------------------+
                           |  Cloudflare Pages Functions (V8 Edge)  |
                           |  - Web Crypto HMAC-SHA256 Token Auth   |
                           |  - Recursive Graph RBAC Permissions    |
                           |  - Sub-millisecond Global Routing      |
                           +-------------------+--------------------+
                                               |
                                        Direct Binding
                                               |
                                               v
                           +----------------------------------------+
                           |      Cloudflare D1 (Serverless SQL)    |
                           |  - trees (Invite code & hashed PIN)    |
                           |  - households (Branch color & photos)  |
                           |  - persons (Profiles & device claims)  |
                           |  - relationships (parent_child/spouse) |
                           +----------------------------------------+
```

---

## 1. Database Schema Design (Cloudflare D1 / SQLite)

### `trees`
- `id` (TEXT PRIMARY KEY): UUID identifying the family tree.
- `invite_code` (TEXT UNIQUE NOT NULL): 8-character uppercase alphanumeric code (excluding ambiguous `0/O/1/I`).
- `name` (TEXT NOT NULL): Display name of the family tree / lineage.
- `pin_hash` (TEXT NOT NULL): SHA-256 hash of `salt + ':' + pin`.
- `pin_salt` (TEXT NOT NULL): 16-byte cryptographically secure random hexadecimal salt.
- `created_at` (INTEGER NOT NULL): Epoch timestamp in milliseconds.

### `households`
- `id` (TEXT PRIMARY KEY): UUID of household cluster.
- `tree_id` (TEXT NOT NULL, FOREIGN KEY -> trees.id ON DELETE CASCADE).
- `family_name` (TEXT NOT NULL): Household title (e.g. "Sailo Family").
- `branch_color` (TEXT NOT NULL DEFAULT '#0F172A'): Hex color code applied as visual grouping border.
- `address_line`, `city`, `postal_code`, `country`: Physical location fields for Google Maps lookup.
- `family_photo_b64`: Compressed WebP photo string (max 1280px, ~90–140 KB).
- `updated_at`: Epoch timestamp.

### `persons`
- `id` (TEXT PRIMARY KEY): UUID of person.
- `tree_id` (TEXT NOT NULL, FOREIGN KEY -> trees.id ON DELETE CASCADE).
- `household_id` (TEXT, FOREIGN KEY -> households.id ON DELETE SET NULL).
- `full_name` (TEXT NOT NULL): Primary name.
- `nickname_or_maiden`: Maiden name or clan nickname.
- `phone_e164`: Standardized international E.164 phone number.
- `birth_year`, `death_year`: Dates formatted as 4-digit years.
- `is_living` (INTEGER NOT NULL DEFAULT 1): 1 for living, 0 for deceased.
- `avatar_b64`: Square compressed WebP avatar (300 × 300 px, ~15–25 KB).
- `role`: Role string (`'super_admin'` | `'branch_admin'` | `'member'`).
- `claimed_device_id`: UUID of device that claimed this profile.
- `updated_at`: Epoch timestamp.

### `relationships`
- `id` (TEXT PRIMARY KEY): UUID of link.
- `tree_id` (TEXT NOT NULL, FOREIGN KEY -> trees.id ON DELETE CASCADE).
- `person_a_id` (TEXT NOT NULL, FOREIGN KEY -> persons.id ON DELETE CASCADE): Parent or Spouse 1.
- `person_b_id` (TEXT NOT NULL, FOREIGN KEY -> persons.id ON DELETE CASCADE): Child or Spouse 2.
- `rel_type` (TEXT NOT NULL): `'parent_child'` or `'spouse'`.

---

## 2. WhatsApp-Style Branch Admin RBAC Model

Permission checks are enforced on every mutation at the Edge ([functions/_lib/permissions.ts](file:///e:/kinvault/functions/_lib/permissions.ts)):

1. **Super Admin (Tree Creator):**
   - Unrestricted CRUD on all households, persons, and relationships across the tree.
   - Can promote or demote any person to `branch_admin`.
   - Can change the 6-digit family PIN.
   - Can initiate a full database restore from a `.fam` backup.

2. **Branch Admin:**
   - Evaluated by recursive graph traversal downward from the caller's household.
   - Discovers all children where `person_a_id IN (descendants) AND rel_type = 'parent_child'`, their spouses, and their associated households.
   - Can create, edit, or delete members and households within this scope.
   - Can promote descendants to `branch_admin`.
   - Cannot edit or delete ancestors or sibling branches.

3. **Member:**
   - Can claim an unclaimed profile matching their device identifier.
   - Can edit their own profile, direct children, and immediate household.
   - Can add spouses and children under themselves.
   - Can retroactively add missing parents/ancestors *above* an ancestor.
   - Cannot delete branches or promote admins.

---

## 3. Cryptography & Vault Security

### PIN Verification & JWT Signing
- 6-digit family PINs are salted with 16 cryptographically secure random bytes and hashed using `SHA-256`.
- Authentication generates an HMAC-SHA256 JSON Web Token (JWT) valid for 365 days containing `{ treeId, deviceId, exp }`.
- Tokens are verified on every API request using timing-safe constant-time string comparisons.

### Offline `.fam` Backup Encryption
- Exported payloads serialize all tree metadata, households, persons, and embedded WebP photos into JSON.
- A 256-bit AES-GCM key is derived from the user's chosen backup password using `PBKDF2` (100,000 iterations, SHA-256, 16-byte salt).
- The payload is encrypted with a unique 12-byte initialization vector (IV) and exported as a single binary `.fam` file `[salt (16b) | iv (12b) | ciphertext]`.
