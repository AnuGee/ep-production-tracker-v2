import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; 
// ✅ ปรับ path ถ้าโปรเจกต์คุณวาง AuthContext ไว้ที่อื่น

/**
 * รายชื่อผู้มีสิทธิ์เข้า Report
 * อ้างอิงตามที่คุณให้มา
 */
const ALLOWED = [
  {
    email: "hemmarin@ecopaint.co.th",
    uid: "zd2i7jZIidWYAguRMJrsmq6SzzW2",
  },
  {
    email: "it@ecopaint.co.th",
    uid: "wVKDW6wUazXAgV3SXjczCFw8Oeb2",
  },
];

const isAllowedUser = (user) => {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  const uid = user.uid;

  return ALLOWED.some(
    (a) =>
      (a.uid && uid === a.uid) ||
      (a.email && email === a.email.toLowerCase())
  );
};

export default function ReportsGuard({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1) รอ Auth โหลดก่อน
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        กำลังตรวจสอบสิทธิ์การเข้าถึงรายงาน...
      </div>
    );
  }

  // 2) ยังไม่ login → ไปหน้า login
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // 3) login แล้วแต่ไม่ใช่บัญชีที่อนุญาต
  if (!isAllowedUser(user)) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            border: "1px solid #f2caca",
            background: "#fff5f5",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <h2 style={{ margin: 0, marginBottom: 8 }}>
            🚫 ไม่มีสิทธิ์เข้าถึงหน้า Report
          </h2>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            หน้านี้เปิดให้ใช้งานเฉพาะ:
            <ul>
              <li>hemmarin@ecopaint.co.th</li>
              <li>it@ecopaint.co.th</li>
            </ul>
            หากต้องการเพิ่มสิทธิ์ กรุณาติดต่อผู้ดูแลระบบ
          </div>
        </div>
      </div>
    );
  }

  // 4) ผ่านสิทธิ์ → เข้าได้
  return children;
}
