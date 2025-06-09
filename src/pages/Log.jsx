// src/pages/Log.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import "./Log.css"; // ✅ ไฟล์ CSS แยกต่างหากสำหรับตกแต่ง

export default function Log() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const q = query(
        collection(db, "user_activity_logs"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLogs(data);
    };

    fetchLogs();
  }, []);

  return (
    <div className="log-container">
      <h2>📜 ประวัติการใช้งาน (User Activity Log)</h2>
      <div className="log-table">
        {logs.length === 0 ? (
          <p>⏳ กำลังโหลด...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-card">
              <div><strong>📧 Email:</strong> {log.email}</div>
              <div><strong>📝 Action:</strong> {log.action}</div>
              <div><strong>📄 Page:</strong> {log.page}</div>
              <div>
                <strong>🔍 Metadata:</strong>
                <ul>
                  {log.metadata
                    ? Object.entries(log.metadata).map(([k, v]) => (
                        <li key={k}>
                          {k}: {v}
                        </li>
                      ))
                    : "ไม่มี"}
                </ul>
              </div>
              <div><strong>🖥️ User Agent:</strong> {log.user_agent || "-"}</div>
              <div>
                <strong>⏰ เวลา:</strong>{" "}
                {log.timestamp?.toDate().toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                }) || "-"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
