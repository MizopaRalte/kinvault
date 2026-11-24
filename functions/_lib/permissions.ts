// Recursive descendant graph check for WhatsApp-style Branch Admin RBAC

export interface DbPerson {
  id: string;
  tree_id: string;
  household_id: string | null;
  full_name: string;
  nickname_or_maiden: string | null;
  phone_e164: string | null;
  birth_year: string | null;
  death_year: string | null;
  is_living: number;
  avatar_b64: string | null;
  role: 'super_admin' | 'branch_admin' | 'member';
  claimed_device_id: string | null;
  updated_at: number;
}

export interface DbRelationship {
  id: string;
  tree_id: string;
  person_a_id: string;
  person_b_id: string;
  rel_type: 'parent_child' | 'spouse';
}

export interface DbHousehold {
  id: string;
  tree_id: string;
  family_name: string;
  branch_color: string;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  family_photo_b64: string | null;
  updated_at: number;
}

/**
 * Traverses relationships downward from all persons in the given starting person's household,
 * finding all descendant person IDs and their household IDs.
 */
export async function getDescendantScope(
  db: D1Database,
  treeId: string,
  rootPerson: DbPerson
): Promise<{ allowedPersonIds: Set<string>; allowedHouseholdIds: Set<string> }> {
  const allowedPersonIds = new Set<string>();
  const allowedHouseholdIds = new Set<string>();

  if (rootPerson.household_id) {
    allowedHouseholdIds.add(rootPerson.household_id);
  }
  allowedPersonIds.add(rootPerson.id);

  // Fetch all persons and relationships in this tree for in-memory graph traversal
  const [personsResult, relsResult] = await Promise.all([
    db.prepare('SELECT id, household_id FROM persons WHERE tree_id = ?').bind(treeId).all<{ id: string; household_id: string | null }>(),
    db.prepare('SELECT person_a_id, person_b_id, rel_type FROM relationships WHERE tree_id = ?').bind(treeId).all<{ person_a_id: string; person_b_id: string; rel_type: string }>()
  ]);

  const persons = personsResult.results || [];
  const rels = relsResult.results || [];

  const personHouseholdMap = new Map<string, string | null>();
  for (const p of persons) {
    personHouseholdMap.set(p.id, p.household_id);
    if (rootPerson.household_id && p.household_id === rootPerson.household_id) {
      allowedPersonIds.add(p.id);
    }
  }

  // Children adjacency: parentId -> [childId]
  const childrenMap = new Map<string, string[]>();
  // Spouse adjacency: personId -> [spouseId]
  const spouseMap = new Map<string, string[]>();

  for (const r of rels) {
    if (r.rel_type === 'parent_child') {
      const existing = childrenMap.get(r.person_a_id) || [];
      existing.push(r.person_b_id);
      childrenMap.set(r.person_a_id, existing);
    } else if (r.rel_type === 'spouse') {
      const aSpouses = spouseMap.get(r.person_a_id) || [];
      aSpouses.push(r.person_b_id);
      spouseMap.set(r.person_a_id, aSpouses);

      const bSpouses = spouseMap.get(r.person_b_id) || [];
      bSpouses.push(r.person_a_id);
      spouseMap.set(r.person_b_id, bSpouses);
    }
  }

  // BFS queue starting with all members in the root person's household
  const queue: string[] = Array.from(allowedPersonIds);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const hId = personHouseholdMap.get(currentId);
    if (hId) {
      allowedHouseholdIds.add(hId);
    }

    // Include spouses
    const spouses = spouseMap.get(currentId) || [];
    for (const spId of spouses) {
      if (!allowedPersonIds.has(spId)) {
        allowedPersonIds.add(spId);
        const spHId = personHouseholdMap.get(spId);
        if (spHId) allowedHouseholdIds.add(spHId);
        queue.push(spId);
      }
    }

    // Traverse downward to children
    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      if (!allowedPersonIds.has(childId)) {
        allowedPersonIds.add(childId);
        const childHId = personHouseholdMap.get(childId);
        if (childHId) allowedHouseholdIds.add(childHId);
        queue.push(childId);
      }
    }
  }

  return { allowedPersonIds, allowedHouseholdIds };
}

/**
 * Checks if caller can modify a specific person
 * Super admin can do all to all family.
 * Invited users and members can add their family and edit.
 */
export async function canEditPerson(
  db: D1Database,
  treeId: string,
  caller: DbPerson | null,
  targetPersonId: string
): Promise<boolean> {
  // Super admin has full control over all persons in the tree
  if (caller?.role === 'super_admin') return true;

  // Branch admin can edit within their descendant scope
  if (caller?.role === 'branch_admin') {
    const { allowedPersonIds } = await getDescendantScope(db, treeId, caller);
    if (allowedPersonIds.has(targetPersonId)) return true;
  }

  // All authenticated invited users and members can add their family and edit
  return true;
}

/**
 * Checks if caller can modify a specific household
 * Super admin can do all to all family.
 * Invited users and members can edit household details.
 */
export async function canEditHousehold(
  db: D1Database,
  treeId: string,
  caller: DbPerson | null,
  targetHouseholdId: string
): Promise<boolean> {
  // Super admin has full control over all households in the tree
  if (caller?.role === 'super_admin') return true;

  // Branch admin can edit within their descendant scope
  if (caller?.role === 'branch_admin') {
    const { allowedHouseholdIds } = await getDescendantScope(db, treeId, caller);
    if (allowedHouseholdIds.has(targetHouseholdId)) return true;
  }

  // All authenticated invited users and members can edit household details
  return true;
}

/**
 * Checks if caller can promote/demote a target person's role
 */
export async function canManageRole(
  db: D1Database,
  treeId: string,
  caller: DbPerson | null,
  targetPersonId: string,
  newRole: string
): Promise<boolean> {
  if (!caller) return false;
  if (caller.role === 'super_admin') return true;

  // Branch admin can promote descendants to branch_admin or member, but never to super_admin
  if (caller.role === 'branch_admin') {
    if (newRole === 'super_admin') return false;
    const { allowedPersonIds } = await getDescendantScope(db, treeId, caller);
    return allowedPersonIds.has(targetPersonId) && targetPersonId !== caller.id;
  }

  return false;
}

/**
 * Checks if caller can delete a person or household
 */
export async function canDeleteNode(
  db: D1Database,
  treeId: string,
  caller: DbPerson | null,
  type: 'person' | 'household',
  targetId: string
): Promise<boolean> {
  if (!caller) return false;
  if (caller.role === 'super_admin') return true;

  if (caller.role === 'branch_admin') {
    const { allowedPersonIds, allowedHouseholdIds } = await getDescendantScope(db, treeId, caller);
    if (type === 'person') {
      // Cannot delete self or root of own branch
      if (targetId === caller.id) return false;
      return allowedPersonIds.has(targetId);
    } else {
      // Cannot delete own immediate household
      if (targetId === caller.household_id) return false;
      return allowedHouseholdIds.has(targetId);
    }
  }

  // Members cannot delete nodes
  return false;
}
