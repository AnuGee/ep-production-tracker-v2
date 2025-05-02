// src/components/Header.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const menus = [
    { label: "🏠 Home", path: "/" },
    { label: "📊 Dashboard", path: "/dashboard" },
    { label: "📄 Sales", path: "/sales" },
    { label: "🏭 Warehouse", path: "/warehouse" },
    { label: "🧪 Production", path: "/production" },
    { label: "🧬 QC", path: "/qc" },
    { label: "💰 Account", path: "/account" },
  ];

  return (
    <div className="header-container" style={{ maxWidth: "1200px", margin: "auto", padding: "1rem" }}>
      {/* Logo + System Name */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <img src="/logo_ep.png" alt="Logo" style={{ height: 50 }} />
<strong className="header-title" style={{ color: "#1f2937", fontSize: "22px", fontWeight: "bold" }}>
  ระบบติดตามสถานะงาน
</strong>
      </div>

      {/* Menu Buttons */}
      <div
        className="menu-container"
        style={{
          marginTop: "1rem",
          display: "flex",
          flexWrap: "wrap", // <<< เพิ่มตรงนี้
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {menus.map((menu) => (
          <button
            key={menu.path}
            onClick={() => navigate(menu.path)}
            className="menu-button"
            style={{
              padding: "8px 14px",
              fontSize: "16px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              flexShrink: 0, // <<< ป้องกันปุ่มหด
            }}
          >
            {menu.label}
          </button>
        ))}
      </div>

      {/* User Info + Auth Buttons */}
      <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        {user ? (
          <>
<span className="login-info">
  👤 เข้าสู่ระบบในชื่อ: {user.email} (สิทธิ์: {role})
</span>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 14px",
                backgroundColor: "#ef4444",
                color: "white",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
              }}
            >
              🔓 Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "6px 14px",
              backgroundColor: "#2563eb",
              color: "white",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔐 Login
          </button>
        )}
      </div>
    </div>
  );
}
