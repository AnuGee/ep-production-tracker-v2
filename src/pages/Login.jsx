// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Responsive.css";

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
		<p style={{ textAlign: "center", marginTop: "1rem" }}>
  ยังไม่มีบัญชี?{" "}
  <span
    style={{ color: "#2563eb", cursor: "pointer", fontWeight: "bold" }}
    onClick={() => navigate("/register")}
  >
    สมัครสมาชิก
  </span>
</p>

      </form>
    </div>
  );
}
