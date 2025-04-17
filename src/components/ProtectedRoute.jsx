import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "./MainLayout"; // ✅ เพิ่ม

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <MainLayout><p>⏳ กำลังโหลดข้อมูลผู้ใช้งาน...</p></MainLayout>;

  // ❌ ยังไม่ได้ login
  if (!user) return <Navigate to="/login" />;

  // ✅ Admin เข้าได้ทุกหน้า
  if (role === "Admin") return children;

  // ✅ เข้าได้เฉพาะหน้าที่อนุญาต
  if (allowedRoles.includes(role)) return children;

  // ❌ ไม่มีสิทธิ์เข้าหน้านี้ → แสดง layout ปกติ + ข้อความเตือน
  return (
    <MainLayout>
      <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>
        <h2>🚫 คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p>กรุณาติดต่อผู้ดูแลระบบ หากคุณคิดว่าคุณควรมีสิทธิ์เข้าถึง</p>
      </div>
    </MainLayout>
  );
}
