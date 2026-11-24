export type Role = 'super_admin' | 'branch_admin' | 'member';

export interface Tree {
  id: string;
  invite_code: string;
  name: string;
  created_at: number;
}

export interface Household {
  id: string;
  tree_id: string;
  family_name: string;
  branch_color: string;
  address_line?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  family_photo_b64?: string;
  updated_at: number;
}

export interface Person {
  id: string;
  tree_id: string;
  household_id: string | null;
  full_name: string;
  nickname_or_maiden?: string;
  phone_e164?: string;
  birth_year?: string;
  death_year?: string;
  is_living: number; // 1 = living, 0 = deceased
  avatar_b64?: string;
  role: Role;
  claimed_device_id?: string;
  updated_at: number;
}

export type RelationshipType = 'parent_child' | 'spouse';

export interface Relationship {
  id: string;
  tree_id: string;
  person_a_id: string; // Parent or Spouse 1
  person_b_id: string; // Child or Spouse 2
  rel_type: RelationshipType;
}

export interface TreeData {
  tree: Tree;
  households: Household[];
  persons: Person[];
  relationships: Relationship[];
}

export interface UserSession {
  token: string;
  treeId: string;
  inviteCode: string;
  treeName: string;
  deviceId: string;
  activePersonId?: string;
  role?: Role;
}
