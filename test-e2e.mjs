// End-to-End Test Suite for KinVault Production Deployment
const BASE_URL = 'https://kin-vault.pages.dev';

async function run() {
  console.log(`\n========================================`);
  console.log(`Starting KinVault Production E2E Tests`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`========================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`FAILED: ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`PASSED: ${message}`);
      passed++;
    }
  }

  const runId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const creatorDeviceId = `dev-creator-${runId}`;
  const memberDeviceId = `dev-member-${runId}`;
  const pin = '384920';

  let treeId = '';
  let inviteCode = '';
  let superAdminToken = '';
  let rootPersonId = '';
  let rootHouseholdId = '';
  let spousePersonId = '';
  let childPersonId = '';
  let childHouseholdId = '';
  let memberToken = '';

  try {
    // -------------------------------------------------------------
    // FLOW 1: Tree Creation (Onboarding / Creator)
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 1: Tree Creation ---`);
    const createRes = await fetch(`${BASE_URL}/api/tree/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        treeName: `Test Clan ${runId}`,
        creatorName: `Lian Sailo ${runId}`,
        pin: pin,
        branchColor: '#0F172A',
        city: 'Aizawl',
        country: 'India',
        deviceId: creatorDeviceId,
      }),
    });

    const createData = await createRes.json();
    assert(createRes.status === 201 || createRes.status === 200, 'Tree creation returns HTTP 201 Created');
    assert(!!createData.token, 'Creation response contains JWT token');
    assert(!!createData.treeId, 'Creation response contains treeId');
    assert(createData.inviteCode && createData.inviteCode.length === 8, 'Invite code is 8 characters alphanumeric');
    assert(!!createData.personId, 'Creation response contains root personId');

    treeId = createData.treeId;
    inviteCode = createData.inviteCode;
    superAdminToken = createData.token;
    rootPersonId = createData.personId;

    // -------------------------------------------------------------
    // FLOW 2: Authentication & PIN Verification
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 2: Authentication & Security Verification ---`);
    // Invalid PIN check
    const badPinRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode,
        pin: '000000',
        deviceId: memberDeviceId,
      }),
    });
    assert(badPinRes.status === 401, 'Invalid PIN correctly rejected with HTTP 401');

    // Invalid Invite Code check
    const badCodeRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode: 'INVALIDX',
        pin: pin,
        deviceId: memberDeviceId,
      }),
    });
    assert(badCodeRes.status === 404, 'Invalid invite code rejected with HTTP 404');

    // Valid join by member device
    const memberAuthRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode,
        pin: pin,
        deviceId: memberDeviceId,
      }),
    });
    const memberAuthData = await memberAuthRes.json();
    assert(memberAuthRes.status === 200, 'Valid invite code and PIN returns HTTP 200');
    assert(!!memberAuthData.token, 'Member device receives valid JWT token');
    assert(memberAuthData.tree.name === `Test Clan ${runId}`, 'Authenticated tree name matches created tree');
    memberToken = memberAuthData.token;

    // -------------------------------------------------------------
    // FLOW 3: Full Tree Retrieval & Data Schema
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 3: Tree Retrieval & Data Schema ---`);
    const treeRes = await fetch(`${BASE_URL}/api/tree`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const treeData = await treeRes.json();
    assert(treeRes.status === 200, 'Tree fetch returns HTTP 200');
    assert(treeData.tree.id === treeId, 'Returned tree ID matches');
    assert(Array.isArray(treeData.households) && treeData.households.length === 1, 'Initial tree has 1 root household');
    assert(Array.isArray(treeData.persons) && treeData.persons.length === 1, 'Initial tree has 1 creator person');
    assert(treeData.persons[0].role === 'super_admin', 'Creator person has role super_admin');
    assert(treeData.persons[0].claimed_device_id === creatorDeviceId, 'Creator person is claimed by creator deviceId');
    rootHouseholdId = treeData.households[0].id;

    // -------------------------------------------------------------
    // FLOW 4: Add Spouse
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 4: Add Spouse Node ---`);
    const addSpouseRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify({
        action: 'add_spouse',
        payload: {
          personId: rootPersonId,
          spouseFullName: `Pi Mawii ${runId}`,
          birthYear: '1962',
        },
      }),
    });
    const addSpouseData = await addSpouseRes.json();
    assert(addSpouseRes.status === 201 || addSpouseRes.status === 200, 'Add spouse mutation succeeds');
    assert(!!addSpouseData.spousePersonId, 'Add spouse returns new spousePersonId');
    spousePersonId = addSpouseData.spousePersonId;

    // Verify spouse relationship exists
    const treeAfterSpouse = await (await fetch(`${BASE_URL}/api/tree`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })).json();
    assert(treeAfterSpouse.persons.length === 2, 'Tree now contains 2 persons');
    assert(
      treeAfterSpouse.relationships.some(
        (r) => r.rel_type === 'spouse' && (r.person_a_id === spousePersonId || r.person_b_id === spousePersonId)
      ),
      'Spouse relationship linked correctly in D1'
    );

    // -------------------------------------------------------------
    // FLOW 5: Add Child Household (Branch Offshoot)
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 5: Add Child & Branch Household ---`);
    const addChildRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify({
        action: 'add_child_household',
        payload: {
          parentPersonId: rootPersonId,
          childFullName: `Zova Sailo ${runId}`,
          familyName: `Zova Branch ${runId}`,
          branchColor: '#1E40AF',
          birthYear: '1988',
          city: 'Lunglei',
          country: 'India',
        },
      }),
    });
    const addChildData = await addChildRes.json();
    assert(addChildRes.status === 201 || addChildRes.status === 200, 'Add child household succeeds');
    assert(!!addChildData.childPersonId, 'Returns child person ID');
    assert(!!addChildData.householdId, 'Returns new household ID');
    childPersonId = addChildData.childPersonId;
    childHouseholdId = addChildData.householdId;

    // Verify parent_child relationship exists
    const treeAfterChild = await (await fetch(`${BASE_URL}/api/tree`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })).json();
    assert(treeAfterChild.households.length === 2, 'Tree now contains 2 households');
    assert(treeAfterChild.persons.length === 3, 'Tree now contains 3 persons');
    assert(
      treeAfterChild.relationships.some(
        (r) => r.rel_type === 'parent_child' && r.person_a_id === rootPersonId && r.person_b_id === childPersonId
      ),
      'Parent-child edge correctly links root to child'
    );

    // -------------------------------------------------------------
    // FLOW 6: Retroactive Ancestors Insertion (Generations Above)
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 6: Retroactive Ancestor Insertion Above Root ---`);
    const addAncestorRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify({
        action: 'add_ancestors_above',
        payload: {
          personId: rootPersonId,
          fatherName: `Pu Chhawnzova ${runId}`,
          motherName: `Pi Thangi ${runId}`,
        },
      }),
    });
    const addAncestorData = await addAncestorRes.json();
    assert(addAncestorRes.status === 201 || addAncestorRes.status === 200, 'Add ancestors above succeeds');
    assert(!!addAncestorData.fatherId, 'Returns ancestor father ID');
    assert(!!addAncestorData.motherId, 'Returns ancestor mother ID');

    const treeAfterAncestors = await (await fetch(`${BASE_URL}/api/tree`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })).json();
    assert(treeAfterAncestors.households.length === 3, 'Tree now has 3 households including ancestor household');
    assert(treeAfterAncestors.persons.length === 5, 'Tree now has 5 persons total');
    assert(
      treeAfterAncestors.relationships.some(
        (r) => r.rel_type === 'parent_child' && r.person_a_id === addAncestorData.fatherId && r.person_b_id === rootPersonId
      ),
      'Ancestor father is parent of root person'
    );

    // -------------------------------------------------------------
    // FLOW 7: Profile Claiming by Member
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 7: Profile Claiming by Member Device ---`);
    const claimRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
        'X-Person-Id': childPersonId,
      },
      body: JSON.stringify({
        action: 'claim_profile',
        payload: {
          personId: childPersonId,
        },
      }),
    });
    assert(claimRes.status === 200, 'Member claims unclaimed child profile HTTP 200');

    // -------------------------------------------------------------
    // FLOW 8: Role Promotion (Super Admin promotes to Branch Admin)
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 8: Role Promotion (Branch Admin RBAC) ---`);
    const promoteRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify({
        action: 'set_role',
        payload: {
          targetPersonId: childPersonId,
          role: 'branch_admin',
        },
      }),
    });
    assert(promoteRes.status === 200, 'Super admin promotes child to branch_admin HTTP 200');

    const treeAfterPromote = await (await fetch(`${BASE_URL}/api/tree`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })).json();
    const promotedPerson = treeAfterPromote.persons.find((p) => p.id === childPersonId);
    assert(promotedPerson.role === 'branch_admin', 'Child profile has role branch_admin in database');

    // -------------------------------------------------------------
    // FLOW 9: Profile & Household Editing (with Contact info)
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 9: Profile & Household Contact Updates ---`);
    const updatePersonRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify({
        action: 'upsert_person',
        payload: {
          id: childPersonId,
          household_id: childHouseholdId,
          full_name: `Zova Sailo (Updated) ${runId}`,
          nickname_or_maiden: 'Vala',
          phone_e164: '+919876543210',
          birth_year: '1988',
          death_year: '',
          is_living: 1,
        },
      }),
    });
    assert(updatePersonRes.status === 200, 'Profile update returns HTTP 200');

    const updateHouseholdRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify({
        action: 'upsert_household',
        payload: {
          id: childHouseholdId,
          family_name: `Zova Household Updated ${runId}`,
          branch_color: '#2563EB',
          address_line: 'Chanmari West',
          city: 'Aizawl',
          postal_code: '796007',
          country: 'India',
        },
      }),
    });
    assert(updateHouseholdRes.status === 200, 'Household update returns HTTP 200');

    // Verify directory data reflects phone and address
    const treeAfterUpdate = await (await fetch(`${BASE_URL}/api/tree`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })).json();
    const updatedChild = treeAfterUpdate.persons.find((p) => p.id === childPersonId);
    assert(updatedChild.phone_e164 === '+919876543210', 'Phone number saved for Directory / WhatsApp integration');
    assert(updatedChild.nickname_or_maiden === 'Vala', 'Nickname saved');

    // -------------------------------------------------------------
    // FLOW 10: RBAC Guardrails (Member unauthorized action blocked)
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 10: RBAC Security Guardrails ---`);
    const unauthorizedDelete = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
        'X-Person-Id': childPersonId,
      },
      body: JSON.stringify({
        action: 'delete_person',
        payload: {
          personId: rootPersonId, // Member cannot delete ancestor root person
        },
      }),
    });
    assert(unauthorizedDelete.status === 403, 'Member cannot delete ancestor (HTTP 403 Forbidden)');

    // -------------------------------------------------------------
    // FLOW 11: Encrypted Full Backup & Cloud Batch Restore
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 11: Full Tree Backup Snapshot & D1 Batch Restore ---`);
    const snapshot = {
      version: 1,
      exportedAt: Date.now(),
      tree: treeAfterUpdate.tree,
      households: treeAfterUpdate.households,
      persons: treeAfterUpdate.persons,
      relationships: treeAfterUpdate.relationships,
    };

    const restoreRes = await fetch(`${BASE_URL}/api/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify(snapshot),
    });
    const restoreData = await restoreRes.json();
    assert(restoreRes.status === 200, 'D1 batch restore returns HTTP 200');
    assert(restoreData.restored.households === snapshot.households.length, 'All households restored in batch transaction');
    assert(restoreData.restored.persons === snapshot.persons.length, 'All persons restored in batch transaction');
    assert(restoreData.restored.relationships === snapshot.relationships.length, 'All relationships restored in batch transaction');

    // -------------------------------------------------------------
    // FLOW 12: Deletion & Cleanup
    // -------------------------------------------------------------
    console.log(`\n--- FLOW 12: Cascading Deletions ---`);
    const deleteChildRes = await fetch(`${BASE_URL}/api/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
        'X-Person-Id': rootPersonId,
      },
      body: JSON.stringify({
        action: 'delete_household',
        payload: {
          householdId: childHouseholdId,
        },
      }),
    });
    assert(deleteChildRes.status === 200, 'Delete household succeeds HTTP 200');

    const treeFinal = await (await fetch(`${BASE_URL}/api/tree`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })).json();
    assert(!treeFinal.households.some((h) => h.id === childHouseholdId), 'Deleted household no longer exists');
    assert(!treeFinal.persons.some((p) => p.id === childPersonId), 'Cascade removes person belonging to deleted household');

    console.log(`\n========================================`);
    console.log(`E2E TEST SUITE FINISHED`);
    console.log(`Passed: ${passed} | Failed: ${failed}`);
    console.log(`All 12 Core End-to-End Flows Verified!`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('\nE2E Test Run Encountered Error:', err);
    process.exit(1);
  }
}

run();
