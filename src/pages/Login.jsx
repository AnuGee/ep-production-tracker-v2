// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Responsive.css";
import { logEvent } from "../utils/logger"; // ✅ เพิ่ม

const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await logEvent({
      email,
      action: "Login",
      page: "Login.jsx",
    });
    navigate("/");
  } catch (err) {
    setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("กรุณากรอกอีเมลก่อน");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("📩 ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
    } catch (error) {
      console.error(error);
      alert("❌ ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้");
    }
  };

  return (
    <div className="page-container">
      {/* 🔐 Title */}
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        🔐 เข้าสู่ระบบ
      </h2>

      {/* 🔐 Login Form */}
      <form
        onSubmit={handleLogin}
        className="form-grid"
        style={{ maxWidth: "400px", margin: "0 auto" }}
      >
        <div className="full-span">
          <label>📧 อีเมล</label>
          <input
            type="email"
            className="input-box"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="full-span">
          <label>🔑 รหัสผ่าน</label>
          <input
            type="password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
        </div>

        {error && <div className="error-text full-span">{error}</div>}

        <button type="submit" className="submit-btn full-span">
          ✅ เข้าสู่ระบบ
        </button>

        {/* 🔁 ลืมรหัสผ่าน */}
        <button
          type="button"
          onClick={handleForgotPassword}
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            marginTop: "6px",
            textDecoration: "underline",
          }}
        >
          🔁 ลืมรหัสผ่าน?
        </button>

{/* 
<p style={{ textAlign: "center", marginTop: "1rem" }}>
  ยังไม่มีบัญชี?{" "}
  <span
    style={{ color: "#2563eb", cursor: "pointer", fontWeight: "bold" }}
    onClick={() => navigate("/register")}
  >
    สมัครสมาชิก
  </span>
</p>
*/}

      </form>
    </div>
  );
}
