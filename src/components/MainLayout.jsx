// src/components/MainLayout.jsx
import "../styles/AppTheme.css";
import React from "react";
import Header from "./Header";

export default function MainLayout({ children }) {
  return (
    <>
      <Header />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          backgroundColor: "#f9fafb",
          paddingTop: "2rem", // เว้นที่ให้ Header
          minHeight: "100vh",
        }}
      >
        <div style={{
          maxWidth: "1200px",
          width: "100%",
          padding: "0 20px",
          margin: "0 auto" // ✅ ทำให้เนื้อหากลางจอจริงๆ
        }}>
          {children}
        </div>
      </div>
    </>
  );
}
