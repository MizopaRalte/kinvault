import { hashPin, verifyJwt } from '../_lib/crypto';
import {
  canDeleteNode,
  canEditHousehold,
  canEditPerson,
  canManageRole,
  DbHousehold,
  DbPerson,
} from '../_lib/permissions';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyJwt(token, env.JWT_SECRET);
    if (!tokenPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { treeId, deviceId } = tokenPayload;
    const activePersonId = request.headers.get('X-Person-Id');

    // Find caller person
    let caller: DbPerson | null = null;
    if (activePersonId) {
      caller = await env.DB.prepare(
        'SELECT * FROM persons WHERE id = ? AND tree_id = ?'
      )
        .bind(activePersonId, treeId)
        .first<DbPerson>();
    }

    if (!caller) {
      caller = await env.DB.prepare(
        'SELECT * FROM persons WHERE tree_id = ? AND claimed_device_id = ? LIMIT 1'
      )
        .bind(treeId, deviceId)
        .first<DbPerson>();
    }

    const body = (await request.json()) as {
      action: string;
      payload: any;
    };

    const action = body.action;
    const p = body.payload || {};
    const now = Date.now();

    switch (action) {
      case 'claim_profile': {
        const personId = p.personId as string;
        if (!personId) {
          return new Response(JSON.stringify({ error: 'Person ID required to claim profile.' }), { status: 400 });
        }

        const target = await env.DB.prepare('SELECT * FROM persons WHERE id = ? AND tree_id = ?')
          .bind(personId, treeId)
          .first<DbPerson>();

        if (!target) {
          return new Response(JSON.stringify({ error: 'Person not found.' }), { status: 404 });
        }

        // Check if already claimed by someone else
        if (target.claimed_device_id && target.claimed_device_id !== deviceId) {
          if (!caller || caller.role !== 'super_admin') {
            return new Response(
              JSON.stringify({ error: 'This profile is already claimed by another device.' }),
              { status: 403 }
            );
          }
        }

        // Remove any previous claimed profile for this device in this tree
        await env.DB.prepare(
          'UPDATE persons SET claimed_device_id = "" WHERE tree_id = ? AND claimed_device_id = ?'
        )
          .bind(treeId, deviceId)
          .run();

        // Claim target
        await env.DB.prepare(
          'UPDATE persons SET claimed_device_id = ?, updated_at = ? WHERE id = ? AND tree_id = ?'
        )
          .bind(deviceId, now, personId, treeId)
          .run();

        const updatedPerson = await env.DB.prepare('SELECT * FROM persons WHERE id = ?')
          .bind(personId)
          .first<DbPerson>();

        return new Response(JSON.stringify({ success: true, person: updatedPerson }), { status: 200 });
      }

      case 'upsert_household': {
        const id = p.id || crypto.randomUUID();
        const familyName = p.family_name?.trim();
        const branchColor = p.branch_color || '#0F172A';
        const addressLine = p.address_line || '';
        const city = p.city || '';
        const postalCode = p.postal_code || '';
        const country = p.country || '';
        const familyPhotoB64 = p.family_photo_b64 || '';

        if (!familyName) {
          return new Response(JSON.stringify({ error: 'Family name is required.' }), { status: 400 });
        }

        // Check permission if updating existing household
        if (p.id) {
          const hasPerm = await canEditHousehold(env.DB, treeId, caller, p.id);
          if (!hasPerm) {
            return new Response(JSON.stringify({ error: 'Permission denied to edit this household.' }), { status: 403 });
          }

          await env.DB.prepare(
            `UPDATE households SET family_name = ?, branch_color = ?, address_line = ?, city = ?, postal_code = ?, country = ?, family_photo_b64 = ?, updated_at = ?
             WHERE id = ? AND tree_id = ?`
          )
            .bind(familyName, branchColor, addressLine, city, postalCode, country, familyPhotoB64, now, id, treeId)
            .run();
        } else {
          // Creating brand new household
          if (!caller) {
            return new Response(JSON.stringify({ error: 'Must have a claimed profile to create a household.' }), { status: 403 });
          }

          await env.DB.prepare(
            `INSERT INTO households (id, tree_id, family_name, branch_color, address_line, city, postal_code, country, family_photo_b64, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(id, treeId, familyName, branchColor, addressLine, city, postalCode, country, familyPhotoB64, now)
            .run();
        }

        const household = await env.DB.prepare('SELECT * FROM households WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify({ success: true, household }), { status: 200 });
      }

      case 'upsert_person': {
        const id = p.id || crypto.randomUUID();
        const householdId = p.household_id || null;
        const fullName = p.full_name?.trim();
        const nicknameOrMaiden = p.nickname_or_maiden || '';
        const phoneE164 = p.phone_e164 || '';
        const birthYear = p.birth_year || '';
        const deathYear = p.death_year || '';
        const isLiving = p.is_living !== undefined ? (p.is_living ? 1 : 0) : 1;
        const avatarB64 = p.avatar_b64 || '';

        if (!fullName) {
          return new Response(JSON.stringify({ error: 'Full name is required.' }), { status: 400 });
        }

        if (p.id) {
          const hasPerm = await canEditPerson(env.DB, treeId, caller, p.id);
          if (!hasPerm) {
            return new Response(JSON.stringify({ error: 'Permission denied to edit this person.' }), { status: 403 });
          }

          await env.DB.prepare(
            `UPDATE persons SET household_id = ?, full_name = ?, nickname_or_maiden = ?, phone_e164 = ?, birth_year = ?, death_year = ?, is_living = ?, avatar_b64 = ?, updated_at = ?
             WHERE id = ? AND tree_id = ?`
          )
            .bind(householdId, fullName, nicknameOrMaiden, phoneE164, birthYear, deathYear, isLiving, avatarB64, now, id, treeId)
            .run();
        } else {
          // Creating person
          if (!caller) {
            return new Response(JSON.stringify({ error: 'Must have a claimed profile to add a person.' }), { status: 403 });
          }

          await env.DB.prepare(
            `INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'member', '', ?)`
          )
            .bind(id, treeId, householdId, fullName, nicknameOrMaiden, phoneE164, birthYear, deathYear, isLiving, avatarB64, now)
            .run();
        }

        const person = await env.DB.prepare('SELECT * FROM persons WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify({ success: true, person }), { status: 200 });
      }

      case 'add_child_household': {
        const parentPersonId = p.parentPersonId as string;
        const familyName = p.familyName?.trim();
        const childFullName = p.childFullName?.trim();
        const spouseFullName = p.spouseFullName?.trim();
        const birthYear = p.birthYear || '';
        const city = p.city || '';
        const country = p.country || '';

        if (!parentPersonId || !familyName || !childFullName) {
          return new Response(JSON.stringify({ error: 'Parent ID, family name, and child name are required.' }), { status: 400 });
        }

        // Permission check on parent
        const hasPerm = await canEditPerson(env.DB, treeId, caller, parentPersonId);
        if (!hasPerm) {
          return new Response(JSON.stringify({ error: 'Permission denied to add child under this person.' }), { status: 403 });
        }

        // Get parent's household to inherit branch color if not specified
        const parent = await env.DB.prepare('SELECT household_id FROM persons WHERE id = ?').bind(parentPersonId).first<DbPerson>();
        let inheritedColor = '#0F172A';
        if (parent?.household_id) {
          const parentH = await env.DB.prepare('SELECT branch_color FROM households WHERE id = ?').bind(parent.household_id).first<DbHousehold>();
          if (parentH?.branch_color) inheritedColor = parentH.branch_color;
        }

        const branchColor = p.branchColor || inheritedColor;
        const newHouseholdId = crypto.randomUUID();
        const childPersonId = crypto.randomUUID();
        const parentChildRelId = crypto.randomUUID();

        const batchStatements = [
          env.DB.prepare(
            `INSERT INTO households (id, tree_id, family_name, branch_color, address_line, city, postal_code, country, family_photo_b64, updated_at)
             VALUES (?, ?, ?, ?, '', ?, '', ?, '', ?)`
          ).bind(newHouseholdId, treeId, familyName, branchColor, city, country, now),
          env.DB.prepare(
            `INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at)
             VALUES (?, ?, ?, ?, '', '', ?, '', 1, '', 'member', '', ?)`
          ).bind(childPersonId, treeId, newHouseholdId, childFullName, birthYear, now),
          env.DB.prepare(
            `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
             VALUES (?, ?, ?, ?, 'parent_child')`
          ).bind(parentChildRelId, treeId, parentPersonId, childPersonId),
        ];

        // Also if parent has a spouse, link the spouse as parent_child as well
        const parentSpouses = await env.DB.prepare(
          `SELECT person_a_id, person_b_id FROM relationships WHERE tree_id = ? AND rel_type = 'spouse' AND (person_a_id = ? OR person_b_id = ?)`
        ).bind(treeId, parentPersonId, parentPersonId).all<{ person_a_id: string; person_b_id: string }>();

        if (parentSpouses.results && parentSpouses.results.length > 0) {
          for (const sp of parentSpouses.results) {
            const otherParentId = sp.person_a_id === parentPersonId ? sp.person_b_id : sp.person_a_id;
            batchStatements.push(
              env.DB.prepare(
                `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
                 VALUES (?, ?, ?, ?, 'parent_child')`
              ).bind(crypto.randomUUID(), treeId, otherParentId, childPersonId)
            );
          }
        }

        // If spouse provided for the child
        let spousePersonId: string | null = null;
        if (spouseFullName) {
          spousePersonId = crypto.randomUUID();
          const spouseRelId = crypto.randomUUID();
          batchStatements.push(
            env.DB.prepare(
              `INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at)
               VALUES (?, ?, ?, ?, '', '', '', '', 1, '', 'member', '', ?)`
            ).bind(spousePersonId, treeId, newHouseholdId, spouseFullName, now),
            env.DB.prepare(
              `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
               VALUES (?, ?, ?, ?, 'spouse')`
            ).bind(spouseRelId, treeId, childPersonId, spousePersonId)
          );
        }

        await env.DB.batch(batchStatements);

        return new Response(
          JSON.stringify({
            success: true,
            householdId: newHouseholdId,
            childPersonId,
            spousePersonId,
          }),
          { status: 201 }
        );
      }

      case 'add_spouse': {
        const personId = p.personId as string;
        const spouseFullName = p.spouseFullName?.trim();
        const birthYear = p.birthYear || '';
        const phoneE164 = p.phoneE164 || '';
        const nicknameOrMaiden = p.nicknameOrMaiden || '';

        if (!personId || !spouseFullName) {
          return new Response(JSON.stringify({ error: 'Person ID and spouse full name are required.' }), { status: 400 });
        }

        const hasPerm = await canEditPerson(env.DB, treeId, caller, personId);
        if (!hasPerm) {
          return new Response(JSON.stringify({ error: 'Permission denied to add spouse for this person.' }), { status: 403 });
        }

        const person = await env.DB.prepare('SELECT household_id FROM persons WHERE id = ? AND tree_id = ?')
          .bind(personId, treeId)
          .first<DbPerson>();

        if (!person) {
          return new Response(JSON.stringify({ error: 'Person not found.' }), { status: 404 });
        }

        const spousePersonId = crypto.randomUUID();
        const spouseRelId = crypto.randomUUID();

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, '', 1, '', 'member', '', ?)`
          ).bind(spousePersonId, treeId, person.household_id, spouseFullName, nicknameOrMaiden, phoneE164, birthYear, now),
          env.DB.prepare(
            `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
             VALUES (?, ?, ?, ?, 'spouse')`
          ).bind(spouseRelId, treeId, personId, spousePersonId),
        ]);

        return new Response(
          JSON.stringify({ success: true, spousePersonId }),
          { status: 201 }
        );
      }

      case 'add_ancestors_above': {
        const personId = p.personId as string;
        const fatherName = p.fatherName?.trim();
        const motherName = p.motherName?.trim();
        const familyName = p.familyName?.trim() || `${fatherName || motherName || 'Ancestor'} Household`;
        const branchColor = p.branchColor || '#1E293B';

        if (!personId || (!fatherName && !motherName)) {
          return new Response(
            JSON.stringify({ error: 'Target person ID and at least one ancestor name (father or mother) are required.' }),
            { status: 400 }
          );
        }

        // Permitted if caller is super_admin, branch_admin, or member inserting above themselves/root
        if (!caller) {
          return new Response(JSON.stringify({ error: 'Authentication profile required.' }), { status: 403 });
        }

        const targetPerson = await env.DB.prepare('SELECT * FROM persons WHERE id = ? AND tree_id = ?')
          .bind(personId, treeId)
          .first<DbPerson>();

        if (!targetPerson) {
          return new Response(JSON.stringify({ error: 'Person not found.' }), { status: 404 });
        }

        const newHouseholdId = crypto.randomUUID();
        const batchStatements = [
          env.DB.prepare(
            `INSERT INTO households (id, tree_id, family_name, branch_color, address_line, city, postal_code, country, family_photo_b64, updated_at)
             VALUES (?, ?, ?, ?, '', '', '', '', '', ?)`
          ).bind(newHouseholdId, treeId, familyName, branchColor, now),
        ];

        let fatherId: string | null = null;
        let motherId: string | null = null;

        if (fatherName) {
          fatherId = crypto.randomUUID();
          batchStatements.push(
            env.DB.prepare(
              `INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at)
               VALUES (?, ?, ?, ?, '', '', '', '', 0, '', 'member', '', ?)`
            ).bind(fatherId, treeId, newHouseholdId, fatherName, now),
            env.DB.prepare(
              `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
               VALUES (?, ?, ?, ?, 'parent_child')`
            ).bind(crypto.randomUUID(), treeId, fatherId, personId)
          );
        }

        if (motherName) {
          motherId = crypto.randomUUID();
          batchStatements.push(
            env.DB.prepare(
              `INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at)
               VALUES (?, ?, ?, ?, '', '', '', '', 0, '', 'member', '', ?)`
            ).bind(motherId, treeId, newHouseholdId, motherName, now),
            env.DB.prepare(
              `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
               VALUES (?, ?, ?, ?, 'parent_child')`
            ).bind(crypto.randomUUID(), treeId, motherId, personId)
          );
        }

        if (fatherId && motherId) {
          batchStatements.push(
            env.DB.prepare(
              `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
               VALUES (?, ?, ?, ?, 'spouse')`
            ).bind(crypto.randomUUID(), treeId, fatherId, motherId)
          );
        }

        await env.DB.batch(batchStatements);

        return new Response(
          JSON.stringify({
            success: true,
            householdId: newHouseholdId,
            fatherId,
            motherId,
          }),
          { status: 201 }
        );
      }

      case 'set_role': {
        const targetPersonId = p.targetPersonId as string;
        const newRole = p.role as string;

        if (!targetPersonId || (newRole !== 'branch_admin' && newRole !== 'member')) {
          return new Response(JSON.stringify({ error: 'Valid targetPersonId and role (branch_admin or member) required.' }), { status: 400 });
        }

        const canManage = await canManageRole(env.DB, treeId, caller, targetPersonId, newRole);
        if (!canManage) {
          return new Response(JSON.stringify({ error: 'Permission denied to change role for this member.' }), { status: 403 });
        }

        await env.DB.prepare('UPDATE persons SET role = ?, updated_at = ? WHERE id = ? AND tree_id = ?')
          .bind(newRole, now, targetPersonId, treeId)
          .run();

        return new Response(JSON.stringify({ success: true, targetPersonId, role: newRole }), { status: 200 });
      }

      case 'delete_person': {
        const personId = p.personId as string;
        if (!personId) {
          return new Response(JSON.stringify({ error: 'Person ID is required.' }), { status: 400 });
        }

        const canDelete = await canDeleteNode(env.DB, treeId, caller, 'person', personId);
        if (!canDelete) {
          return new Response(JSON.stringify({ error: 'Permission denied to delete this person.' }), { status: 403 });
        }

        await env.DB.batch([
          env.DB.prepare('DELETE FROM relationships WHERE tree_id = ? AND (person_a_id = ? OR person_b_id = ?)').bind(treeId, personId, personId),
          env.DB.prepare('DELETE FROM persons WHERE id = ? AND tree_id = ?').bind(personId, treeId),
        ]);

        return new Response(JSON.stringify({ success: true, deletedPersonId: personId }), { status: 200 });
      }

      case 'delete_household': {
        const householdId = p.householdId as string;
        if (!householdId) {
          return new Response(JSON.stringify({ error: 'Household ID is required.' }), { status: 400 });
        }

        const canDelete = await canDeleteNode(env.DB, treeId, caller, 'household', householdId);
        if (!canDelete) {
          return new Response(JSON.stringify({ error: 'Permission denied to delete this household.' }), { status: 403 });
        }

        // Find all persons in this household
        const personsInH = await env.DB.prepare('SELECT id FROM persons WHERE household_id = ? AND tree_id = ?')
          .bind(householdId, treeId)
          .all<{ id: string }>();

        const personIds = (personsInH.results || []).map((r) => r.id);

        const deleteStatements = [
          env.DB.prepare('DELETE FROM households WHERE id = ? AND tree_id = ?').bind(householdId, treeId),
        ];

        for (const pid of personIds) {
          deleteStatements.push(
            env.DB.prepare('DELETE FROM relationships WHERE tree_id = ? AND (person_a_id = ? OR person_b_id = ?)').bind(treeId, pid, pid),
            env.DB.prepare('DELETE FROM persons WHERE id = ? AND tree_id = ?').bind(pid, treeId)
          );
        }

        await env.DB.batch(deleteStatements);

        return new Response(JSON.stringify({ success: true, deletedHouseholdId: householdId }), { status: 200 });
      }

      case 'update_pin': {
        if (!caller || caller.role !== 'super_admin') {
          return new Response(JSON.stringify({ error: 'Only the Super Admin can change the tree PIN.' }), { status: 403 });
        }

        const newPin = p.newPin?.trim();
        if (!newPin || !/^\d{6}$/.test(newPin)) {
          return new Response(JSON.stringify({ error: 'PIN must be exactly 6 digits.' }), { status: 400 });
        }

        const { hash: pinHash, salt: pinSalt } = await hashPin(newPin);
        await env.DB.prepare('UPDATE trees SET pin_hash = ?, pin_salt = ? WHERE id = ?')
          .bind(pinHash, pinSalt, treeId)
          .run();

        return new Response(JSON.stringify({ success: true, message: 'Tree PIN updated successfully.' }), { status: 200 });
      }

      default:
        return new Response(JSON.stringify({ error: `Unsupported mutation action: ${action}` }), { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
