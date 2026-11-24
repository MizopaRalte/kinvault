CREATE TABLE IF NOT EXISTS trees (
  id TEXT PRIMARY KEY,
  invite_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL,
  family_name TEXT NOT NULL,
  branch_color TEXT NOT NULL DEFAULT '#0F172A',
  address_line TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT DEFAULT '',
  family_photo_b64 TEXT DEFAULT '',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL,
  household_id TEXT,
  full_name TEXT NOT NULL,
  nickname_or_maiden TEXT DEFAULT '',
  phone_e164 TEXT DEFAULT '',
  birth_year TEXT DEFAULT '',
  death_year TEXT DEFAULT '',
  is_living INTEGER NOT NULL DEFAULT 1,
  avatar_b64 TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member', -- 'super_admin' | 'branch_admin' | 'member'
  claimed_device_id TEXT DEFAULT '',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL,
  person_a_id TEXT NOT NULL,
  person_b_id TEXT NOT NULL,
  rel_type TEXT NOT NULL, -- 'parent_child' (a = parent, b = child) | 'spouse'
  FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
  FOREIGN KEY (person_a_id) REFERENCES persons(id) ON DELETE CASCADE,
  FOREIGN KEY (person_b_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_households_tree ON households(tree_id);
CREATE INDEX IF NOT EXISTS idx_persons_tree ON persons(tree_id);
CREATE INDEX IF NOT EXISTS idx_rel_tree ON relationships(tree_id);
