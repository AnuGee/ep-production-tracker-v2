// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  getDocs,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNoti, setShowNoti] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  useEffect(() => {
    if (!role) return;

    const q = query(
      collection(db, "notifications"),
      where("department", "in", ["All", role]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(data);
      setUnreadCount(data.filter((n) => n.read === false).length);
    });

    return () => unsub();
  }, [role]);

  const markAsRead = async (id) => {
    const notifRef = doc(db, "notifications", id);
    await updateDoc(notifRef, { read: true });
  };

  const markAllAsRead = async () => {
    const q = query(
      collection(db, "notifications"),
      where("department", "in", ["All", role]),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id) => {
    const notifRef = doc(db, "notifications", id);
    await deleteDoc(notifRef);
  };

  const groupByDate = (data) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return {
      Today: data.filter((n) => n.createdAt?.toDate?.().toDateString() === today.toDateString()),
      Yesterday: data.filter((n) => n.createdAt?.toDate?.().toDateString() === yesterday.toDateString()),
      Older: data.filter((n) => new Date(n.createdAt?.toDate?.().toDateString()) < yesterday),
    };
  };

  const mapTypeToIcon = (type) => {
    switch (type) {
      case "Sales":
        return "📝";
      case "Warehouse":
        return "📦";
      case "Production":
        return "🧪";
      case "QC":
        return "🧬";
      case "Account":
        return "💰";
      case "System":
        return "⚙️";
      default:
        return "🔔";
    }
  };

  const grouped = groupByDate(notifications);

  const menus = [
    { label: "🏠 Home", path: "/" },
    {
      label: `📊 Dashboard${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
      path: "/dashboard",
    },
    { label: "📄 Sales", path: "/sales" },
    { label: "🏭 Warehouse", path: "/warehouse" },
    { label: "🧪 Production", path: "/production" },
    { label: "🧬 QC", path: "/qc" },
    { label: "💰 Account", path: "/account" },
  ];

  return (
    <div
      style={{
        backgroundColor: "#f3f4f6",
        padding: "1rem 20px",  // ✅ จากเดิม 2rem → เป็น px
        width: "100%",
        zIndex: 1000,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        marginBottom: "1.5rem", // ✅ เพิ่มตรงนี้
      }}
    >
      {/* Logo + Notification */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img src="/logo_ep.png" alt="Logo" style={{ height: 50 }} />
        <strong style={{ fontSize: 22 }}>ระบบติดตามสถานะงาน</strong>

        {/* Notification */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <span
            style={{ cursor: "pointer", fontSize: "20px" }}
            onClick={() => setShowNoti(!showNoti)}
          >
            🔔
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                background: "red",
                color: "white",
                borderRadius: "50%",
                padding: "2px 6px",
                fontSize: "12px",
              }}
            >
              {unreadCount}
            </span>
          )}

          {showNoti && (
            <div
              style={{
                position: "absolute",
                top: "30px",
                right: 0,
                width: "300px",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                maxHeight: "400px",
                overflowY: "auto",
                zIndex: 100,
              }}
            >
              <div style={{ padding: "10px" }}>
                <button
                  onClick={markAllAsRead}
                  style={{
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "13px",
                    marginBottom: "10px",
                    cursor: "pointer",
                  }}
                >
                  📥 อ่านทั้งหมด
                </button>
                <h4>🔔 การแจ้งเตือน</h4>
                {notifications.length === 0 ? (
                  <div>ไม่มีการแจ้งเตือน</div>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {["Today", "Yesterday", "Older"].map((key) =>
                      grouped[key]?.length > 0 && (
                        <div key={key}>
                          <h4>
                            {key === "Today"
                              ? "📅 วันนี้"
                              : key === "Yesterday"
                              ? "📆 เมื่อวานนี้"
                              : "🗂️ ก่อนหน้านี้"}
                          </h4>
                          {grouped[key].map((n) => (
                            <li
                              key={n.id}
                              style={{
                                padding: "6px 0",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                borderBottom: "1px solid #ddd",
                              }}
                            >
                              <span
                                onClick={() => markAsRead(n.id)}
                                style={{ color: n.read ? "black" : "red" }}
                              >
                                {mapTypeToIcon(n.type)} {n.message}
                              </span>
                              <span
                                onClick={() => deleteNotification(n.id)}
                                style={{
                                  color: "gray",
                                  marginLeft: "8px",
                                  cursor: "pointer",
                                }}
                              >
                                🗑️
                              </span>
                            </li>
                          ))}
                        </div>
                      )
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {menus.map((menu) => (
          <button
            key={menu.path}
            onClick={() => navigate(menu.path)}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#e5e7eb",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {menu.label}
          </button>
        ))}
      </div>

      {/* Login / Logout */}
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {user ? (
          <>
            <span style={{ fontWeight: "bold" }}>
              👤 กำลังเข้าสู่ระบบในชื่อ: {user.email} ด้วยสิทธิ์: {role}
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
