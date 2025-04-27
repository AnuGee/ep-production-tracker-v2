// src/pages/Home.jsx
// ✅ Merge เวอร์ชันเต็ม + เพิ่ม Export, Badge, Sort คอลัมน์ + Highlight คอลัมน์ที่กำลัง Sort และแถว hover
import React, { useEffect, useState } from "react";
import ProgressBoard from "./ProgressBoard";
import JobDetailModal from "./JobDetailModal";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { doc, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/Responsive.css";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { role } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedYear, setSelectedYear] = useState("ทั้งหมด");
  const [selectedMonth, setSelectedMonth] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [searchText, setSearchText] = useState("");
  const [showAllStatus, setShowAllStatus] = useState(false);
  const [sortColumn, setSortColumn] = useState("Delivery Date");
  const [sortDirection, setSortDirection] = useState("asc");

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .job-table thead th.sorted {
        background-color: #fef9c3;
      }
      .job-table tbody tr:hover {
        background-color: #f3f4f6;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const years = ["ทั้งหมด", "2025", "2026", "2027", "2028", "2029", "2030"];
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

  useEffect(() => {
    const fetchJobs = async () => {
      const snapshot = await getDocs(collection(db, "production_workflow"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
    };
    fetchJobs();
  }, []);

  const getBatchNoWH = (job, index) => {
    return job.batch_no_warehouse?.[index] || "–";
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
    .filter((job) => {
      const search = searchText.toLowerCase();
      return (
        job.product_name?.toLowerCase().includes(search) ||
        job.customer?.toLowerCase().includes(search) ||
        job.batch_no_production?.toLowerCase().includes(search)
      );
    });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

const sortedJobs = [...filteredJobs].sort((a, b) => {
  const getValue = (job, col) => {
    if (col === "delivery_date") return new Date(job[col] || "");
    if (col === "bn_wh1") return job.batch_no_warehouse?.[0] || "";
    if (col === "bn_wh2") return job.batch_no_warehouse?.[1] || "";
    if (col === "bn_wh3") return job.batch_no_warehouse?.[2] || "";
    if (col === "status") return job.status?.production || job.status?.warehouse || job.status?.qc_inspection || job.status?.sales || "";
    if (col === "last_update") return new Date(job.audit_logs?.at(-1)?.timestamp || 0);
    return (job[col] || "").toString().toLowerCase();
  };

  const valA = getValue(a, sortColumn);
  const valB = getValue(b, sortColumn);
  if (sortDirection === "asc") return valA > valB ? 1 : -1;
  return valA < valB ? 1 : -1;
});


  const getTotalVolume = () => {
    return filteredJobs.reduce((sum, job) => {
      const vol = Number(job.volume);
      return sum + (isNaN(vol) ? 0 : vol);
    }, 0);
  };

  const handleDeleteJob = async (id) => {
  const confirmDelete = window.confirm("❗ ยืนยันต้องการลบงานนี้หรือไม่?");
  if (!confirmDelete) return;
  try {
    await deleteDoc(doc(db, "production_workflow", id));
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data);
    alert("✅ ลบงานเรียบร้อยแล้ว");
  } catch (error) {
    console.error(error);
    alert("❌ ลบงานไม่สำเร็จ");
  }
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

  const exportToExcel = () => {
    const dataToExport = filteredJobs.map((job) => ({
      "Customer": job.customer || "–",
      "PO": job.po_number || "–",
      "WH1": getBatchNoWH(job, 0),
      "WH2": getBatchNoWH(job, 1),
      "WH3": getBatchNoWH(job, 2),
      "PD": job.batch_no_production || "–",
      "Product": job.product_name || "–",
      "Current Step": job.currentStep || "–",
      "Status": job.status?.production || job.status?.warehouse || job.status?.qc_inspection || job.status?.sales || "–",
      "Volume": job.volume || "–",
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
      <h2 style={{ marginTop: 0 }}>🏠 หน้าหลัก – ภาพรวมการทำงาน</h2>

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

      <hr style={{ margin: '2rem 0' }} />
<h3 style={{ color: '#1f2937', fontSize: '1.5rem', backgroundColor: '#e0f2fe', padding: '0.5rem 1rem', borderRadius: '8px' }}>📦 รวมยอดผลิตในเดือนนี้: {getTotalVolume().toLocaleString()} KG</h3>

      <hr style={{ margin: '2rem 0' }} />
<h3>🔴 ความคืบหน้าของงานแต่ละชุด</h3>
      <ProgressBoard jobs={filteredJobs} />

      <hr style={{ margin: '2rem 0' }} />
<h3>📊 สรุปสถานะงานรายแผนก</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart layout="vertical" data={summaryPerStep}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip />
          <Bar dataKey="notStarted" stackId="a" fill="#d1d5db" />
          <Bar dataKey="doing" stackId="a" fill="#facc15" />
          <Bar dataKey="done" stackId="a" fill="#4ade80" />
        </BarChart>
      </ResponsiveContainer>

      <hr style={{ margin: '2rem 0' }} />
<h3>📋 รายการงานทั้งหมด</h3>
<div style={{ display: "flex", justifyContent: "space-between", margin: "1rem 0" }}>
  <label>
    <input
      type="checkbox"
      checked={showAllStatus}
      onChange={(e) => setShowAllStatus(e.target.checked)}
      style={{ marginRight: "8px" }}
    />
    🔄 แสดงสถานะแบบละเอียด
  </label>
  <div>
    <button onClick={exportToExcel} className="submit-btn" style={{ marginRight: "8px" }}>📥 Export (กรอง)</button>
    <button onClick={exportAllToExcel} className="submit-btn" style={{ marginRight: "8px" }}>📦 Export ทั้งหมด</button>
  </div>
</div>
<div className="table-wrapper">
  <table className="job-table">
    <thead>
      <tr>
        <th onClick={() => handleSort("customer")} style={{ minWidth: "100px", cursor: "pointer" }}>
          Customer {sortColumn === "customer" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("po_number")} style={{ minWidth: "100px", cursor: "pointer" }}>
          PO {sortColumn === "po_number" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("bn_wh1")} style={{ minWidth: "80px", cursor: "pointer" }}>
          BN WH1 {sortColumn === "bn_wh1" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("bn_wh2")} style={{ minWidth: "80px", cursor: "pointer" }}>
          BN WH2 {sortColumn === "bn_wh2" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("bn_wh3")} style={{ minWidth: "80px", cursor: "pointer" }}>
          BN WH3 {sortColumn === "bn_wh3" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("batch_no_production")} style={{ minWidth: "80px", cursor: "pointer" }}>
          BN PD {sortColumn === "batch_no_production" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("product_name")} style={{ minWidth: "120px", cursor: "pointer" }}>
          Product {sortColumn === "product_name" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("currentStep")} style={{ minWidth: "100px", cursor: "pointer" }}>
          Current Step {sortColumn === "currentStep" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("status")} style={{ minWidth: "100px", cursor: "pointer" }}>
          Status {sortColumn === "status" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("volume")} style={{ minWidth: "80px", cursor: "pointer" }}>
          Volume {sortColumn === "volume" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("delivery_date")} style={{ minWidth: "120px", cursor: "pointer" }}>
          Delivery Date {sortColumn === "delivery_date" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th onClick={() => handleSort("last_update")} style={{ minWidth: "160px", cursor: "pointer" }}>
          Last Update {sortColumn === "last_update" && (sortDirection === "asc" ? "🔼" : "🔽")}
        </th>
        <th style={{ minWidth: "60px" }}>ลบ</th>
      </tr>
    </thead>
    <tbody>
      {sortedJobs.map((job) => (
        <tr key={job.id} onClick={() => setSelectedJob(job)}>
          <td>{job.customer || "–"}</td>
          <td>{job.po_number || "–"}</td>
          <td>{getBatchNoWH(job, 0)}</td>
          <td>{getBatchNoWH(job, 1)}</td>
          <td>{getBatchNoWH(job, 2)}</td>
          <td>{job.batch_no_production || "–"}</td>
          <td>{job.product_name || "–"}</td>
          <td>{job.currentStep || "–"}</td>
          <td>
            {showAllStatus ? (
              <>
                {renderStatusBadge("SL", "กรอกแล้ว")}
                {renderStatusBadge("WH", job.status?.warehouse)}
                {renderStatusBadge("PD", job.status?.production)}
                {renderStatusBadge("QC", job.status?.qc_inspection)}
                {renderStatusBadge("COA", job.status?.qc_coa)}
                {renderStatusBadge("AC", job.status?.account)}
              </>
            ) : (
              renderStatusBadge("STEP", job.status?.production || job.status?.warehouse || job.status?.qc_inspection || job.status?.sales || "–")
            )}
          </td>
          <td>{job.volume || "–"}</td>
          <td>{job.delivery_date || "–"}</td>
          <td>{renderLastUpdate(job)}</td>
          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
            {(role === "Admin" || role === "Sales") && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteJob(job.id);
                }}
                style={{
                  backgroundColor: "red",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                ลบ
              </button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{selectedJob && (
  <div className="overlay" onClick={() => setSelectedJob(null)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  </div>
)}
    </div>
  );
}
