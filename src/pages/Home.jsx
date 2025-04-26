// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import ProgressBoard from "./ProgressBoard";
import JobDetailModal from "./JobDetailModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
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
  const handleDeleteJob = async (id) => {
    const confirmDelete = window.confirm("❗ ยืนยันต้องการลบงานนี้หรือไม่?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "production_workflow", id));
      toast.success("🗑️ ลบงานเรียบร้อยแล้ว");
      const snapshot = await getDocs(collection(db, "production_workflow"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการลบงาน:", error);
      toast.error("❌ ลบงานไม่สำเร็จ");
    }
  };

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

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const getValue = (job, col) => {
      if (col === "delivery_date") return new Date(job[col] || "");
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

  return (
    <div className="page-container">
      <h2>🏠 หน้าหลัก – ภาพรวมการทำงาน</h2>

      {/* 🎛 ตัวกรอง */}
      {/* (Filter และ Search ตามที่พี่มีอยู่) */}

      {/* 📦 รวมยอดผลิตในเดือนนี้ */}
      <h3>📦 รวมยอดผลิตในเดือนนี้: {getTotalVolume().toLocaleString()} KG</h3>

      {/* 🔴 ความคืบหน้าของงานแต่ละชุด */}
      <h3>🔴 ความคืบหน้าของงานแต่ละชุด</h3>
      <ProgressBoard jobs={filteredJobs} />

      {/* 📊 สรุปสถานะงานรายแผนก */}
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

      {/* 📋 รายการงานทั้งหมด */}
      <h3>📋 รายการงานทั้งหมด</h3>

      <div className="table-wrapper">
        <table className="job-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>PO</th>
              <th>BN WH1</th>
              <th>BN WH2</th>
              <th>BN WH3</th>
              <th>BN PD</th>
              <th>Product</th>
              <th>Current Step</th>
              <th>Status</th>
              <th>Volume</th>
              <th>Delivery Date</th>
              <th>Last Update</th>
              <th>Action</th>
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
                <td style={{ textAlign: "center" }}>
                  {(role === "Admin" || role === "Sales") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteJob(job.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "red",
                        cursor: "pointer",
                        fontSize: "1.2rem"
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📋 Job Detail Modal */}
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
