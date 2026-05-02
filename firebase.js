/* ============================================================
   firebase.js — Firebase init + Firestore helpers
   Uses Firebase Compat SDK (loaded via CDN in index.html)
   ============================================================ */

const _firebaseConfig = {
  apiKey: "AIzaSyCW625XFVSBubJXeg7TOgjiiCNVg9ESipc",
  authDomain: "budmemberapp.firebaseapp.com",
  projectId: "budmemberapp",
  storageBucket: "budmemberapp.firebasestorage.app",
  messagingSenderId: "269040218229",
  appId: "1:269040218229:web:3ca449a0b0dd1801ce083c",
  measurementId: "G-VD5K6VXQ9H"
};

firebase.initializeApp(_firebaseConfig);

const db = firebase.firestore();

/* Enable offline persistence so the app works without internet */
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence: not supported in this browser.');
  }
});

/* ------------------------------------------------------------------ */
/*  AUTO-NUMBER: use a metadata counter document for atomic increment  */
/* ------------------------------------------------------------------ */

/**
 * Preview the next auto-generated member number without consuming it.
 * Safe to call on form load.
 */
async function peekNextMemberNumber() {
  try {
    const doc = await db.collection('metadata').doc('counter').get();
    const current = doc.exists ? (doc.data().lastMemberNumber || 0) : 0;
    return `BUD-${String(current + 1).padStart(3, '0')}`;
  } catch (_) {
    return 'BUD-001';
  }
}

/**
 * Atomically increment the counter and return the new member number.
 * Call this only when actually saving a new member.
 */
async function claimNextMemberNumber() {
  const counterRef = db.collection('metadata').doc('counter');
  let memberNumber = 'BUD-001';
  await db.runTransaction(async tx => {
    const doc = await tx.get(counterRef);
    const current = doc.exists ? (doc.data().lastMemberNumber || 0) : 0;
    const next = current + 1;
    memberNumber = `BUD-${String(next).padStart(3, '0')}`;
    tx.set(counterRef, { lastMemberNumber: next }, { merge: true });
  });
  return memberNumber;
}

/* ------------------------------------------------------------------ */
/*  MEMBER CRUD                                                         */
/* ------------------------------------------------------------------ */

/**
 * Add a new member to Firestore.
 * @param {Object} formData  — raw form values
 * @param {boolean} autoNumber — true = use atomic counter; false = use formData.memberNumber
 * @returns {{ id: string, memberNumber: string }}
 */
async function addMember(formData, autoNumber) {
  /* Parse the user-supplied date string (YYYY-MM-DD) as local date */
  const [y, m, d] = formData.date.split('-').map(Number);
  const dateAdded = new Date(y, m - 1, d);
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
    dateAdded:       firebase.firestore.Timestamp.fromDate(dateAdded),
    expiryDate:      firebase.firestore.Timestamp.fromDate(expiryDate),
    createdAt:       firebase.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('members').add(payload);
  return { id: docRef.id, memberNumber };
}

/**
 * Fetch all members ordered by most recently created.
 * @returns {Promise<Array>}
 */
async function getAllMembers() {
  const snap = await db.collection('members')
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id:             doc.id,
      employeeName:   data.employeeName,
      membershipType: data.membershipType,
      memberNumber:   data.memberNumber,
      memberName:     data.memberName,
      idNumber:       data.idNumber,
      phoneNumber:    data.phoneNumber,
      dateAdded:      data.dateAdded?.toDate()  ?? null,
      expiryDate:     data.expiryDate?.toDate() ?? null,
      createdAt:      data.createdAt?.toDate()  ?? null
    };
  });
}

/**
 * Delete a member document by Firestore document ID.
 * @param {string} docId
 */
async function deleteMember(docId) {
  await db.collection('members').doc(docId).delete();
}
