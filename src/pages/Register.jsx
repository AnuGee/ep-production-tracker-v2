// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Responsive.css";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("❌ รหัสผ่านไม่ตรงกัน");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("✅ สมัครสมาชิกเรียบร้อย กรุณาแจ้งผู้ดูแลเพื่อเปิดสิทธิ์การใช้งาน");
      navigate("/login");
    } catch (err) {
      setError("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  return (
    <div className="page-container">
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        🆕 สมัครสมาชิก
      </h2>

      <form
        onSubmit={handleRegister}
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
            placeholder="อย่างน้อย 6 ตัวอักษร"
            required
          />
        </div>

        <div className="full-span">
          <label>🔑 ยืนยันรหัสผ่าน</label>
          <input
            type="password"
            className="input-box"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            required
          />
        </div>

        {error && <div className="error-text full-span">{error}</div>}

        <button type="submit" className="submit-btn full-span">
          ✅ สมัครสมาชิก
        </button>
      </form>
    </div>
  );
}
