// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore"; // ✅ เพิ่ม serverTimestamp
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZOBE24iUSeZAfBTzrn7SFbjNftK268_I",
  authDomain: "ep-pd-tracker.firebaseapp.com",
  projectId: "ep-pd-tracker",
  storageBucket: "ep-pd-tracker.firebasestorage.app",
  messagingSenderId: "154336258483",
  appId: "1:154336258483:web:d5ca2385824283f42e43c6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ export เพิ่ม timestamp
export { db, auth, serverTimestamp as timestamp };
