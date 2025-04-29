// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import ProgressBoard from "../components/ProgressBoard";
import DepartmentSummaryChart from "../components/DepartmentSummaryChart";
import { fetchJobsFromFirestore } from "../utils/firestoreUtils";
import { exportToExcel } from "../utils/excelUtils";
import "../styles/Responsive.css";

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchJobsFromFirestore(setJobs);
  }, []);

  useEffect(() => {
    let filtered = [...jobs];

    if (selectedYear) {
      filtered = filtered.filter((job) =>
        new Date(job.created_at).getFullYear().toString() === selectedYear
      );
    }

    if (selectedMonth) {
      const monthIndex = getMonthIndex(selectedMonth);
      filtered = filtered.filter((job) =>
        new Date(job.created_at).getMonth() === monthIndex
      );
    }

    if (statusFilter === "ยังไม่เริ่ม") {
      filtered = filtered.filter((job) => job.currentStep !== "Completed");
    } else if (statusFilter === "เสร็จสิ้นแล้ว") {
      filtered = filtered.filter((job) => job.currentStep === "Completed");
    }

    setFilteredJobs(filtered);
  }, [jobs, selectedYear, selectedMonth, statusFilter]);

  const getMonthIndex = (thaiMonth) => {
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months.indexOf(thaiMonth);
  };

  const clearFilters = () => {
    setSelectedYear("");
    setSelectedMonth("");
    setStatusFilter("");
  };
  return (
    <div className="page-container">
      <h2>🏠 <strong>หน้าหลัก – ภาพรวมการทำงาน</strong></h2>

      {/* 🔎 Filters */}
      <div className="filter-row">
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input-box">
          <option value="">ปี</option>
          {["2025", "2026", "2027", "2028", "2029", "2030"].map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="input-box">
          <option value="">เดือน</option>
          {[
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
          ].map((month) => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-box">
          <option value="">ทุกสถานะ</option>
          <option value="ยังไม่เริ่ม">ยังไม่เริ่ม</option>
          <option value="เสร็จสิ้นแล้ว">เสร็จสิ้นแล้ว</option>
        </select>

        <button onClick={clearFilters} className="clear-button">❌ ล้างตัวกรอง</button>
        <button onClick={() => exportToExcel(filteredJobs)} className="submit-btn">📥 ส่งออก Excel</button>
      </div>

      {/* 📦 รวมยอดผลิตในเดือนนี้ */}
      <div className="summary-box">
        📦 <strong>รวมยอดผลิตในเดือนนี้:</strong> {filteredJobs.length.toLocaleString()} หน่วย
      </div>

      {/* 🔴 ความคืบหน้าของงานแต่ละชุด */}
      <div className="section-box">
        <h3>🔴 <strong>ความคืบหน้าของงานแต่ละชุด</strong></h3>
        <ProgressBoard jobs={filteredJobs} />
      </div>

      {/* 📊 แผนภูมิสถานะงานรายแผนก */}
      <div className="section-box">
        <h3>📊 <strong>สรุปสถานะงานรายแผนก</strong></h3>
        <DepartmentSummaryChart jobs={filteredJobs} />
      </div>
      {/* 📋 รายการงานทั้งหมด */}
      <div className="section-box">
        <h3>📋 <strong>รายการงานทั้งหมด</strong></h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Batch No</th>
              <th>สินค้า</th>
              <th>ลูกค้า</th>
              <th>ปริมาณ</th>
              <th>วันที่ส่ง</th>
              <th>ขั้นตอนปัจจุบัน</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job, index) => (
              <tr key={index}>
                <td>{job.batch_no_production || job.batch_no_warehouse?.join(", ") || "-"}</td>
                <td>{job.product_name}</td>
                <td>{job.customer}</td>
                <td>{job.volume}</td>
                <td>{job.delivery_date}</td>
                <td>{job.currentStep}</td>
                <td>
                  {/* สถานะเป็น Badge สี */}
                  <span className={
                    job.currentStep === "Completed" ? "status-green" :
                    job.currentStep === "Production" || job.currentStep === "QC" || job.currentStep === "Account" ? "status-yellow" :
                    "status-red"
                  }>
                    {job.status?.[job.currentStep?.toLowerCase()] || "-"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
