// src/utils/logger.js
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ฟังก์ชันสำหรับบันทึกกิจกรรมของผู้ใช้
export async function logActivity({ email, action, page, detail = "" }) {
  try {
    await addDoc(collection(db, "user_activity_logs"), {
      email,
      action,         // เช่น "Login", "Delete", "Update", "View"
      page,           // เช่น "Home", "Sales", "Account"
      detail,         // รายละเอียดเพิ่มเติม เช่น Batch No หรือ Product Name
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("❌ บันทึก Log ไม่สำเร็จ:", error);
  }
}
