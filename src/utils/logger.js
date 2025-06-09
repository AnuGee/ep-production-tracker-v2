// src/utils/logger.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function logEvent({ email, action, page, metadata = {} }) {
  try {
    await addDoc(collection(db, "user_activity_logs"), {
      email,
      action,
      page,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("⚠️ Logging failed", error);
  }
}
