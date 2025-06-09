// src/pages/Log.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

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
    <div className="page-container">
      <h2>📑 ประวัติการใช้งาน (User Activity Log)</h2>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Action</th>
            <th>Page</th>
            <th>Metadata</th>
            <th>User Agent</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.email}</td>
              <td>{log.action}</td>
              <td>{log.page}</td>
              <td>
                {log.metadata
                  ? Object.entries(log.metadata)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" | ")
                  : "-"}
              </td>
              <td>{log.user_agent || "-"}</td>
              <td>
                {log.timestamp?.toDate().toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                }) || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
