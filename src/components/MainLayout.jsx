// src/components/MainLayout.jsx
import "../styles/AppTheme.css";
import React from "react";
import Header from "./Header";

export default function MainLayout({ children }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                width: "100%",
                backgroundColor: "#f9fafb",
                minHeight: "100vh",
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    width: "100%",
                    padding: "0 2rem",
                    margin: "0 auto",
                    boxSizing: "border-box",
                }}
            >
                <Header /> {/* ย้าย Header เข้ามาใน div นี้ */}
                <div style={{ marginTop: "1rem" }}>{children}</div>
            </div>
        </div>
    );
}

-------EDIT BY DEEPSEEK-------

// ใน MainLayout.jsx
const MainLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Header />
      <main className="content-container">
        {children}
      </main>
      {/* Footer ถ้ามี */}
    </div>
  );
};
