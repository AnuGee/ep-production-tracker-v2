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

  const handleClearFilters = () => {
    setSelectedYear("ทั้งหมด");
    setSelectedMonth("ทั้งหมด");
    setStatusFilter("ทั้งหมด");
    setSearchText("");
  };

  const filterJobs = (job) => {
    if (!job.delivery_date) return false;
    const date = new Date(job.delivery_date);
    const jobYear = date.getFullYear().toString();
    const jobMonth = date.getMonth();
    const selectedMonthIndex = months.indexOf(selectedMonth);

    if (selectedYear !== "ทั้งหมด" && jobYear !== selectedYear) return false;
    if (selectedMonth !== "ทั้งหมด" && jobMonth !== selectedMonthIndex) return false;

    if (statusFilter === "ยังไม่ถึง" && job.currentStep === "Sales") return true;
    if (statusFilter === "กำลังทำ" && steps.includes(job.currentStep)) return true;
    if (statusFilter === "เสร็จแล้ว" && job.currentStep === "Completed") return true;
    if (statusFilter === "ทั้งหมด") return true;

    return false;
  };

  const filteredJobs = jobs
    .filter(filterJobs)
    .filter((job) =>
      job.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      job.customer?.toLowerCase().includes(searchText.toLowerCase()) ||
      job.batch_no?.toLowerCase().includes(searchText.toLowerCase())
    );

  const getTotalVolume = () => {
    return filteredJobs.reduce((sum, job) => {
      const vol = Number(job.volume);
      return sum + (isNaN(vol) ? 0 : vol);
    }, 0);
  };

  const renderStatusBadge = (label, value) => {
    let badgeClass = "status-badge pending";
    if (!value || value === "") value = "-";
    if (["ผลิตเสร็จ", "ตรวจผ่านแล้ว", "เตรียมพร้อมแล้ว", "Invoice ออกแล้ว"].includes(value)) {
      badgeClass = "status-badge completed";
    } else if (value.includes("กำลัง")) {
      badgeClass = "status-badge working";
    }
    return <span className={badgeClass}>{label}: {value}</span>;
  };

  const extractCurrentStatus = (job) => {
    switch (job.currentStep) {
      case "Account": return renderStatusBadge("AC", job.status?.account);
      case "QC": return renderStatusBadge("QC", job.status?.qc_inspection);
      case "Production": return renderStatusBadge("PD", job.status?.production);
      case "Warehouse": return renderStatusBadge("WH", job.status?.warehouse);
      case "Sales": return renderStatusBadge("SL", "กรอกแล้ว");
      case "Completed": return renderStatusBadge("✅", "เสร็จสมบูรณ์");
      default: return "-";
    }
  };

  const renderLastUpdate = (job) => {
    const logs = job.audit_logs;
    if (!logs || logs.length === 0) return "-";
    const lastLog = logs[logs.length - 1];
    const timeStr = new Date(lastLog.timestamp).toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    });
    return `ผู้บันทึกล่าสุด : ${lastLog.step} : ${timeStr}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataMap = { notStarted: "ยังไม่ถึง", doing: "กำลังทำ", done: "เสร็จแล้ว" };
      return (
        <div style={{ background: "white", border: "1px solid #ccc", borderRadius: "6px", padding: "10px", fontSize: "14px" }}>
          <strong>{label}</strong>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {payload.map((entry, index) => (
              <li key={index}>{dataMap[entry.dataKey]}: {entry.value}</li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  const stepStatus = {
    Sales: (job) => job.currentStep !== "Sales",
    Warehouse: (job) => job.status?.warehouse === "เบิกเสร็จ",
    Production: (job) => job.status?.production === "ผลิตเสร็จ",
    QC: (job) => job.status?.qc_inspection === "ตรวจผ่านแล้ว" && job.status?.qc_coa === "เตรียมพร้อมแล้ว",
    Account: (job) => job.status?.account === "Invoice ออกแล้ว",
  };

  const summaryPerStep = steps.map((step) => {
    const notStarted = filteredJobs.filter((j) => steps.indexOf(j.currentStep) > steps.indexOf(step)).length;
    const doing = filteredJobs.filter((j) => j.currentStep === step).length;
    const done = filteredJobs.filter((j) => stepStatus[step](j)).length;
    return { name: step, notStarted, doing, done };
  });

  const exportToExcel = () => {
    const dataToExport = filteredJobs.map((job) => ({
      "Batch No": job.batch_no || "–",
      "Product": job.product_name || "–",
      "Current Step": job.currentStep || "–",
      "Customer": job.customer || "–",
      "Volume (KG)": job.volume || "–",
      "Delivery Date": job.delivery_date || "–",
      "Last Update": renderLastUpdate(job),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EP Jobs");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "EP_Production_Jobs.xlsx");
  };

  const exportAllToExcel = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const allData = snapshot.docs.map((doc, index) => {
      const job = doc.data();
      return {
        "No.": index + 1,
        "Batch No": job.batch_no || "–",
        "Product": job.product_name || "–",
        "Customer": job.customer || "–",
        "Volume (KG)": job.volume || "–",
        "Delivery Date": job.delivery_date || "–",
        "Current Step": job.currentStep || "–",
        "Sales": job.status?.sales || "",
        "Warehouse": job.status?.warehouse || "",
        "Production": job.status?.production || "",
        "QC": `${job.status?.qc_inspection || ""} / ${job.status?.qc_coa || ""}`,
        "Account": job.status?.account || "",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Jobs");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `EP_All_Jobs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="page-container">
      <h2 style={{ marginTop: "0" }}>🏠 หน้าหลัก – ภาพรวมการทำงาน</h2>
      <hr style={{ margin: "1.5rem 0" }} />
      <h3>🔔 การแจ้งเตือนล่าสุด</h3>
      <div style={{ marginBottom: "1rem" }}>
        {notifications.length === 0 ? <div>ไม่มีการแจ้งเตือน</div> : notifications.map((noti) => (
          <div key={noti.id} style={{ background: "#fef3c7", padding: "10px", borderRadius: "6px", marginBottom: "6px", fontSize: "14px" }}>🚨 {noti.message}</div>
        ))}
      </div>
      <hr style={{ margin: "2rem 0" }} />
      <h3>🎛 ตัวกรอง</h3>
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
        <input type="text" placeholder="🔍 ค้นหา Product, Customer, Batch No" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="input-box" style={{ flexGrow: 1, minWidth: "200px", maxWidth: "400px" }} />
        <button className="clear-button" onClick={handleClearFilters}>♻️ Reset</button>
      </div>
      <hr style={{ margin: "2rem 0" }} />
      <h3>📦 รวมยอดผลิตในเดือนนี้: {getTotalVolume().toLocaleString()} KG</h3>
      <hr style={{ margin: "2rem 0" }} />
      <h3>🔴 ความคืบหน้าของงานแต่ละชุด</h3>
      <ProgressBoard jobs={filteredJobs} />
      <hr style={{ margin: "2rem 0" }} />
      <h3>📊 สรุปสถานะงานรายแผนก</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart layout="vertical" data={summaryPerStep}>
          <XAxis type="number" hide={true} />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="notStarted" stackId="a" fill="#d1d5db" />
          <Bar dataKey="doing" stackId="a" fill="#facc15" />
          <Bar dataKey="done" stackId="a" fill="#4ade80" />
        </BarChart>
      </ResponsiveContainer>
      <hr style={{ margin: "2rem 0" }} />
      <h3>📋 รายการงานทั้งหมด</h3>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <label>
          <input type="checkbox" checked={showAllStatus} onChange={(e) => setShowAllStatus(e.target.checked)} style={{ marginRight: "8px" }} />
          🔄 แสดงสถานะแบบละเอียด
        </label>
        <div>
          <button onClick={exportToExcel} className="submit-btn" style={{ marginRight: "8px" }}>
            📥 Export Excel (ตามตัวกรอง)
          </button>
          <button onClick={exportAllToExcel} className="submit-btn">
            📦 Export ข้อมูลทั้งหมด
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="job-table">
          <thead>
            <tr>
              <th>Batch No</th>
              <th>Product</th>
              <th>Current Step</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Volume</th>
              <th>Delivery Date</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id} onClick={() => setSelectedJob(job)} style={{ cursor: "pointer" }}>
                <td>{job.batch_no || "–"}</td>
                <td>{job.product_name || "–"}</td>
                <td>{job.currentStep || "–"}</td>
                <td className="status-cell">
                  {showAllStatus ? (
                    <>
                      {renderStatusBadge("SL", "กรอกแล้ว")}
                      {renderStatusBadge("WH", job.status?.warehouse)}
                      {renderStatusBadge("PD", job.status?.production)}
                      {renderStatusBadge("QC", job.status?.qc_inspection)}
                      {renderStatusBadge("COA", job.status?.qc_coa)}
                      {renderStatusBadge("AC", job.status?.account)}
                    </>
                  ) : extractCurrentStatus(job)}
                </td>
                <td>{job.customer || "–"}</td>
                <td>{job.volume || "–"}</td>
                <td>{job.delivery_date || "–"}</td>
                <td>{renderLastUpdate(job)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
