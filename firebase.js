/* ============================================================
   firebase.js — Firebase Realtime Database (no Firestore needed)
   Uses Firebase Compat SDK (loaded via CDN in index.html)
   Database URL: https://budmemberapp-default-rtdb.firebaseio.com
   ============================================================ */

const _firebaseConfig = {
  apiKey: "AIzaSyCW625XFVSBubJXeg7TOgjiiCNVg9ESipc",
  authDomain: "budmemberapp.firebaseapp.com",
  databaseURL: "https://budmemberapp-default-rtdb.firebaseio.com",
  projectId: "budmemberapp",
  storageBucket: "budmemberapp.firebasestorage.app",
  messagingSenderId: "269040218229",
  appId: "1:269040218229:web:3ca449a0b0dd1801ce083c",
  measurementId: "G-VD5K6VXQ9H"
};

firebase.initializeApp(_firebaseConfig);
const db = firebase.database();
/* Realtime Database caches reads automatically — no extra setup needed */

/* ------------------------------------------------------------------ */
/*  AUTO-NUMBER: atomic counter using RTDB transaction                 */
/* ------------------------------------------------------------------ */

/**
 * Preview the next auto-generated member number without consuming it.
 */
async function peekNextMemberNumber() {
  try {
    const snap = await db.ref('metadata/counter').once('value');
    const current = snap.val() || 0;
    return `BUD-${String(current + 1).padStart(3, '0')}`;
  } catch (_) {
    return 'BUD-001';
  }
}

/**
 * Atomically increment the counter and return the new member number.
 */
async function claimNextMemberNumber() {
  let memberNumber = 'BUD-001';
  const result = await db.ref('metadata/counter').transaction(current => (current || 0) + 1);
  const next = result.snapshot.val();
  memberNumber = `BUD-${String(next).padStart(3, '0')}`;
  return memberNumber;
}

/* ------------------------------------------------------------------ */
/*  MEMBER CRUD                                                         */
/* ------------------------------------------------------------------ */

/**
 * Add a new member to Realtime Database.
 * Dates are stored as millisecond timestamps (plain numbers).
 */
async function addMember(formData, autoNumber) {
  const [y, m, d] = formData.date.split('-').map(Number);
  const dateAdded  = new Date(y, m - 1, d);
  const expiryDate = new Date(y, m - 1, d);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const memberNumber = autoNumber
    ? await claimNextMemberNumber()
    : formData.memberNumber.trim();

  const payload = {
    employeeName:    formData.employeeName.trim(),
    membershipType:  formData.membershipType,
    memberNumber,
    memberName:      formData.memberName.trim(),
    idNumber:        formData.idNumber.trim(),
    phoneNumber:     formData.phoneNumber.trim(),
    dateAdded:       dateAdded.getTime(),
    expiryDate:      expiryDate.getTime(),
    createdAt:       firebase.database.ServerValue.TIMESTAMP
  };

  const ref = await db.ref('members').push(payload);
  return { id: ref.key, memberNumber };
}

/**
 * Fetch all members ordered by most recently created (newest first).
 */
async function getAllMembers() {
  const snap = await db.ref('members').orderByChild('createdAt').once('value');
  const members = [];
  snap.forEach(child => {
    const data = child.val();
    members.push({
      id:             child.key,
      employeeName:   data.employeeName   || '',
      membershipType: data.membershipType || '',
      memberNumber:   data.memberNumber   || '',
      memberName:     data.memberName     || '',
      idNumber:       data.idNumber       || '',
      phoneNumber:    data.phoneNumber    || '',
      dateAdded:      data.dateAdded  ? new Date(data.dateAdded)  : null,
      expiryDate:     data.expiryDate ? new Date(data.expiryDate) : null,
      createdAt:      data.createdAt  ? new Date(data.createdAt)  : null
    });
  });
  /* RTDB orderByChild returns ascending; reverse for newest-first */
  return members.reverse();
}

/**
 * Delete a member by its RTDB push key.
 */
async function deleteMember(docId) {
  await db.ref('members').child(docId).remove();
}


