# KinVault REST API Reference

All API endpoints are hosted on Cloudflare Pages Functions under `/api/`.

---

## 1. Create Tree
**`POST /api/tree/create`**

Creates a new family tree, root household, and creator profile (`super_admin`).

### Request Body
```json
{
  "treeName": "Sailo Clan Heritage",
  "creatorName": "Lalthanmawia Sailo",
  "pin": "123456",
  "deviceId": "c1f7601b-9e45-4fa2-bdae-5a7a92cfb940",
  "branchColor": "#0F172A",
  "city": "Aizawl",
  "country": "India"
}
```

### Response (`201 Created`)
```json
{
  "success": true,
  "treeId": "21196100-deb1-4875-bf5a-f9ddfbf8c1e9",
  "inviteCode": "ACCTXMGU",
  "personId": "0636f6ce-eb6a-40fb-b4c4-4c86fdeddb78",
  "householdId": "cdee3816-6633-4c81-b74e-8b86d8dc1bad",
  "token": "<HMAC-SHA256_JWT_TOKEN>"
}
```

---

## 2. Authenticate / Join Tree
**`POST /api/auth`**

Authenticates an existing tree member using the 8-character invite code and 6-digit PIN.

### Request Body
```json
{
  "inviteCode": "ACCTXMGU",
  "pin": "123456",
  "deviceId": "c1f7601b-9e45-4fa2-bdae-5a7a92cfb940"
}
```

### Response (`200 OK`)
```json
{
  "success": true,
  "tree": {
    "id": "21196100-deb1-4875-bf5a-f9ddfbf8c1e9",
    "name": "Sailo Clan Heritage",
    "inviteCode": "ACCTXMGU",
    "createdAt": 1732456800000
  },
  "claimedPerson": {
    "id": "0636f6ce-eb6a-40fb-b4c4-4c86fdeddb78",
    "full_name": "Lalthanmawia Sailo",
    "role": "super_admin"
  },
  "token": "<HMAC-SHA256_JWT_TOKEN>"
}
```

---

## 3. Get Full Family Tree
**`GET /api/tree`**

Fetches all households, persons, and relationships for the authenticated tree.

### Headers
```http
Authorization: Bearer <token>
```

### Response (`200 OK`)
```json
{
  "tree": { "id": "...", "name": "...", "invite_code": "..." },
  "households": [ ... ],
  "persons": [ ... ],
  "relationships": [ ... ]
}
```

---

## 4. Mutate Tree
**`POST /api/mutate`**

Performs role-enforced CRUD actions on the family tree graph.

### Headers
```http
Authorization: Bearer <token>
X-Person-Id: <caller_person_id>
```

### Supported Actions

#### `claim_profile`
```json
{
  "action": "claim_profile",
  "payload": { "personId": "0636f6ce-..." }
}
```

#### `add_child_household`
```json
{
  "action": "add_child_household",
  "payload": {
    "parentPersonId": "0636f6ce-...",
    "familyName": "Lalnunfela Family",
    "childFullName": "Lalnunfela Sailo",
    "spouseFullName": "Zothanpuii",
    "birthYear": "2005",
    "city": "Aizawl",
    "country": "India"
  }
}
```

#### `add_spouse`
```json
{
  "action": "add_spouse",
  "payload": {
    "personId": "0636f6ce-...",
    "spouseFullName": "Zothanpuii",
    "birthYear": "1988",
    "phoneE164": "+919876543210"
  }
}
```

#### `add_ancestors_above`
```json
{
  "action": "add_ancestors_above",
  "payload": {
    "personId": "0636f6ce-...",
    "fatherName": "Hmingthanga Sailo",
    "motherName": "Rochhingpuii",
    "familyName": "Senior Branch Household"
  }
}
```

#### `set_role`
```json
{
  "action": "set_role",
  "payload": {
    "targetPersonId": "...",
    "role": "branch_admin"
  }
}
```

---

## 5. Restore From Backup
**`POST /api/restore`**

Executes a full tree restore in D1 from an unencrypted `.fam` payload (Super Admin only).

### Headers
```http
Authorization: Bearer <token>
X-Person-Id: <super_admin_person_id>
```

### Request Body
```json
{
  "tree": { "id": "...", "name": "..." },
  "households": [ ... ],
  "persons": [ ... ],
  "relationships": [ ... ]
}
```
