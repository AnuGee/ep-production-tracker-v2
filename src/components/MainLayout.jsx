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
          minHeight: "100vh",
        }}
      >
        <div style={{
          maxWidth: "1200px",
          width: "100%",
          padding: "0 2rem", // ✅ ใช้หน่วยเดียวกันกับ Header
          margin: "0 auto" // ✅ ทำให้เนื้อหากลางจอจริงๆ
        }}>
          {children}
        </div>
      </div>
    </>
  );
}
