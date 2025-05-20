// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ✅ เพิ่มตรงนี้

// 🔥 Config จาก Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAxfBdSNyvtbozLPagdg6AtCj3Sd2YsMcU",
  authDomain: "logistics-test-5d6cd.firebaseapp.com",
  projectId: "logistics-test-5d6cd",
  storageBucket: "logistics-test-5d6cd.firebasestorage.app",
  messagingSenderId: "38432977031",
  appId: "1:38432977031:web:ad99cba2ff2c57b1fa0822"
};

// 🔧 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // ✅ เพิ่มตรงนี้

// ✅ export ไว้ใช้งานในทุกไฟล์
export { db, auth };
