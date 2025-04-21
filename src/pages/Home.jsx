// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import ProgressBoard from "./ProgressBoard";
import JobDetailModal from "./JobDetailModal";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/Responsive.css";

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedYear, setSelectedYear] = useState("ทั้งหมด");
  const [selectedMonth, setSelectedMonth] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [searchText, setSearchText] = useState("");
  const [showAllStatus, setShowAllStatus] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const years = ["ทั้งหมด", "2025", "2026", "2027", "2028", "2029", "2030"];
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

  useEffect(() => {
    fetchJobs();

    const q = query(
      collection(db, "notifications"),
      where("department", "==", "All"),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data);
  };

  // ======= FILTER FUNCTIONS OMITTED FOR BREVITY =======
  // Assume the filtering, status, rendering, export, and tooltip logic stays unchanged

  return (
    <div className="page-container">
      <h2 style={{ marginTop: "0" }}>🏠 หน้าหลัก – ภาพรวมการทำงาน</h2>

      {/* 🔔 การแจ้งเตือนล่าสุด */}
      <div className="section">
        <h3>🔔 การแจ้งเตือนล่าสุด</h3>
        {notifications.length === 0 ? (
          <div>ไม่มีการแจ้งเตือน</div>
        ) : (
          notifications.map((noti) => (
            <div key={noti.id} style={{
              background: "#fef3c7",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "6px",
              fontSize: "14px",
            }}>
              🚨 {noti.message}
            </div>
          ))
        )}
      </div>

      {/* 🎛 Filter + Search + Clear */}
      <div className="section">
        <div className="filter-bar" style={{ flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
          <label>📆 ปี:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {years.map((year) => <option key={year}>{year}</option>)}
          </select>

          <label>🗓 เดือน:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option>ทั้งหมด</option>
            {months.map((month) => <option key={month}>{month}</option>)}
          </select>

          <label>🎯 สถานะ:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>ทั้งหมด</option>
            <option>ยังไม่ถึง</option>
            <option>กำลังทำ</option>
            <option>เสร็จแล้ว</option>
          </select>

          <input
            type="text"
            placeholder="🔍 ค้นหา Product, Customer, Batch No"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="input-box"
            style={{ flexGrow: 1, minWidth: "200px", maxWidth: "400px" }}
          />

          <button className="clear-button" onClick={handleClearFilters}>
            ♻️ Reset
          </button>
        </div>
      </div>

      {/* 📦 รวมยอดผลิต */}
      <div className="section">
        <h3>📦 รวมยอดผลิตในเดือนนี้: {getTotalVolume().toLocaleString()} KG</h3>
      </div>

      {/* 🔴 ความคืบหน้า */}
      <div className="section">
        <h3>🔴 ความคืบหน้าของงานแต่ละชุด</h3>
        <ProgressBoard jobs={filteredJobs} />
      </div>

      {/* 📊 สรุปสถานะงาน */}
      <div className="section">
        <h3>📊 สรุปสถานะงานรายแผนก</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart layout="vertical" data={steps.map((step) => ({
            name: step,
            notStarted: filteredJobs.filter(j => steps.indexOf(j.currentStep) > steps.indexOf(step)).length,
            doing: filteredJobs.filter(j => j.currentStep === step).length,
            done: filteredJobs.filter(j => steps.indexOf(j.currentStep) < steps.indexOf(step)).length,
          }))}>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="notStarted" stackId="a" fill="#d1d5db" />
            <Bar dataKey="doing" stackId="a" fill="#facc15" />
            <Bar dataKey="done" stackId="a" fill="#4ade80" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 📋 รายการงานทั้งหมด */}
      <div className="section">
        <h3>📋 รายการงานทั้งหมด</h3>
        {/* ตารางและ export ปุ่มเดิม */}
      </div>

      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
