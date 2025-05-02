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
    <div className="header-container">
      {/* Logo + System Name */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <img src="/logo_ep.png" alt="Logo" style={{ height: 50 }} />
        <strong className="header-title">ระบบติดตามสถานะงาน</strong>
      </div>

      {/* Menu Buttons */}
      <div className="menu-container" style={{ justifyContent: "center" }}>
        {menus.map((menu) => (
          <button
            key={menu.path}
            onClick={() => navigate(menu.path)}
            className="menu-button"
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
