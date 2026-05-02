import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'

const firebaseConfig = {
  apiKey: "AIzaSyCW625XFVSBubJXeg7TOgjiiCNVg9ESipc",
  authDomain: "budmemberapp.firebaseapp.com",
  projectId: "budmemberapp",
  storageBucket: "budmemberapp.firebasestorage.app",
  messagingSenderId: "269040218229",
  appId: "1:269040218229:web:3ca449a0b0dd1801ce083c",
  measurementId: "G-VD5K6VXQ9H"
}

const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)

export async function fetchMembers() {
  const q = query(collection(db, 'members'), orderBy('dateAdded', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function fetchAnalytics() {
  const snap = await getDocs(collection(db, 'members'))
  const now = new Date()
  let basic = 0, premium = 0, active = 0, expired = 0
  snap.forEach(doc => {
    const d = doc.data()
    if (d.membershipType === 'Premium') premium++; else basic++
    const exp = d.expiryDate?.toDate ? d.expiryDate.toDate() : new Date(d.expiryDate)
    if (exp && exp > now) active++; else expired++
  })
  return { total: snap.size, basic, premium, active, expired }
}

export async function saveMember(data) {
  const dateAdded = new Date(data.date + 'T00:00:00')
  const expiryDate = new Date(dateAdded)
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)

  await addDoc(collection(db, 'members'), {
    employeeName: data.employeeName.trim(),
    membershipType: data.membershipType,
    memberNumber: data.memberNumber.trim(),
    memberName: data.memberName.trim(),
    idNumber: data.idNumber.trim(),
    phone: data.phone.trim(),
    signature: data.signature,
    dateAdded: Timestamp.fromDate(dateAdded),
    expiryDate: Timestamp.fromDate(expiryDate)
  })
}
