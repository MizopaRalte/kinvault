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
  addChildHousehold: string;
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
  profileClaimed: string;
  fullName: string;
  maidenOrNickname: string;
  phoneNumber: string;
  birthYear: string;
  deathYear: string;
  isLivingCheck: string;
  personalPhoto: string;
  familyPhoto: string;
  uploadPhoto: string;
  takePhoto: string;
  removePhoto: string;
  addressLine: string;
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
  ancestorMother: string;
  childName: string;
  spouseName: string;
  newFamilyName: string;

  // Share
  shareTitle: string;
  shareSubtitle: string;
  copyInviteLink: string;
  copyInviteCode: string;
  copied: string;
  shareWhatsApp: string;
  whatsAppMessage: string;

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
    inviteCodePlaceholder: 'e.g. K9X4M2P7',
    pinLabel: '6-Digit Family PIN',
    pinPlaceholder: '123456',
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
    addAncestorsAbove: '+ Ancestors Above',
    addSpouse: '+ Spouse',
    addChildHousehold: '+ Child / Branch',
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
    profileClaimed: 'Profile claimed by this device',
    fullName: 'Full Name',
    maidenOrNickname: 'Nickname / Maiden Name',
    phoneNumber: 'Phone (International format)',
    birthYear: 'Birth Year',
    deathYear: 'Death Year',
    isLivingCheck: 'Is this person currently living?',
    personalPhoto: 'Personal Photo',
    familyPhoto: 'Family Household Photo',
    uploadPhoto: 'Upload Photo',
    takePhoto: 'Take Photo',
    removePhoto: 'Remove',
    addressLine: 'Street Address',
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
    ancestorMother: "Mother's Full Name",
    childName: "Child's Full Name",
    spouseName: "Spouse's Full Name",
    newFamilyName: 'New Family / Household Name',

    shareTitle: 'Invite Your Family',
    shareSubtitle: 'Relatives need the 8-character code and 6-digit PIN to join.',
    copyInviteLink: 'Copy Direct Link',
    copyInviteCode: 'Copy Invite Code',
    copied: 'Copied to clipboard!',
    shareWhatsApp: 'Share on WhatsApp',
    whatsAppMessage: "Join our family tree on KinVault! Use invite code: {code} and PIN: {pin}. Click here: {link}",

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
    pukPlaceholder: 'e.g. KV-8F92-4K1M',
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
    inviteCodePlaceholder: 'Entirnan: K9X4M2P7',
    pinLabel: 'Chhungkaw PIN (Nambar 6)',
    pinPlaceholder: '123456',
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
    addAncestorsAbove: '+ A Chunga Thlahtute',
    addSpouse: '+ Kawppui',
    addChildHousehold: '+ Fa / Peng Tharlam',
    expandBranch: 'Tizau Rawh',
    collapseBranch: 'Thlep Rawh',
    living: 'Dam Lai',
    deceased: 'Boral Tawh',
    membersCount: 'chhungkua',
    householdColor: 'Peng Rawng',
    superAdminBadge: 'Siamtu (Super Admin)',
    branchAdminBadge: 'Peng Admin',
    memberBadge: 'Chhungkhat',
    unclaimedProfile: 'Hauh loh nihna',
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

    editProfile: 'Mimal Nihna Siamaṭhatna',
    editHousehold: 'Chhungkaw Siamaṭhatna',
    claimThisProfile: 'He nihna hi keimah ka ni',
    profileClaimed: 'He khawlah hian hauh tawh a ni',
    fullName: 'Hming Pum',
    maidenOrNickname: 'Kohduat / Hming dang',
    phoneNumber: 'Phone (Ram code telin)',
    birthYear: 'Pian Kum',
    deathYear: 'Boral Kum',
    isLivingCheck: 'A la dam em?',
    personalPhoto: 'Mimal Thlalak',
    familyPhoto: 'Chhungkaw Thlalak',
    uploadPhoto: 'Thlalak Thlang Rawh',
    takePhoto: 'Camera Hmanga Lâk',
    removePhoto: 'Paih Rawh',
    addressLine: 'Veng / Kawng Hming',
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
    ancestorMother: 'Nu Hming Pum',
    childName: 'Fa Hming Pum',
    spouseName: 'Kawppui Hming Pum',
    newFamilyName: 'Chhungkaw Hming Tharlam',

    shareTitle: 'Chhungte Sâwmna',
    shareSubtitle: 'Code hawrawp 8 leh PIN number 6 hmangin chhungkua an zawm thei ang.',
    copyInviteLink: 'Link Copy Rawh',
    copyInviteCode: 'Invite Code Copy Rawh',
    copied: 'Copy fel e!',
    shareWhatsApp: 'WhatsApp-ah Thawn Rawh',
    whatsAppMessage: "Kan chhungkaw thlahtute chanchin KinVault-ah lo zawm ve rawh le! Sâwmna code: {code} leh PIN: {pin} a ni e. Hetah hian hmet rawh: {link}",

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
    pukPlaceholder: 'Entirnan: KV-8F92-4K1M',
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
    inviteCodePlaceholder: 'p. ej. K9X4M2P7',
    pinLabel: 'PIN Familiar de 6 Dígitos',
    pinPlaceholder: '123456',
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
    addAncestorsAbove: '+ Antepasados Arriba',
    addSpouse: '+ Cónyuge',
    addChildHousehold: '+ Hijo / Nueva Rama',
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
    profileClaimed: 'Perfil vinculado a este dispositivo',
    fullName: 'Nombre Completo',
    maidenOrNickname: 'Apodo / Apellido de Soltera',
    phoneNumber: 'Teléfono (formato internacional)',
    birthYear: 'Año de Nacimiento',
    deathYear: 'Año de Fallecimiento',
    isLivingCheck: '¿Esta persona sigue con vida?',
    personalPhoto: 'Foto de Perfil',
    familyPhoto: 'Foto Familiar',
    uploadPhoto: 'Subir Foto',
    takePhoto: 'Tomar Foto',
    removePhoto: 'Eliminar',
    addressLine: 'Dirección',
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
    ancestorMother: 'Nombre de la Madre',
    childName: 'Nombre del Hijo/Hija',
    spouseName: 'Nombre del Cónyuge',
    newFamilyName: 'Nombre del Nuevo Hogar',

    shareTitle: 'Invitar a la Familia',
    shareSubtitle: 'Tus familiares necesitan el código de 8 caracteres y el PIN de 6 dígitos.',
    copyInviteLink: 'Copiar Enlace Directo',
    copyInviteCode: 'Copiar Código',
    copied: '¡Copiado al portapapeles!',
    shareWhatsApp: 'Compartir en WhatsApp',
    whatsAppMessage: "¡Únete a nuestro árbol familiar en KinVault! Usa el código de invitación: {code} y el PIN: {pin}. Entra aquí: {link}",

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
    pukPlaceholder: 'p. ej. KV-8F92-4K1M',
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
    inviteCodePlaceholder: 'z. B. K9X4M2P7',
    pinLabel: '6-stellige Familien-PIN',
    pinPlaceholder: '123456',
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
    addAncestorsAbove: '+ Vorfahren oben hinzufügen',
    addSpouse: '+ Ehepartner hinzufügen',
    addChildHousehold: '+ Kind / Neuer Zweig',
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
    profileClaimed: 'Auf diesem Gerät beansprucht',
    fullName: 'Vollständiger Name',
    maidenOrNickname: 'Spitzname / Geburtsname',
    phoneNumber: 'Telefon (internationales Format)',
    birthYear: 'Geburtsjahr',
    deathYear: 'Todesjahr',
    isLivingCheck: 'Lebt diese Person noch?',
    personalPhoto: 'Profilfoto',
    familyPhoto: 'Familienfoto',
    uploadPhoto: 'Foto hochladen',
    takePhoto: 'Foto aufnehmen',
    removePhoto: 'Entfernen',
    addressLine: 'Straße und Hausnummer',
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
    ancestorMother: 'Vollständiger Name der Mutter',
    childName: 'Vollständiger Name des Kindes',
    spouseName: 'Vollständiger Name des Ehepartners',
    newFamilyName: 'Neuer Familien-/Haushaltsname',

    shareTitle: 'Familie einladen',
    shareSubtitle: 'Verwandte benötigen den 8-stelligen Code und die 6-stellige PIN zum Beitreten.',
    copyInviteLink: 'Direktlink kopieren',
    copyInviteCode: 'Einladungscode kopieren',
    copied: 'In die Zwischenablage kopiert!',
    shareWhatsApp: 'Über WhatsApp teilen',
    whatsAppMessage: "Tritt unserem Stammbaum auf KinVault bei! Einladungscode: {code}, PIN: {pin}. Hier klicken: {link}",

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
    pukPlaceholder: 'z. B. KV-8F92-4K1M',
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
  },
};
