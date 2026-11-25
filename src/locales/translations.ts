export type Language = 'en' | 'mz' | 'es' | 'de';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  treeTab: string;
  directoryTab: string;
  shareTab: string;
  backupTab: string;
  lockTab: string;
  language: string;
  offlineMode: string;
  cachedOffline: string;

  // Onboarding
  welcomeTitle: string;
  welcomeSubtitle: string;
  createNewTree: string;
  joinExistingTree: string;
  treeNameLabel: string;
  treeNamePlaceholder: string;
  creatorNameLabel: string;
  creatorNamePlaceholder: string;
  inviteCodeLabel: string;
  inviteCodePlaceholder: string;
  pinLabel: string;
  pinPlaceholder: string;
  cityLabel: string;
  cityPlaceholder: string;
  countryLabel: string;
  countryPlaceholder: string;
  createTreeBtn: string;
  joinTreeBtn: string;
  orDivider: string;

  // Tree Canvas
  zoomIn: string;
  zoomOut: string;
  resetView: string;
  addAncestorsAbove: string;
  addSpouse: string;
  addSibling: string;
  addChildHousehold: string;
  siblingName: string;
  siblingPlaceholder: string;
  addSiblingTitle: string;
  addSiblingNotice: string;
  optionalParentsNotice: string;
  optionalParentsPlaceholder: string;
  treeCanvasGuide: string;
  expandBranch: string;
  collapseBranch: string;
  living: string;
  deceased: string;
  membersCount: string;
  householdColor: string;
  superAdminBadge: string;
  branchAdminBadge: string;
  memberBadge: string;
  unclaimedProfile: string;
  claimedByYou: string;

  // Directory
  searchPlaceholder: string;
  filterByBranch: string;
  filterByCity: string;
  allBranches: string;
  allCities: string;
  call: string;
  whatsApp: string;
  maps: string;
  noMembersFound: string;
  born: string;
  died: string;

  // Modals & Forms
  editProfile: string;
  editHousehold: string;
  claimThisProfile: string;
  claimProfileSubtitle: string;
  profileClaimed: string;
  fullName: string;
  maidenOrNickname: string;
  nicknamePlaceholder: string;
  phoneNumber: string;
  birthYear: string;
  birthYearPlaceholder: string;
  deathYear: string;
  deathYearPlaceholder: string;
  isLivingCheck: string;
  personalPhoto: string;
  familyPhoto: string;
  uploadPhoto: string;
  takePhoto: string;
  viewPhoto: string;
  removePhoto: string;
  addFamilyLineLabel: string;
  optionalLabel: string;
  compressedSizeLabel: string;
  roleLabel: string;
  addressLine: string;
  addressPlaceholder: string;
  postalCode: string;
  branchColorLabel: string;
  saveChanges: string;
  cancel: string;
  close: string;
  deletePerson: string;
  deleteHousehold: string;
  confirmDeleteTitle: string;
  confirmDeletePersonMsg: string;
  confirmDeleteHouseholdMsg: string;
  promoteBranchAdmin: string;
  demoteToMember: string;
  ancestorFather: string;
  fatherPlaceholder: string;
  ancestorMother: string;
  motherPlaceholder: string;
  childName: string;
  childPlaceholder: string;
  spouseName: string;
  spousePlaceholder: string;
  newFamilyName: string;
  newFamilyPlaceholder: string;
  addChildNotice: string;
  addSpouseNotice: string;
  addAncestorNotice: string;

  // Flowchart & Person Details
  present: string;
  expandAll: string;
  compactView: string;
  focusBranch: string;
  showFullTree: string;
  parentsLabel: string;
  spouseLabel: string;
  siblingsLabel: string;
  childrenLabel: string;
  addressLabel: string;
  noPhone: string;
  noAddress: string;
  clickPersonHint: string;

  // Share
  shareTitle: string;
  shareSubtitle: string;
  copyInviteLink: string;
  copyInviteCode: string;
  copyPinBtn: string;
  copyBtn: string;
  copied: string;
  shareWhatsApp: string;
  whatsAppMessage: string;
  whatsAppMessageNoPin: string;
  includePinInLink: string;
  enterPinToShareHint: string;
  shareSecurityNote: string;
  joiningViaLink: string;

  // Backup & Restore
  backupTitle: string;
  backupSubtitle: string;
  exportBackupBtn: string;
  backupPasswordLabel: string;
  backupPasswordPlaceholder: string;
  exportNotice: string;
  importBackupTitle: string;
  selectBackupFile: string;
  decryptPreviewBtn: string;
  restoreToCloudBtn: string;
  restoreWarning: string;
  restoredSuccess: string;
  statsHouseholds: string;
  statsPersons: string;
  statsRelationships: string;

  // App Lock PIN
  appLockTitle: string;
  appLockSubtitle: string;
  enterPinToUnlock: string;
  setLockPin: string;
  disableLockPin: string;
  pinMismatch: string;
  pinSaved: string;
  unlockBtn: string;

  // PDF Export
  exportPdfBtn: string;
  exportingPdf: string;
  pdfExportSuccess: string;

  // Messages
  loading: string;
  saving: string;
  errorOccurred: string;
  success: string;

  // Recovery & PUK
  forgotPin: string;
  pukRecoveryTitle: string;
  pukRecoverySubtitle: string;
  pukLabel: string;
  pukPlaceholder: string;
  pukSaveNotice: string;
  pukCopied: string;
  newPinLabel: string;
  resetPinBtn: string;
  pinResetSuccess: string;

  // Global Admin & Telemetry
  globalAdminTitle: string;
  globalAdminKeyLabel: string;
  globalAdminKeyPlaceholder: string;
  unlockAdminBtn: string;
  totpCodeLabel: string;
  totpCodePlaceholder: string;
  totalMembers: string;
  totalTrees: string;
  totalHouseholds: string;
  livingVsDeceased: string;
  searchTreesPlaceholder: string;
  resetTreePinBtn: string;
  generateNewPukBtn: string;
  pukGeneratedNotice: string;
  liveStatsTooltip: string;

  // PWA Install Prompt
  installAppTitle: string;
  installAppSubtitle: string;
  installAppBtn: string;
  installIosStep1: string;
  installIosStep2: string;
  installFallbackHint: string;
  gotItBtn: string;

  // Drill-down & Kinship Calculator
  parentsOnlyView: string;
  kidsCountLabel: string;
  grandkidsCountLabel: string;
  expandKidsInTree: string;
  collapseKidsInTree: string;
  parentsSelectLabel: string;
  rootNoParentsOption: string;
  addAnotherChildBtn: string;
  connectTargetPersonLabel: string;
  transferParentsFromSpouse: string;
  formerSpouseLabel: string;
  markDivorcedBtn: string;
  restoreMarriageBtn: string;
  spouseStatusLabel: string;
  marriedStatusOption: string;
  divorcedStatusOption: string;
  markPreviousDivorcedCheck: string;
  kinshipFormerSpouse: string;
  inviteBranchAdminBtn: string;
  invitingBranchAdminSubtitle: string;
  compareRelation: string;
  comparingFromHint: string;
  relationToYou: string;
  kinshipResultTitle: string;
  kinshipPathTitle: string;
  kinshipSwapBtn: string;
  kinshipSelf: string;
  kinshipParent: string;
  kinshipChild: string;
  kinshipGrandparent: string;
  kinshipGrandchild: string;
  kinshipGreatGrandparent: string;
  kinshipGreatGrandchild: string;
  kinshipSibling: string;
  kinshipAuntUncle: string;
  kinshipNieceNephew: string;
  kinshipGreatAuntUncle: string;
  kinshipGreatNieceNephew: string;
  kinshipCousin: string;
  kinshipCousinRemoved: string;
  kinshipSpouse: string;
  kinshipParentInLaw: string;
  kinshipChildInLaw: string;
  kinshipSiblingInLaw: string;
  kinshipAuntUncleByMarriage: string;
  kinshipByMarriageSuffix: string;
  kinshipExtended: string;
  kinshipNoLink: string;
  kinshipDescriptionTemplate: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    appName: 'KinVault',
    tagline: 'Family Tree & Reconnection Vault',
    treeTab: 'Family Tree',
    directoryTab: 'Search',
    shareTab: 'Share & Invite',
    backupTab: 'Backup & Vault',
    lockTab: 'App Lock',
    language: 'Language',
    offlineMode: 'Offline Mode',
    cachedOffline: 'Viewing offline snapshot',

    welcomeTitle: 'Preserve Your Family Roots',
    welcomeSubtitle: 'Build a private, collaborative family tree and stay connected across generations.',
    createNewTree: 'Create a New Family Tree',
    joinExistingTree: 'Join Your Family Tree',
    treeNameLabel: 'Family Tree Name',
    treeNamePlaceholder: 'e.g. Sailo Clan Heritage',
    creatorNameLabel: 'Your Full Name',
    creatorNamePlaceholder: 'e.g. Lalthanmawia',
    inviteCodeLabel: '8-Character Invite Code',
    inviteCodePlaceholder: 'e.g. XXXXXXXX',
    pinLabel: '6-Digit Family PIN',
    pinPlaceholder: '••••••',
    cityLabel: 'City / Town',
    cityPlaceholder: 'e.g. Aizawl',
    countryLabel: 'Country',
    countryPlaceholder: 'e.g. India',
    createTreeBtn: 'Create Family Tree',
    joinTreeBtn: 'Join Family Tree',
    orDivider: 'OR',

    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetView: 'Reset View',
    addAncestorsAbove: '+ Parents',
    addSpouse: '+ Spouse',
    addSibling: '+ Sibling',
    addChildHousehold: '+ Child',
    siblingName: 'Sibling Full Name',
    siblingPlaceholder: 'e.g. Rachel Doe',
    addSiblingTitle: '+ Add Sibling',
    addSiblingNotice: 'Add a brother or sister. They will share the same parents.',
    optionalParentsNotice: 'Parents are not yet registered. Enter parent name to link both of you under them:',
    optionalParentsPlaceholder: 'e.g. John & Mary Doe Household',
    treeCanvasGuide: 'Expand family tree: + Parents (above) • + Spouse • + Sibling • + Child (below)',
    expandBranch: 'Expand',
    collapseBranch: 'Collapse',
    living: 'Living',
    deceased: 'Deceased',
    membersCount: 'members',
    householdColor: 'Branch Color',
    superAdminBadge: 'Tree Creator (Super Admin)',
    branchAdminBadge: 'Branch Admin',
    memberBadge: 'Member',
    unclaimedProfile: 'Unclaimed Profile',
    claimedByYou: 'You',

    searchPlaceholder: 'Search by name, nickname, city, phone, year...',
    filterByBranch: 'Branch Color',
    filterByCity: 'City',
    allBranches: 'All Branches',
    allCities: 'All Cities',
    call: 'Call',
    whatsApp: 'WhatsApp',
    maps: 'Maps',
    noMembersFound: 'No family members found matching your search.',
    born: 'b.',
    died: 'd.',

    editProfile: 'Edit Profile',
    editHousehold: 'Edit Household',
    claimThisProfile: 'Claim This Profile as Me',
    claimProfileSubtitle: 'Link this profile to this device',
    profileClaimed: 'Profile claimed by this device',
    fullName: 'Full Name',
    maidenOrNickname: 'Nickname / Maiden Name',
    nicknamePlaceholder: 'e.g. Mami',
    phoneNumber: 'Phone (International format)',
    birthYear: 'Birth Year',
    birthYearPlaceholder: 'e.g. 1985',
    deathYear: 'Death Year',
    deathYearPlaceholder: 'e.g. 2020',
    isLivingCheck: 'Is this person currently living?',
    personalPhoto: 'Personal Photo',
    familyPhoto: 'Family Household Photo',
    uploadPhoto: 'Upload Photo',
    takePhoto: 'Take Photo',
    viewPhoto: 'View Full Photo',
    removePhoto: 'Remove',
    addFamilyLineLabel: 'Add Family Line (Auto-Connected)',
    optionalLabel: '(Optional)',
    compressedSizeLabel: 'Compressed:',
    roleLabel: 'Role:',
    addressLine: 'Street Address',
    addressPlaceholder: 'Street, House No.',
    postalCode: 'Postal Code',
    branchColorLabel: 'Branch Accent Color',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    close: 'Close',
    deletePerson: 'Delete Member',
    deleteHousehold: 'Delete Household',
    confirmDeleteTitle: 'Confirm Deletion',
    confirmDeletePersonMsg: 'Are you sure you want to delete this person? This action cannot be undone.',
    confirmDeleteHouseholdMsg: 'Are you sure you want to delete this household and its branch members?',
    promoteBranchAdmin: 'Promote to Branch Admin',
    demoteToMember: 'Demote to Regular Member',
    ancestorFather: "Father's Full Name",
    fatherPlaceholder: 'e.g. Hmingthanga',
    ancestorMother: "Mother's Full Name",
    motherPlaceholder: 'e.g. Rochhingpuii',
    childName: "Child's Full Name",
    childPlaceholder: 'e.g. Lalnunfela',
    spouseName: "Spouse's Full Name",
    spousePlaceholder: 'e.g. Lalthantluangi',
    newFamilyName: 'New Family / Household Name',
    newFamilyPlaceholder: 'e.g. Sailo Family',
    addChildNotice: 'Add a child under {name} to branch out into a new household.',
    addSpouseNotice: 'Add a spouse to {name}.',
    addAncestorNotice: 'Add missing parent(s) above {name}. A new ancestor household will be created above.',

    present: 'Present',
    expandAll: 'Expand All',
    compactView: 'Compact (2 Gen)',
    focusBranch: 'Focus Branch',
    showFullTree: 'Show Full Tree',
    parentsLabel: 'Parents',
    spouseLabel: 'Spouse',
    siblingsLabel: 'Siblings',
    childrenLabel: 'Children',
    addressLabel: 'Address',
    noPhone: 'No phone added',
    noAddress: 'No address added',
    clickPersonHint: 'Tap any person portrait to view phone, address & family details',

    shareTitle: 'Invite Your Family',
    shareSubtitle: 'Relatives can join with 1 tap using the direct link, or with the 8-character code and 6-digit PIN.',
    copyInviteLink: 'Copy Direct Link',
    copyInviteCode: 'Copy Invite Code',
    copyPinBtn: 'Copy PIN',
    copyBtn: 'Copy',
    copied: 'Copied to clipboard!',
    shareWhatsApp: 'Share on WhatsApp',
    whatsAppMessage: "Join our family tree on KinVault! Tap this link to open directly: {link}\n(Invite Code: {code} | PIN: {pin})",
    whatsAppMessageNoPin: "Join our family tree on KinVault! Open this link: {link} and enter Invite Code: {code} (ask me for the 6-digit PIN).",
    includePinInLink: 'Include PIN in link (1-tap join)',
    enterPinToShareHint: 'Enter the 6-digit PIN to copy it or embed it in the 1-tap link.',
    shareSecurityNote: 'Anyone with this 1-tap link (or code + PIN) can join and add their family details.',
    joiningViaLink: 'Joining family tree...',

    backupTitle: 'Password-Encrypted Vault Backup',
    backupSubtitle: 'Export an encrypted .fam backup file with all family photos to store safely on your device or Google Drive.',
    exportBackupBtn: 'Export Encrypted .fam File',
    backupPasswordLabel: 'Backup Encryption Password',
    backupPasswordPlaceholder: 'Enter a strong backup password',
    exportNotice: 'AES-256-GCM encryption with 100,000 PBKDF2 iterations protects your family data.',
    importBackupTitle: 'Restore From Encrypted .fam File',
    selectBackupFile: 'Choose .fam File',
    decryptPreviewBtn: 'Decrypt & Inspect Backup',
    restoreToCloudBtn: 'Restore All Data to Cloud (Super Admin)',
    restoreWarning: 'Caution: Restoring will overwrite existing cloud data with the contents of this backup file.',
    restoredSuccess: 'Family tree successfully restored from backup!',
    statsHouseholds: 'Households',
    statsPersons: 'Family Members',
    statsRelationships: 'Relationships',

    appLockTitle: 'Device App Lock',
    appLockSubtitle: 'Protect your family contacts and tree on this device with a quick 4-digit PIN.',
    enterPinToUnlock: 'Enter 4-Digit Device PIN',
    setLockPin: 'Set New 4-Digit Lock PIN',
    disableLockPin: 'Disable Device App Lock',
    pinMismatch: 'Incorrect PIN. Please try again.',
    pinSaved: 'Device App Lock PIN updated.',
    unlockBtn: 'Unlock Vault',

    exportPdfBtn: 'Export Panoramic PDF',
    exportingPdf: 'Generating Vector PDF...',
    pdfExportSuccess: 'Panoramic PDF downloaded!',

    loading: 'Loading family tree...',
    saving: 'Saving changes...',
    errorOccurred: 'An error occurred. Please try again.',
    success: 'Saved successfully!',

    forgotPin: 'Forgot PIN?',
    pukRecoveryTitle: 'Reset Family PIN',
    pukRecoverySubtitle: 'Enter your 8-character invite code and 10-character PUK recovery code to choose a new PIN.',
    pukLabel: 'PUK Recovery Code',
    pukPlaceholder: 'e.g. KV-XXXX-XXXX',
    pukSaveNotice: 'IMPORTANT: Save this PUK recovery code safely. If you ever forget your 6-digit PIN, this is the only code that can restore access to your tree.',
    pukCopied: 'PUK code copied to clipboard!',
    newPinLabel: 'New 6-Digit PIN',
    resetPinBtn: 'Reset PIN & Sign In',
    pinResetSuccess: 'PIN successfully updated! Signing in...',

    globalAdminTitle: 'Global Webapp Admin',
    globalAdminKeyLabel: 'Admin Secret Key',
    globalAdminKeyPlaceholder: 'Enter master admin key',
    unlockAdminBtn: 'Unlock Admin Portal',
    totpCodeLabel: '2FA Authenticator Code',
    totpCodePlaceholder: '6-digit code',
    totalMembers: 'Total Registered Members',
    totalTrees: 'Total Family Trees',
    totalHouseholds: 'Total Households',
    livingVsDeceased: 'Living vs Deceased',
    searchTreesPlaceholder: 'Search trees by name or code...',
    resetTreePinBtn: 'Reset Tree PIN',
    generateNewPukBtn: 'Generate New PUK',
    pukGeneratedNotice: 'New PUK generated and saved to tree:',
    liveStatsTooltip: 'Live Platform Telemetry',

    installAppTitle: 'Install KinVault App',
    installAppSubtitle: 'Add to home screen for fast, full-screen & offline access.',
    installAppBtn: 'Install App',
    installIosStep1: '1. Tap the Share icon in your Safari toolbar below.',
    installIosStep2: '2. Scroll down and tap "Add to Home Screen".',
    installFallbackHint: 'Open your browser menu (⋮) and choose "Install app" or "Add to Home screen".',
    gotItBtn: 'Got It',

    parentsOnlyView: 'Parents Only',
    kidsCountLabel: 'Kids',
    grandkidsCountLabel: 'Grandkids',
    expandKidsInTree: 'Show Kids on Tree',
    collapseKidsInTree: 'Hide Kids on Tree',
    parentsSelectLabel: 'Parents (Branch Placement)',
    rootNoParentsOption: '-- Top Level / No Parents --',
    addAnotherChildBtn: 'Add Another Child (Same Line)',
    connectTargetPersonLabel: 'Connect to which person?',
    transferParentsFromSpouse: 'Move parent line from {name} onto this profile',
    formerSpouseLabel: 'Former Spouse',
    markDivorcedBtn: 'Divorced',
    restoreMarriageBtn: 'Mark Married',
    spouseStatusLabel: 'Relationship Status',
    marriedStatusOption: 'Married (Current Spouse)',
    divorcedStatusOption: 'Divorced / Former Spouse',
    markPreviousDivorcedCheck: 'Mark current spouse ({name}) as divorced',
    kinshipFormerSpouse: 'Former Spouse (Divorced)',
    inviteBranchAdminBtn: 'Invite (Branch Admin)',
    invitingBranchAdminSubtitle: 'Personal 1-tap invite for {name} — automatically links their profile as Branch Admin of their family line.',
    compareRelation: 'Compare Relation',
    comparingFromHint: 'Comparing from {name} — Tap another person on the tree',
    relationToYou: 'Your Relation',
    kinshipResultTitle: 'Family Relationship',
    kinshipPathTitle: 'Connection Path',
    kinshipSwapBtn: 'Swap Perspective',
    kinshipSelf: 'Self (Same Person)',
    kinshipParent: 'Parent',
    kinshipChild: 'Child',
    kinshipGrandparent: 'Grandparent',
    kinshipGrandchild: 'Grandchild',
    kinshipGreatGrandparent: 'Great-Grandparent',
    kinshipGreatGrandchild: 'Great-Grandchild',
    kinshipSibling: 'Sibling (Brother / Sister)',
    kinshipAuntUncle: 'Aunt / Uncle',
    kinshipNieceNephew: 'Niece / Nephew',
    kinshipGreatAuntUncle: 'Great-Aunt / Great-Uncle',
    kinshipGreatNieceNephew: 'Great-Niece / Great-Nephew',
    kinshipCousin: '{ordinal} Cousin',
    kinshipCousinRemoved: '{ordinal} Cousin ({removed} Removed)',
    kinshipSpouse: 'Spouse (Husband / Wife)',
    kinshipParentInLaw: 'Parent-in-Law',
    kinshipChildInLaw: 'Child-in-Law',
    kinshipSiblingInLaw: 'Sibling-in-Law',
    kinshipAuntUncleByMarriage: 'Aunt / Uncle (by marriage)',
    kinshipByMarriageSuffix: '(by marriage)',
    kinshipExtended: 'Extended Family ({steps} steps)',
    kinshipNoLink: 'Not yet linked in tree',
    kinshipDescriptionTemplate: '{target} is {source}\'s {relation}.',
  },

  mz: {
    appName: 'KinVault',
    tagline: 'Thlahtute Chhuina & Vawnṭhatna',
    treeTab: 'Thlahtute Chhuina',
    directoryTab: 'Zawnna',
    shareTab: 'Sâwmna',
    backupTab: 'Vawng Ṭha Rawh (.fam)',
    lockTab: 'App Lock',
    language: 'Ṭawng',
    offlineMode: 'Offline a ni',
    cachedOffline: 'Offline-a vawn sa en mek a ni',

    welcomeTitle: 'Thlahtute Chhuina leh Vawnṭhatna',
    welcomeSubtitle: 'Ṭhangtharte’n an pi leh pute hming leh an chhungkhatte awmna an hriat zel theih nan i thlahtute chhuina siam rawh.',
    createNewTree: 'Thlahtute Chhuina Thar Siam',
    joinExistingTree: 'Chhungkua Zawmna',
    treeNameLabel: 'Thlahtute Chhuina Hming',
    treeNamePlaceholder: 'Entirnan: Sailo Thlahtute Chhuina',
    creatorNameLabel: 'I Hming Pum',
    creatorNamePlaceholder: 'Entirnan: Lalthanmawia',
    inviteCodeLabel: 'Sâwmna Code (Hawrawp 8)',
    inviteCodePlaceholder: 'Entirnan: XXXXXXXX',
    pinLabel: 'Chhungkaw PIN (Nambar 6)',
    pinPlaceholder: '••••••',
    cityLabel: 'Khua / Veng',
    cityPlaceholder: 'Entirnan: Aizawl',
    countryLabel: 'Ram',
    countryPlaceholder: 'Entirnan: India',
    createTreeBtn: 'Thlahtute Chhuina Siam Rawh',
    joinTreeBtn: 'Chhungkuaah Zawm Rawh',
    orDivider: 'EMAW',

    zoomIn: 'Tilian Rawh',
    zoomOut: 'Tite Rawh',
    resetView: 'A Pangngaiin Dah Rawh',
    addAncestorsAbove: '+ Nu & Pa',
    addSpouse: '+ Kawppui',
    addSibling: '+ Unau',
    addChildHousehold: '+ Fa',
    siblingName: 'Unau Hming Pum',
    siblingPlaceholder: 'Entirnan: Lalthanmawii',
    addSiblingTitle: '+ Unau Siamna',
    addSiblingNotice: 'Unau (unaupa / unaunu) belhna. Nu & Pa thuhmun an intawm ang.',
    optionalParentsNotice: 'Nu & Pa an la awm loh chuan, in zawm theih nan Nu & Pa hming dah rawh:',
    optionalParentsPlaceholder: 'Entirnan: Thangseia Te Nupa',
    treeCanvasGuide: 'Chhungkua zawm zel nan: + Nu & Pa (chunglam) • + Kawppui • + Unau • + Fa (hnuailam)',
    expandBranch: 'Tizau Rawh',
    collapseBranch: 'Thlep Rawh',
    living: 'Dam Lai',
    deceased: 'Boral Tawh',
    membersCount: 'chhungkua',
    householdColor: 'Peng Rawng',
    superAdminBadge: 'Siamtu (Super Admin)',
    branchAdminBadge: 'Peng Admin',
    memberBadge: 'Chhungkhat',
    unclaimedProfile: 'Phone-a thlunzawm loh',
    claimedByYou: 'Nangmah',

    searchPlaceholder: 'Hming, kohduat, khua, phone number, kum zawng rawh...',
    filterByBranch: 'Peng Rawng',
    filterByCity: 'Khua',
    allBranches: 'Peng Zawng Zawng',
    allCities: 'Khua Zawng Zawng',
    call: 'Phone Rawh',
    whatsApp: 'WhatsApp',
    maps: 'Map En Rawh',
    noMembersFound: 'I thil zawn mil chhungkhat an awm lo.',
    born: 'b.',
    died: 'd.',

    editProfile: 'Mimal Chanchin Siamṭhatna',
    editHousehold: 'Chhungkaw Chanchin Siamṭhatna',
    claimThisProfile: 'He hi keimah ka ni',
    claimProfileSubtitle: 'He profile hi i phone nen thlunzawm rawh',
    profileClaimed: 'He khawlah hian hauh tawh a ni',
    fullName: 'Hming Pum',
    maidenOrNickname: 'Koh duat / Hming lem',
    nicknamePlaceholder: 'Entirnan: Mami',
    phoneNumber: 'Phone (Ram code telin)',
    birthYear: 'Pian Kum',
    birthYearPlaceholder: 'Entirnan: 1985',
    deathYear: 'Boral Kum',
    deathYearPlaceholder: 'Entirnan: 2020',
    isLivingCheck: 'A la dam (Dam lai)',
    personalPhoto: 'Mimal Thlalak',
    familyPhoto: 'Chhungkaw Thlalak',
    uploadPhoto: 'Thlalak Thlang Rawh',
    takePhoto: 'Camera-a Lâk',
    viewPhoto: 'Thlalak Lian Enna',
    removePhoto: 'Paih Rawh',
    addFamilyLineLabel: 'Chhungkaw Peng Belhna (Inzawm Nghal)',
    optionalLabel: '(A duh tan)',
    compressedSizeLabel: 'Lian zawng:',
    roleLabel: 'Chanvo:',
    addressLine: 'Veng / Kawng Hming',
    addressPlaceholder: 'Veng hming, In number',
    postalCode: 'PIN Code',
    branchColorLabel: 'A Peng Rawng',
    saveChanges: 'Save Rawh',
    cancel: 'Sut Rawh',
    close: 'Khâr Rawh',
    deletePerson: 'Paih Rawh',
    deleteHousehold: 'Chhungkua Paih Rawh',
    confirmDeleteTitle: 'Paih Duh Tak Tak Em?',
    confirmDeletePersonMsg: 'He mi hi paih duh tak em ni? A sut theih tawh lovang.',
    confirmDeleteHouseholdMsg: 'He chhungkua leh a peng zawng zawngte hi paih i duh tak meuh maw?',
    promoteBranchAdmin: 'Peng Admin-ah Siam Rawh',
    demoteToMember: 'Chhungkhat Pangngaiah Thlâk Rawh',
    ancestorFather: 'Pa Hming Pum',
    fatherPlaceholder: 'Entirnan: Hmingthanga',
    ancestorMother: 'Nu Hming Pum',
    motherPlaceholder: 'Entirnan: Rochhingpuii',
    childName: 'Fa Hming Pum',
    childPlaceholder: 'Entirnan: Lalnunfela',
    spouseName: 'Kawppui Hming Pum',
    spousePlaceholder: 'Entirnan: Lalthantluangi',
    newFamilyName: 'Chhungkaw Hming',
    newFamilyPlaceholder: 'Entirnan: Sailo Chhungkua',
    addChildNotice: '{name} hnuaiah fa thar belhna (chhungkaw peng thar a siam ang).',
    addSpouseNotice: '{name} kawppui belhna.',
    addAncestorNotice: '{name} chungah a nu leh pa (thlahtute) belhna.',

    present: 'Tun thleng',
    expandAll: 'Tizau Vek Rawh',
    compactView: 'Chhui Tawi (Chhuan 2)',
    focusBranch: 'He Peng Chauh Enna',
    showFullTree: 'Chhungkua Zawng Zawng Enna',
    parentsLabel: 'Nu & Pa',
    spouseLabel: 'Kawppui',
    siblingsLabel: 'Unau',
    childrenLabel: 'Fate',
    addressLabel: 'Chenna Hmun',
    noPhone: 'Phone dah loh',
    noAddress: 'Address dah loh',
    clickPersonHint: 'Mi thlalak/hming hmet la, phone leh chenna a lang ang',

    shareTitle: 'Chhungte Sâwmna',
    shareSubtitle: 'Link hi hmetin emaw Code hawrawp 8 leh PIN number 6 hmangin chhungkua an zawm nghal thei ang.',
    copyInviteLink: 'Link Copy Rawh',
    copyInviteCode: 'Invite Code Copy Rawh',
    copyPinBtn: 'PIN Copy Rawh',
    copyBtn: 'Copy',
    copied: 'Copy fel e!',
    shareWhatsApp: 'WhatsApp-ah Thawn Rawh',
    whatsAppMessage: "Kan chhungkaw thlahtute chanchin KinVault-ah lo zawm ve rawh le! He link hi hmet la a lut nghal ang: {link}\n(Code: {code} | PIN: {pin})",
    whatsAppMessageNoPin: "Kan chhungkaw thlahtute chanchin KinVault-ah lo zawm ve rawh le! Hetah hian hmet rawh: {link} (Code: {code}, PIN nambar 6 chu min lo zawt dawn nia).",
    includePinInLink: 'Link-ah PIN telh nghal rawh (1-tap join)',
    enterPinToShareHint: 'Copy emaw link-a telh tûrin i PIN nambar 6 chhu lut rawh.',
    shareSecurityNote: 'He link (emaw code + PIN) neitu te chuan chhungkaw chanchin an rawn belh ve thei ang.',
    joiningViaLink: 'Chhungkaw thlah ziahna zawm mek a ni...',

    backupTitle: 'Password-a Vawnṭhatna (.fam)',
    backupSubtitle: 'Chhungkaw thlalak leh thlahtute chanchin zawng zawng password hmanga vawng ṭhain i khawlah emaw Google Drive-ah i dah thei ang.',
    exportBackupBtn: '.fam File Vawng Ṭha Rawh',
    backupPasswordLabel: 'Vawnṭhatna Password',
    backupPasswordPlaceholder: 'Password khauh tak dah rawh',
    exportNotice: 'AES-256-GCM encryption hmangin i chhungkaw thuruk vawn him tlat a ni.',
    importBackupTitle: '.fam File Aṭanga Dah Lêtna',
    selectBackupFile: '.fam File Thlang Rawh',
    decryptPreviewBtn: 'Hawnna Leh Enchhinna',
    restoreToCloudBtn: 'Data Zawng Zawng Dah Lêt Rawh (Super Admin)',
    restoreWarning: 'Fimkhur rawh: He thil hian cloud-a awm sa a thlak thleng dawn a ni.',
    restoredSuccess: 'Chhungkaw data dah lêt fel a ni ta!',
    statsHouseholds: 'Chhungkua',
    statsPersons: 'Chhungkhat Mimal',
    statsRelationships: 'Inlaichinna',

    appLockTitle: 'Khawl App Lock',
    appLockSubtitle: 'He khawlah hian number 4 hmangin i chhungkaw data veng him rawh.',
    enterPinToUnlock: 'PIN Number 4 Chhuklut Rawh',
    setLockPin: 'Lock PIN Tharlam Siam Rawh',
    disableLockPin: 'App Lock Tihtawpna',
    pinMismatch: 'PIN a dik lo. Khawngaihin thun nawn leh rawh.',
    pinSaved: 'Lock PIN dah fel a ni e.',
    unlockBtn: 'Hawng Rawh',

    exportPdfBtn: 'PDF Zau Takin Download Rawh',
    exportingPdf: 'Vector PDF buatsaih mek a ni...',
    pdfExportSuccess: 'Panoramic PDF download fel e!',

    loading: 'Chhungkaw chanchin lak mek a ni...',
    saving: 'Save mek a ni...',
    errorOccurred: 'Thil a dik lo tlat. Khawngaihin han ti nawn leh rawh.',
    success: 'Hlawhtling takin save a ni e!',

    forgotPin: 'PIN theihnghilh em?',
    pukRecoveryTitle: 'Chhungkaw PIN Thlakna',
    pukRecoverySubtitle: 'Invite code (hawrawp 8) leh PUK recovery code (hawrawp 10) hmangin PIN tharlam siam rawh.',
    pukLabel: 'PUK Recovery Code',
    pukPlaceholder: 'Entirnan: KV-XXXX-XXXX',
    pukSaveNotice: 'FIMKHUR RAWH: He PUK recovery code hi vawng tha tlat rawh. I chhungkaw PIN number 6 i theihnghilh palh pawhin he PUK code hmang chauh hian i lut leh thei dawn a ni.',
    pukCopied: 'PUK code copy fel e!',
    newPinLabel: 'PIN Number 6 Tharlam',
    resetPinBtn: 'PIN Thlak la Lut Rawh',
    pinResetSuccess: 'PIN thlak fel a ni ta! Luh mek a ni...',

    globalAdminTitle: 'Webapp Global Admin',
    globalAdminKeyLabel: 'Admin Secret Key',
    globalAdminKeyPlaceholder: 'Master admin key chhutluhna',
    unlockAdminBtn: 'Admin Portal Hawng Rawh',
    totpCodeLabel: '2FA Authenticator Code',
    totpCodePlaceholder: 'Number 6',
    totalMembers: 'Chhungkhat Zawng Zawng',
    totalTrees: 'Chhungkaw Inthlahchhawn Zawng Zawng',
    totalHouseholds: 'Chhungkua Zawng Zawng',
    livingVsDeceased: 'Dam Lai leh Boral Tawh',
    searchTreesPlaceholder: 'Chhungkaw hming emaw code zawng rawh...',
    resetTreePinBtn: 'Chhungkaw PIN Thlak Rawh',
    generateNewPukBtn: 'PUK Thar Siam Rawh',
    pukGeneratedNotice: 'PUK thar siam fel a ni e:',
    liveStatsTooltip: 'Platform Data Enna',

    installAppTitle: 'KinVault App Dah Rawh',
    installAppSubtitle: 'Home screen-ah dah la, offline pawn rang takin hmang rawh.',
    installAppBtn: 'Install Rawh',
    installIosStep1: '1. Browser hnuai/chunglam Share button kha hmet rawh.',
    installIosStep2: '2. "Add to Home Screen" (+) tih kha thlang rawh.',
    installFallbackHint: 'Browser menu (⋮) hawng la, "Install app" emaw "Add to Home screen" thlang rawh.',
    gotItBtn: 'Ka Hrethiam E',

    parentsOnlyView: 'Nu & Pa Chauh',
    kidsCountLabel: 'Fate',
    grandkidsCountLabel: 'Tute',
    expandKidsInTree: 'Fate Tree-ah Tilang Rawh',
    collapseKidsInTree: 'Fate Tree-ah Thup Rawh',
    parentsSelectLabel: 'Nu leh Pa (Chhungkaw Peng)',
    rootNoParentsOption: '-- Bul Ber / Nu & Pa Awm Lo --',
    addAnotherChildBtn: 'Fa Dang Belh Leh Rawh',
    connectTargetPersonLabel: 'Tu tan nge kan zawm ang?',
    transferParentsFromSpouse: '{name} aṭangin nu leh pa inzawmna he profile-ah sawn rawh',
    formerSpouseLabel: 'Kawppui Hlui',
    markDivorcedBtn: 'Inṭhen',
    restoreMarriageBtn: 'Innei Anga Dah',
    spouseStatusLabel: 'Inneihna Dinhmun',
    marriedStatusOption: 'Innei Lai (Kawppui)',
    divorcedStatusOption: 'Inṭhen Tawh (Kawppui Hlui)',
    markPreviousDivorcedCheck: 'Kawppui lai ({name}) hi inṭhen tawh angin dah rawh',
    kinshipFormerSpouse: 'Nupui / Pasal Hlui (Inṭhen Tawh)',
    inviteBranchAdminBtn: 'Sâwmna (Peng Admin)',
    invitingBranchAdminSubtitle: '{name} tana sâwmna link bik — a lut rualin amah leh a chhungkaw peng Admin-ah a inthlunzawm nghal ang.',
    compareRelation: 'Inlaichinna Enna',
    comparingFromHint: '{name} aṭanga en mek — Mi dang hmet rawh',
    relationToYou: 'I Chhungkhat Nihna',
    kinshipResultTitle: 'Chhungkaw Inlaichinna',
    kinshipPathTitle: 'Inzawm Dan',
    kinshipSwapBtn: 'Thlâk Lêt Rawh',
    kinshipSelf: 'Nangmah (Mi thuhmun)',
    kinshipParent: 'Nu / Pa',
    kinshipChild: 'Fa',
    kinshipGrandparent: 'Pi / Pu',
    kinshipGrandchild: 'Tu',
    kinshipGreatGrandparent: 'Pi leh Pu Chhawng',
    kinshipGreatGrandchild: 'Tuchhuan',
    kinshipSibling: 'Unau (Unaupa / Unaunu)',
    kinshipAuntUncle: 'Patea / Putea / Ni / Nutei (Uncle / Aunt)',
    kinshipNieceNephew: 'Tu / Vah (Niece / Nephew)',
    kinshipGreatAuntUncle: 'Pi / Pu Peng (Great-Aunt / Uncle)',
    kinshipGreatNieceNephew: 'Tu Peng (Great-Niece / Nephew)',
    kinshipCousin: 'Unau Fa ({ordinal} Cousin)',
    kinshipCousinRemoved: 'Unau Fa ({ordinal} Cousin, {removed} Removed)',
    kinshipSpouse: 'Kawppui (Nupui / Pasal)',
    kinshipParentInLaw: 'Puzawn / Pizawn (In-Law)',
    kinshipChildInLaw: 'Mo / Makpa',
    kinshipSiblingInLaw: 'Unau Kawppui (In-Law)',
    kinshipAuntUncleByMarriage: 'Patea / Nutei (Kawppui aṭanga inlaichin)',
    kinshipByMarriageSuffix: '(Nupui/Pasal aṭanga inlaichin)',
    kinshipExtended: 'Chhungkhat Hla (Peng {steps})',
    kinshipNoLink: 'Tree-ah inzawmna a la awm lo',
    kinshipDescriptionTemplate: '{target} hi {source} tan {relation} a ni.',
  },

  es: {
    appName: 'KinVault',
    tagline: 'Árbol Genealógico y Reconexión Familiar',
    treeTab: 'Árbol Familiar',
    directoryTab: 'Buscar',
    shareTab: 'Compartir',
    backupTab: 'Copia de Seguridad',
    lockTab: 'Bloqueo',
    language: 'Idioma',
    offlineMode: 'Modo sin conexión',
    cachedOffline: 'Viendo copia guardada sin conexión',

    welcomeTitle: 'Preserva Tus Raíces Familiares',
    welcomeSubtitle: 'Construye un árbol familiar privado y colaborativo para mantenerte conectado a través de las generaciones.',
    createNewTree: 'Crear un Nuevo Árbol Familiar',
    joinExistingTree: 'Unirse a un Árbol Familiar',
    treeNameLabel: 'Nombre del Árbol Familiar',
    treeNamePlaceholder: 'p. ej. Familia González',
    creatorNameLabel: 'Tu Nombre Completo',
    creatorNamePlaceholder: 'p. ej. Carlos González',
    inviteCodeLabel: 'Código de Invitación (8 caracteres)',
    inviteCodePlaceholder: 'p. ej. XXXXXXXX',
    pinLabel: 'PIN Familiar de 6 Dígitos',
    pinPlaceholder: '••••••',
    cityLabel: 'Ciudad',
    cityPlaceholder: 'p. ej. Madrid',
    countryLabel: 'País',
    countryPlaceholder: 'p. ej. España',
    createTreeBtn: 'Crear Árbol Familiar',
    joinTreeBtn: 'Unirse al Árbol',
    orDivider: 'O',

    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    resetView: 'Restablecer Vista',
    addAncestorsAbove: '+ Padres',
    addSpouse: '+ Pareja',
    addSibling: '+ Hermano/a',
    addChildHousehold: '+ Hijo/a',
    siblingName: 'Nombre de Hermano/a',
    siblingPlaceholder: 'ej. Carlos Gomez',
    addSiblingTitle: '+ Agregar Hermano/a',
    addSiblingNotice: 'Agrega un hermano o hermana. Compartirán los mismos padres.',
    optionalParentsNotice: 'Aún no hay padres registrados. Ingrese el nombre de los padres para vincularlos:',
    optionalParentsPlaceholder: 'ej. Hogar Gomez & Perez',
    treeCanvasGuide: 'Expandir árbol: + Padres (arriba) • + Pareja • + Hermano/a • + Hijo/a (abajo)',
    expandBranch: 'Expandir',
    collapseBranch: 'Contraer',
    living: 'Vivo',
    deceased: 'Fallecido',
    membersCount: 'miembros',
    householdColor: 'Color de Rama',
    superAdminBadge: 'Creador (Super Admin)',
    branchAdminBadge: 'Admin de Rama',
    memberBadge: 'Miembro',
    unclaimedProfile: 'Perfil sin vincular',
    claimedByYou: 'Tú',

    searchPlaceholder: 'Buscar por nombre, apodo, ciudad, teléfono, año...',
    filterByBranch: 'Color de Rama',
    filterByCity: 'Ciudad',
    allBranches: 'Todas las Ramas',
    allCities: 'Todas las Ciudades',
    call: 'Llamar',
    whatsApp: 'WhatsApp',
    maps: 'Mapas',
    noMembersFound: 'No se encontraron familiares que coincidan con la búsqueda.',
    born: 'n.',
    died: 'f.',

    editProfile: 'Editar Perfil',
    editHousehold: 'Editar Hogar',
    claimThisProfile: 'Vincular este perfil como mío',
    claimProfileSubtitle: 'Vincular este perfil a este dispositivo',
    profileClaimed: 'Perfil vinculado a este dispositivo',
    fullName: 'Nombre Completo',
    maidenOrNickname: 'Apodo / Apellido de Soltera',
    nicknamePlaceholder: 'ej. Mami',
    phoneNumber: 'Teléfono (formato internacional)',
    birthYear: 'Año de Nacimiento',
    birthYearPlaceholder: 'ej. 1985',
    deathYear: 'Año de Fallecimiento',
    deathYearPlaceholder: 'ej. 2020',
    isLivingCheck: '¿Esta persona sigue con vida?',
    personalPhoto: 'Foto de Perfil',
    familyPhoto: 'Foto Familiar',
    uploadPhoto: 'Subir Foto',
    takePhoto: 'Tomar Foto',
    viewPhoto: 'Ver Foto Completa',
    removePhoto: 'Eliminar',
    addFamilyLineLabel: 'Añadir Línea Familiar (Conectada)',
    optionalLabel: '(Opcional)',
    compressedSizeLabel: 'Comprimido:',
    roleLabel: 'Rol:',
    addressLine: 'Dirección',
    addressPlaceholder: 'Calle, Número de casa',
    postalCode: 'Código Postal',
    branchColorLabel: 'Color de la Rama',
    saveChanges: 'Guardar Cambios',
    cancel: 'Cancelar',
    close: 'Cerrar',
    deletePerson: 'Eliminar Miembro',
    deleteHousehold: 'Eliminar Hogar',
    confirmDeleteTitle: 'Confirmar Eliminación',
    confirmDeletePersonMsg: '¿Estás seguro de eliminar a esta persona? Esta acción no se puede deshacer.',
    confirmDeleteHouseholdMsg: '¿Estás seguro de eliminar este hogar y todos sus miembros?',
    promoteBranchAdmin: 'Promover a Administrador de Rama',
    demoteToMember: 'Cambiar a Miembro Regular',
    ancestorFather: 'Nombre del Padre',
    fatherPlaceholder: 'ej. Juan',
    ancestorMother: 'Nombre de la Madre',
    motherPlaceholder: 'ej. María',
    childName: 'Nombre del Hijo/Hija',
    childPlaceholder: 'ej. Mateo',
    spouseName: 'Nombre del Cónyuge',
    spousePlaceholder: 'ej. Sofía',
    newFamilyName: 'Nombre del Nuevo Hogar',
    newFamilyPlaceholder: 'ej. Familia Gomez',
    addChildNotice: 'Agrega un hijo/a debajo de {name} para crear una nueva rama.',
    addSpouseNotice: 'Agregar pareja a {name}.',
    addAncestorNotice: 'Agregar padres arriba de {name}. Se creará un hogar de antepasados arriba.',

    present: 'Presente',
    expandAll: 'Expandir Todo',
    compactView: 'Compacto (2 Gen)',
    focusBranch: 'Enfocar Rama',
    showFullTree: 'Ver Árbol Completo',
    parentsLabel: 'Padres',
    spouseLabel: 'Pareja',
    siblingsLabel: 'Hermanos',
    childrenLabel: 'Hijos',
    addressLabel: 'Dirección',
    noPhone: 'Sin teléfono',
    noAddress: 'Sin dirección',
    clickPersonHint: 'Toca cualquier persona para ver su teléfono y dirección',

    shareTitle: 'Invitar a la Familia',
    shareSubtitle: 'Tus familiares pueden entrar con un toque usando el enlace o con el código de 8 caracteres y el PIN de 6 dígitos.',
    copyInviteLink: 'Copiar Enlace Directo',
    copyInviteCode: 'Copiar Código',
    copyPinBtn: 'Copiar PIN',
    copyBtn: 'Copiar',
    copied: '¡Copiado al portapapeles!',
    shareWhatsApp: 'Compartir en WhatsApp',
    whatsAppMessage: "¡Únete a nuestro árbol familiar en KinVault! Toca este enlace para entrar directo: {link}\n(Código: {code} | PIN: {pin})",
    whatsAppMessageNoPin: "¡Únete a nuestro árbol familiar en KinVault! Entra aquí: {link} con el código: {code} (pídeme el PIN de 6 dígitos).",
    includePinInLink: 'Incluir PIN en el enlace (1 toque)',
    enterPinToShareHint: 'Ingresa tu PIN de 6 dígitos para copiarlo o incluirlo en el enlace.',
    shareSecurityNote: 'Cualquier familiar con este enlace (o código + PIN) podrá unirse y añadir sus datos.',
    joiningViaLink: 'Uniéndose al árbol familiar...',

    backupTitle: 'Copia de Seguridad Cifrada (.fam)',
    backupSubtitle: 'Exporta un archivo .fam protegido con contraseña con todas las fotos para guardarlo en tu equipo o Google Drive.',
    exportBackupBtn: 'Exportar Archivo Cifrado .fam',
    backupPasswordLabel: 'Contraseña de Cifrado',
    backupPasswordPlaceholder: 'Introduce una contraseña segura',
    exportNotice: 'Protegido con cifrado AES-256-GCM y 100,000 iteraciones PBKDF2.',
    importBackupTitle: 'Restaurar Desde Archivo .fam',
    selectBackupFile: 'Elegir Archivo .fam',
    decryptPreviewBtn: 'Descifrar e Inspeccionar',
    restoreToCloudBtn: 'Restaurar a la Nube (Super Admin)',
    restoreWarning: 'Atención: La restauración sobrescribirá todos los datos en la nube con este archivo.',
    restoredSuccess: '¡Árbol familiar restaurado con éxito!',
    statsHouseholds: 'Hogares',
    statsPersons: 'Familiares',
    statsRelationships: 'Relaciones',

    appLockTitle: 'Bloqueo del Dispositivo',
    appLockSubtitle: 'Protege tu información familiar en este dispositivo con un PIN de 4 dígitos.',
    enterPinToUnlock: 'Introduce el PIN de 4 Dígitos',
    setLockPin: 'Establecer Nuevo PIN',
    disableLockPin: 'Desactivar Bloqueo',
    pinMismatch: 'PIN incorrecto. Inténtalo de nuevo.',
    pinSaved: 'PIN de bloqueo actualizado.',
    unlockBtn: 'Desbloquear',

    exportPdfBtn: 'Exportar PDF Panorámico',
    exportingPdf: 'Generando PDF Vectorial...',
    pdfExportSuccess: '¡PDF panorámico descargado!',

    loading: 'Cargando árbol familiar...',
    saving: 'Guardando cambios...',
    errorOccurred: 'Ocurrió un error. Inténtalo de nuevo.',
    success: '¡Guardado correctamente!',

    forgotPin: '¿Olvidaste tu PIN?',
    pukRecoveryTitle: 'Restablecer PIN Familiar',
    pukRecoverySubtitle: 'Introduce tu código de invitación y código PUK para elegir un nuevo PIN.',
    pukLabel: 'Código PUK de Recuperación',
    pukPlaceholder: 'p. ej. KV-XXXX-XXXX',
    pukSaveNotice: 'IMPORTANTE: Guarda este código PUK en un lugar seguro. Si olvidas tu PIN de 6 dígitos, este código te permitirá recuperar el acceso.',
    pukCopied: '¡Código PUK copiado!',
    newPinLabel: 'Nuevo PIN de 6 Dígitos',
    resetPinBtn: 'Restablecer PIN e Iniciar',
    pinResetSuccess: '¡PIN actualizado correctamente!',

    globalAdminTitle: 'Admin Global de la Webapp',
    globalAdminKeyLabel: 'Clave Secreta de Admin',
    globalAdminKeyPlaceholder: 'Introduce la clave de admin',
    unlockAdminBtn: 'Acceder al Portal de Admin',
    totpCodeLabel: 'Código Autenticador 2FA',
    totpCodePlaceholder: 'Código de 6 dígitos',
    totalMembers: 'Total de Miembros Registrados',
    totalTrees: 'Total de Árboles Familiares',
    totalHouseholds: 'Total de Hogares',
    livingVsDeceased: 'Vivos vs Fallecidos',
    searchTreesPlaceholder: 'Buscar árboles por nombre o código...',
    resetTreePinBtn: 'Restablecer PIN del Árbol',
    generateNewPukBtn: 'Generar Nuevo PUK',
    pukGeneratedNotice: 'Nuevo PUK generado correctamente:',
    liveStatsTooltip: 'Telemetría de la Plataforma',

    installAppTitle: 'Instalar App KinVault',
    installAppSubtitle: 'Añade a tu pantalla de inicio para acceso rápido y sin conexión.',
    installAppBtn: 'Instalar App',
    installIosStep1: '1. Toca el botón Compartir en la barra de Safari.',
    installIosStep2: '2. Desplázate y elige "Añadir a pantalla de inicio".',
    installFallbackHint: 'Abre el menú del navegador (⋮) y selecciona "Instalar aplicación".',
    gotItBtn: 'Entendido',

    parentsOnlyView: 'Solo Padres',
    kidsCountLabel: 'Hijos',
    grandkidsCountLabel: 'Nietos',
    expandKidsInTree: 'Mostrar Hijos en el Árbol',
    collapseKidsInTree: 'Ocultar Hijos en el Árbol',
    parentsSelectLabel: 'Padres (Ubicación en el Árbol)',
    rootNoParentsOption: '-- Nivel Superior / Sin Padres --',
    addAnotherChildBtn: 'Añadir Otro Hijo (Misma Fila)',
    connectTargetPersonLabel: '¿Conectar a qué persona?',
    transferParentsFromSpouse: 'Mover línea de padres de {name} a este perfil',
    formerSpouseLabel: 'Ex-Cónyuge',
    markDivorcedBtn: 'Divorcio',
    restoreMarriageBtn: 'Marcar Casados',
    spouseStatusLabel: 'Estado Civil',
    marriedStatusOption: 'Casados (Cónyuge Actual)',
    divorcedStatusOption: 'Divorciados / Ex-Cónyuge',
    markPreviousDivorcedCheck: 'Marcar a su cónyuge actual ({name}) como divorciado/a',
    kinshipFormerSpouse: 'Ex-Cónyuge (Divorciado/a)',
    inviteBranchAdminBtn: 'Invitar (Admin de Rama)',
    invitingBranchAdminSubtitle: 'Enlace personal para {name}: vincula su perfil automáticamente como Administrador de su rama familiar.',
    compareRelation: 'Comparar Parentesco',
    comparingFromHint: 'Comparando desde {name} — Toca otra persona en el árbol',
    relationToYou: 'Tu Parentesco',
    kinshipResultTitle: 'Parentesco Familiar',
    kinshipPathTitle: 'Ruta de Conexión',
    kinshipSwapBtn: 'Invertir Perspectiva',
    kinshipSelf: 'Misma Persona',
    kinshipParent: 'Padre / Madre',
    kinshipChild: 'Hijo / Hija',
    kinshipGrandparent: 'Abuelo / Abuela',
    kinshipGrandchild: 'Nieto / Nieta',
    kinshipGreatGrandparent: 'Bisabuelo / Bisabuela',
    kinshipGreatGrandchild: 'Bisnieto / Bisnieta',
    kinshipSibling: 'Hermano / Hermana',
    kinshipAuntUncle: 'Tío / Tía',
    kinshipNieceNephew: 'Sobrino / Sobrina',
    kinshipGreatAuntUncle: 'Tío Abuelo / Tía Abuela',
    kinshipGreatNieceNephew: 'Sobrino Nieto / Sobrina Nieta',
    kinshipCousin: 'Primo/a ({ordinal})',
    kinshipCousinRemoved: 'Primo/a ({ordinal}, {removed} grado)',
    kinshipSpouse: 'Cónyuge (Esposo / Esposa)',
    kinshipParentInLaw: 'Suegro / Suegra',
    kinshipChildInLaw: 'Yerno / Nuera',
    kinshipSiblingInLaw: 'Cuñado / Cuñada',
    kinshipAuntUncleByMarriage: 'Tío / Tía (por matrimonio)',
    kinshipByMarriageSuffix: '(por matrimonio)',
    kinshipExtended: 'Familia Extendida ({steps} pasos)',
    kinshipNoLink: 'Aún sin vínculo en el árbol',
    kinshipDescriptionTemplate: '{target} es {relation} de {source}.',
  },

  de: {
    appName: 'KinVault',
    tagline: 'Stammbaum & Familienwiederverbindung',
    treeTab: 'Stammbaum',
    directoryTab: 'Suchen',
    shareTab: 'Teilen',
    backupTab: 'Datensicherung',
    lockTab: 'App-Sperre',
    language: 'Sprache',
    offlineMode: 'Offline-Modus',
    cachedOffline: 'Offline-Schnappschuss wird angezeigt',

    welcomeTitle: 'Bewahre deine Familienwurzeln',
    welcomeSubtitle: 'Erstelle einen privaten, gemeinsamen Stammbaum und bleibe über Generationen hinweg verbunden.',
    createNewTree: 'Neuen Stammbaum erstellen',
    joinExistingTree: 'Stammbaum beitreten',
    treeNameLabel: 'Name des Stammbaums',
    treeNamePlaceholder: 'z. B. Familie Müller',
    creatorNameLabel: 'Ihr vollständiger Name',
    creatorNamePlaceholder: 'z. B. Johannes Müller',
    inviteCodeLabel: 'Einladungscode (8 Zeichen)',
    inviteCodePlaceholder: 'z. B. XXXXXXXX',
    pinLabel: '6-stellige Familien-PIN',
    pinPlaceholder: '••••••',
    cityLabel: 'Stadt',
    cityPlaceholder: 'z. B. Berlin',
    countryLabel: 'Land',
    countryPlaceholder: 'z. B. Deutschland',
    createTreeBtn: 'Stammbaum erstellen',
    joinTreeBtn: 'Stammbaum beitreten',
    orDivider: 'ODER',

    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    resetView: 'Ansicht zurücksetzen',
    addAncestorsAbove: '+ Eltern',
    addSpouse: '+ Partner',
    addSibling: '+ Geschwister',
    addChildHousehold: '+ Kind',
    siblingName: 'Name des Geschwisters',
    siblingPlaceholder: 'z.B. Anna Schmidt',
    addSiblingTitle: '+ Geschwister hinzufügen',
    addSiblingNotice: 'Fügen Sie einen Bruder oder eine Schwester hinzu. Sie teilen dieselben Eltern.',
    optionalParentsNotice: 'Noch keine Eltern eingetragen. Geben Sie den Namen der Eltern ein, um Sie zu verknüpfen:',
    optionalParentsPlaceholder: 'z.B. Familie Schmidt',
    treeCanvasGuide: 'Stammbaum erweitern: + Eltern (oben) • + Partner • + Geschwister • + Kind (unten)',
    expandBranch: 'Aufklappen',
    collapseBranch: 'Zuklappen',
    living: 'Lebend',
    deceased: 'Verstorben',
    membersCount: 'Mitglieder',
    householdColor: 'Zweigfarbe',
    superAdminBadge: 'Ersteller (Super Admin)',
    branchAdminBadge: 'Zweig-Admin',
    memberBadge: 'Mitglied',
    unclaimedProfile: 'Nicht beanspruchtes Profil',
    claimedByYou: 'Du',

    searchPlaceholder: 'Nach Name, Spitzname, Stadt, Telefon, Jahr suchen...',
    filterByBranch: 'Zweigfarbe',
    filterByCity: 'Stadt',
    allBranches: 'Alle Zweige',
    allCities: 'Alle Städte',
    call: 'Anrufen',
    whatsApp: 'WhatsApp',
    maps: 'Karten',
    noMembersFound: 'Keine passenden Familienmitglieder gefunden.',
    born: 'geb.',
    died: 'gest.',

    editProfile: 'Profil bearbeiten',
    editHousehold: 'Haushalt bearbeiten',
    claimThisProfile: 'Dieses Profil als meins beanspruchen',
    claimProfileSubtitle: 'Dieses Profil mit diesem Gerät verknüpfen',
    profileClaimed: 'Auf diesem Gerät beansprucht',
    fullName: 'Vollständiger Name',
    maidenOrNickname: 'Spitzname / Geburtsname',
    nicknamePlaceholder: 'z. B. Mami',
    phoneNumber: 'Telefon (internationales Format)',
    birthYear: 'Geburtsjahr',
    birthYearPlaceholder: 'z. B. 1985',
    deathYear: 'Todesjahr',
    deathYearPlaceholder: 'z. B. 2020',
    isLivingCheck: 'Lebt diese Person noch?',
    personalPhoto: 'Profilfoto',
    familyPhoto: 'Familienfoto',
    uploadPhoto: 'Foto hochladen',
    takePhoto: 'Foto aufnehmen',
    viewPhoto: 'Foto vergrößern',
    removePhoto: 'Entfernen',
    addFamilyLineLabel: 'Familienlinie hinzufügen (Verbunden)',
    optionalLabel: '(Optional)',
    compressedSizeLabel: 'Komprimiert:',
    roleLabel: 'Rolle:',
    addressLine: 'Straße und Hausnummer',
    addressPlaceholder: 'Straße, Hausnummer',
    postalCode: 'Postleitzahl',
    branchColorLabel: 'Zweig-Farbe',
    saveChanges: 'Änderungen speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    deletePerson: 'Mitglied löschen',
    deleteHousehold: 'Haushalt löschen',
    confirmDeleteTitle: 'Löschen bestätigen',
    confirmDeletePersonMsg: 'Bist du sicher, dass du diese Person löschen möchtest? Dies kann nicht rückgängig gemacht werden.',
    confirmDeleteHouseholdMsg: 'Bist du sicher, dass du diesen Haushalt und alle Mitglieder löschen möchtest?',
    promoteBranchAdmin: 'Zum Zweig-Admin befördern',
    demoteToMember: 'Zu regulärem Mitglied herabstufen',
    ancestorFather: 'Vollständiger Name des Vaters',
    fatherPlaceholder: 'z. B. Hans',
    ancestorMother: 'Vollständiger Name der Mutter',
    motherPlaceholder: 'z. B. Maria',
    childName: 'Vollständiger Name des Kindes',
    childPlaceholder: 'z. B. Lukas',
    spouseName: 'Vollständiger Name des Ehepartners',
    spousePlaceholder: 'z. B. Julia',
    newFamilyName: 'Neuer Familien-/Haushaltsname',
    newFamilyPlaceholder: 'z. B. Familie Schmidt',
    addChildNotice: 'Fügen Sie ein Kind unter {name} hinzu, um einen neuen Zweig zu erstellen.',
    addSpouseNotice: 'Partner für {name} hinzufügen.',
    addAncestorNotice: 'Fügen Sie fehlende Eltern über {name} hinzu. Oben wird ein neuer Haushalt erstellt.',

    present: 'Heute',
    expandAll: 'Alle ausklappen',
    compactView: 'Kompakt (2 Gen.)',
    focusBranch: 'Zweig fokussieren',
    showFullTree: 'Ganzen Baum zeigen',
    parentsLabel: 'Eltern',
    spouseLabel: 'Partner',
    siblingsLabel: 'Geschwister',
    childrenLabel: 'Kinder',
    addressLabel: 'Adresse',
    noPhone: 'Keine Nummer',
    noAddress: 'Keine Adresse',
    clickPersonHint: 'Auf eine Person tippen für Telefon, Adresse & Details',

    shareTitle: 'Familie einladen',
    shareSubtitle: 'Verwandte können direkt über den Link oder mit dem 8-stelligen Code und der 6-stelligen PIN beitreten.',
    copyInviteLink: 'Direktlink kopieren',
    copyInviteCode: 'Einladungscode kopieren',
    copyPinBtn: 'PIN kopieren',
    copyBtn: 'Kopieren',
    copied: 'In die Zwischenablage kopiert!',
    shareWhatsApp: 'Über WhatsApp teilen',
    whatsAppMessage: "Tritt unserem Stammbaum auf KinVault bei! Tippe auf diesen Link für den direkten Zugang: {link}\n(Code: {code} | PIN: {pin})",
    whatsAppMessageNoPin: "Tritt unserem Stammbaum auf KinVault bei! Öffne {link} mit Einladungscode: {code} (frag mich nach der 6-stelligen PIN).",
    includePinInLink: 'PIN im Link einbetten (1-Klick-Beitritt)',
    enterPinToShareHint: 'Gib die 6-stellige PIN ein, um sie zu kopieren oder im Link einzubetten.',
    shareSecurityNote: 'Jeder Verwandte mit diesem Link (oder Code + PIN) kann beitreten und seine Familiendaten ergänzen.',
    joiningViaLink: 'Trete dem Stammbaum bei...',

    backupTitle: 'Verschlüsseltes Vault-Backup (.fam)',
    backupSubtitle: 'Exportiere eine passwortgeschützte .fam-Datei mit allen Familienfotos für dein Gerät oder Google Drive.',
    exportBackupBtn: 'Verschlüsselte .fam-Datei exportieren',
    backupPasswordLabel: 'Passwort für die Verschlüsselung',
    backupPasswordPlaceholder: 'Sicheres Passwort eingeben',
    exportNotice: 'AES-256-GCM-Verschlüsselung mit 100.000 PBKDF2-Iterationen schützt deine Daten.',
    importBackupTitle: 'Aus .fam-Datei wiederherstellen',
    selectBackupFile: '.fam-Datei auswählen',
    decryptPreviewBtn: 'Entschlüsseln & Prüfen',
    restoreToCloudBtn: 'In die Cloud wiederherstellen (Super Admin)',
    restoreWarning: 'Achtung: Dies überschreibt alle vorhandenen Daten in der Cloud mit dieser Sicherung.',
    restoredSuccess: 'Stammbaum erfolgreich wiederhergestellt!',
    statsHouseholds: 'Haushalte',
    statsPersons: 'Familienmitglieder',
    statsRelationships: 'Beziehungen',

    appLockTitle: 'Geräte-App-Sperre',
    appLockSubtitle: 'Schütze deine Familiendaten auf diesem Gerät mit einer 4-stelligen PIN.',
    enterPinToUnlock: '4-stellige PIN eingeben',
    setLockPin: 'Neue 4-stellige PIN festlegen',
    disableLockPin: 'App-Sperre deaktivieren',
    pinMismatch: 'Falsche PIN. Bitte erneut versuchen.',
    pinSaved: 'App-Sperr-PIN aktualisiert.',
    unlockBtn: 'Entsperren',

    exportPdfBtn: 'Panoramisches PDF exportieren',
    exportingPdf: 'Vektor-PDF wird generiert...',
    pdfExportSuccess: 'Panoramisches PDF heruntergeladen!',

    loading: 'Stammbaum wird geladen...',
    saving: 'Änderungen werden gespeichert...',
    errorOccurred: 'Ein Fehler ist aufgetreten.',
    success: 'Erfolgreich gespeichert!',

    forgotPin: 'PIN vergessen?',
    pukRecoveryTitle: 'Familien-PIN zurücksetzen',
    pukRecoverySubtitle: 'Gib deinen Einladungscode und den PUK-Wiederherstellungscode ein, um eine neue PIN festzulegen.',
    pukLabel: 'PUK-Wiederherstellungscode',
    pukPlaceholder: 'z. B. KV-XXXX-XXXX',
    pukSaveNotice: 'WICHTIG: Bewahre diesen PUK sicher auf. Falls du deine 6-stellige PIN vergisst, ist dieser Code der einzige Weg zur Wiederherstellung.',
    pukCopied: 'PUK-Code in die Zwischenablage kopiert!',
    newPinLabel: 'Neue 6-stellige PIN',
    resetPinBtn: 'PIN zurücksetzen & Anmelden',
    pinResetSuccess: 'PIN erfolgreich aktualisiert!',

    globalAdminTitle: 'Globaler Webapp-Admin',
    globalAdminKeyLabel: 'Admin-Schlüssel',
    globalAdminKeyPlaceholder: 'Admin-Hauptschlüssel eingeben',
    unlockAdminBtn: 'Admin-Portal öffnen',
    totpCodeLabel: '2FA-Authenticator-Code',
    totpCodePlaceholder: '6-stelliger Code',
    totalMembers: 'Registrierte Mitglieder',
    totalTrees: 'Familienstammbäume',
    totalHouseholds: 'Haushalte insgesamt',
    livingVsDeceased: 'Lebend vs Verstorben',
    searchTreesPlaceholder: 'Stammbäume nach Name oder Code suchen...',
    resetTreePinBtn: 'Stammbaum-PIN zurücksetzen',
    generateNewPukBtn: 'Neuen PUK generieren',
    pukGeneratedNotice: 'Neuer PUK erfolgreich generiert:',
    liveStatsTooltip: 'Plattform-Telemetrie',

    installAppTitle: 'KinVault App installieren',
    installAppSubtitle: 'Zum Startbildschirm hinzufügen für schnellen & Offline-Zugriff.',
    installAppBtn: 'App installieren',
    installIosStep1: '1. Tippe unten in Safari auf das Teilen-Symbol.',
    installIosStep2: '2. Scrolle nach unten und tippe auf „Zum Home-Bildschirm“.',
    installFallbackHint: 'Öffne das Browser-Menü (⋮) und wähle „App installieren“.',
    gotItBtn: 'Verstanden',

    parentsOnlyView: 'Nur Eltern',
    kidsCountLabel: 'Kinder',
    grandkidsCountLabel: 'Enkel',
    expandKidsInTree: 'Kinder im Baum anzeigen',
    collapseKidsInTree: 'Kinder im Baum ausblenden',
    parentsSelectLabel: 'Eltern (Zweig-Zuordnung)',
    rootNoParentsOption: '-- Oberste Ebene / Keine Eltern --',
    addAnotherChildBtn: 'Weiteres Kind hinzufügen (Gleiche Zeile)',
    connectTargetPersonLabel: 'Mit welcher Person verbinden?',
    transferParentsFromSpouse: 'Elternlinie von {name} auf dieses Profil übertragen',
    formerSpouseLabel: 'Ex-Partner',
    markDivorcedBtn: 'Geschieden',
    restoreMarriageBtn: 'Als verheiratet markieren',
    spouseStatusLabel: 'Beziehungsstatus',
    marriedStatusOption: 'Verheiratet (Aktuell)',
    divorcedStatusOption: 'Geschieden / Ex-Partner',
    markPreviousDivorcedCheck: 'Aktuellen Partner ({name}) als geschieden markieren',
    kinshipFormerSpouse: 'Ex-Partner (Geschieden)',
    inviteBranchAdminBtn: 'Einladen (Zweig-Admin)',
    invitingBranchAdminSubtitle: 'Persönlicher 1-Klick-Link für {name} – verknüpft das Profil automatisch als Zweig-Admin.',
    compareRelation: 'Verwandtschaft prüfen',
    comparingFromHint: 'Vergleich ab {name} — Tippe auf eine andere Person',
    relationToYou: 'Beziehung zu dir',
    kinshipResultTitle: 'Verwandtschaftsgrad',
    kinshipPathTitle: 'Verbindungspfad',
    kinshipSwapBtn: 'Perspektive tauschen',
    kinshipSelf: 'Selbst (Gleiche Person)',
    kinshipParent: 'Elternteil',
    kinshipChild: 'Kind',
    kinshipGrandparent: 'Großelternteil',
    kinshipGrandchild: 'Enkelkind',
    kinshipGreatGrandparent: 'Urgroßelternteil',
    kinshipGreatGrandchild: 'Urenkelkind',
    kinshipSibling: 'Geschwister',
    kinshipAuntUncle: 'Tante / Onkel',
    kinshipNieceNephew: 'Nichte / Neffe',
    kinshipGreatAuntUncle: 'Großtante / Großonkel',
    kinshipGreatNieceNephew: 'Großnichte / Großneffe',
    kinshipCousin: 'Cousin/e ({ordinal})',
    kinshipCousinRemoved: 'Cousin/e ({ordinal}, {removed} versetzt)',
    kinshipSpouse: 'Ehepartner / Partner',
    kinshipParentInLaw: 'Schwiegereltern',
    kinshipChildInLaw: 'Schwiegerkind',
    kinshipSiblingInLaw: 'Schwager / Schwägerin',
    kinshipAuntUncleByMarriage: 'Tante / Onkel (angeheiratet)',
    kinshipByMarriageSuffix: '(angeheiratet)',
    kinshipExtended: 'Erweiterte Familie ({steps} Schritte)',
    kinshipNoLink: 'Noch nicht verbunden',
    kinshipDescriptionTemplate: '{target} ist {relation} von {source}.',
  },
};
