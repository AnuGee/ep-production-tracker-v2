// src/pages/AdminUser.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";
import "../styles/Responsive.css";

export default function AdminUser() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Sales");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setUsers(data);
  };

  const handleCreate = async () => {
    if (!email || !password) return alert("กรุณากรอกอีเมลและรหัสผ่าน");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      await addDoc(collection(db, "users"), {
        email,
        role,
        uid,
      });
      alert("✅ สร้างบัญชีสำเร็จ");
      setEmail("");
      setPassword("");
      setRole("Sales");
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("❌ ไม่สามารถสร้างบัญชีได้: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("คุณแน่ใจว่าต้องการลบบัญชีนี้?")) return;
    await deleteDoc(doc(db, "users", id));
    fetchUsers();
  };

  const handleRoleChange = async (id, newRole) => {
    await updateDoc(doc(db, "users", id), { role: newRole });
    fetchUsers();
  };

  return (
    <div className="page-container">
      <h2>👤 จัดการผู้ใช้งานระบบ</h2>

      <div className="form-grid">
        <div>
          <label>📧 Email</label>
          <input
            type="email"
            className="input-box"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label>🔑 Password</label>
          <input
            type="password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label>📌 Role</label>
          <select className="input-box" value={role} onChange={(e) => setRole(e.target.value)}>
            <option>Admin</option>
            <option>Sales</option>
            <option>Warehouse</option>
            <option>Production</option>
            <option>QC</option>
            <option>Account</option>
          </select>
        </div>
        <button className="submit-btn full-span" onClick={handleCreate}>
          ➕ สร้างบัญชีผู้ใช้
        </button>
      </div>

      <h3 style={{ marginTop: "2rem" }}>📋 รายชื่อผู้ใช้งาน</h3>
      <table className="job-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id}>
              <td>{index + 1}</td>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="input-box"
                >
                  <option>Admin</option>
                  <option>Sales</option>
                  <option>Warehouse</option>
                  <option>Production</option>
                  <option>QC</option>
                  <option>Account</option>
                </select>
              </td>
              <td>
                <button onClick={() => handleDelete(user.id)} style={{ color: "red" }}>
                  🗑️ ลบ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
