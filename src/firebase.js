// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ✅ เพิ่มตรงนี้

// 🔥 Config จาก Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZOBE24iUSeZAfBTzrn7SFbjNftK268_I",
  authDomain: "ep-pd-tracker.firebaseapp.com",
  projectId: "ep-pd-tracker",
  storageBucket: "ep-pd-tracker.firebasestorage.app",
  messagingSenderId: "154336258483",
  appId: "1:154336258483:web:d5ca2385824283f42e43c6"
};

// 🔧 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // ✅ เพิ่มตรงนี้

// ✅ export ไว้ใช้งานในทุกไฟล์
export { db, auth };
