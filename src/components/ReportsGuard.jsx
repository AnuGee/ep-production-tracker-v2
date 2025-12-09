import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../firebase"; 
// ✅ เรียกไฟล์ init firebase เพื่อให้ getAuth() ใช้ default app ได้แน่

/**
 * ✅ รายชื่อผู้มีสิทธิ์เข้า Report
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
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });

    return () => unsub();
  }, []);

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
