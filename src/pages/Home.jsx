// src/pages/Home.jsx
// ✅ Merge เวอร์ชันเต็ม + เพิ่ม Export, Badge, Sort คอลัมน์ + Highlight คอลัมน์ที่กำลัง Sort และแถว hover
// ✅ เพิ่ม Click & Drag Scroll ตาราง
import React, { useEffect, useState, useRef, useCallback } from "react"; // <<< เพิ่ม useRef, useCallback
import ProgressBoard from "./ProgressBoard";
import JobDetailModal from "../components/JobDetailModal";
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
  const [allData, setAllData] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedYear, setSelectedYear] = useState("ทั้งหมด");
  const [selectedMonth, setSelectedMonth] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState("customer");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPageProgress, setCurrentPageProgress] = useState(1);
  const [itemsPerPageProgress, setItemsPerPageProgress] = useState(10);

  // --- State และ Ref สำหรับการลาก (เพิ่มเข้ามา) ---
  const tableWrapperRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  const [wasDragging, setWasDragging] = useState(false);
  // ------------------------------------------------

  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const years = ["ทั้งหมด", "2025", "2026", "2027", "2028", "2029", "2030"];
  const steps = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"]; // Removed COA as it's part of QC visually

  // --- Handlers สำหรับการลาก (เพิ่มเข้ามา) ---
  const handleMouseDown = (e) => {
    if (!tableWrapperRef.current) return;

    setWasDragging(false); // รีเซ็ตทุกครั้งที่เริ่มกด
    setIsDragging(true);
    setStartX(e.pageX - tableWrapperRef.current.offsetLeft);
    setScrollLeftStart(tableWrapperRef.current.scrollLeft);
    tableWrapperRef.current.style.cursor = 'grabbing';
    tableWrapperRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !tableWrapperRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableWrapperRef.current.offsetLeft;
    const walk = x - startX;
    tableWrapperRef.current.scrollLeft = scrollLeftStart - walk;
    if (Math.abs(walk) > 10) { // Threshold
        setWasDragging(true);
    }
  }, [isDragging, startX, scrollLeftStart]);

  const handleMouseUpOrLeave = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (tableWrapperRef.current) {
        tableWrapperRef.current.style.cursor = 'grab';
        tableWrapperRef.current.style.userSelect = 'auto';
    }
  }, [isDragging]);
  // ------------------------------------------------

  // --- useEffect จัดการ global listeners (เพิ่มเข้ามา) ---
   useEffect(() => {
    // ใช้ wrapper function เพื่อให้ useCallback ทำงานกับ event listener ได้ถูกต้อง
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUpOrLeave();

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (tableWrapperRef.current) {
          tableWrapperRef.current.style.cursor = 'grab';
          tableWrapperRef.current.style.userSelect = 'auto';
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUpOrLeave]);
  // -------------------------------------------------

  // --- โค้ดส่วนที่เหลือ (เหมือนเดิมจากไฟล์ที่คุณอัปโหลด) ---
  const getStepStatus = (job, step) => {
    if (!job || !job.status) return "notStarted";
    const currentStep = job.currentStep;
    const status = job.status;

    switch (step) {
      case "Sales": return currentStep !== "Sales" ? "done" : "doing";
      case "Warehouse": {
        const hasBatchNo = Array.isArray(job.batch_no_warehouse) && job.batch_no_warehouse.length > 0;
        const wh = status.warehouse ?? "";
        const passed = ["Production", "QC", "COA", "Account", "Completed"].includes(currentStep);
        const isPassedByBatch = hasBatchNo && (wh === "" || wh === undefined);
        if (passed || wh === "เบิกเสร็จ" || isPassedByBatch) return "done";
        if (["ยังไม่เบิก", "กำลังเบิก"].includes(wh)) return "doing";
        return "notStarted";
      }
      case "Production": {
        const pd = status.production;
        
       // ✅ เพิ่มเงื่อนไขพิเศษ: กรณีมีของครบใน WH → ข้าม Production → ไป COA เลย
          const skipProduction =
            Array.isArray(job.batch_no_warehouse) &&
            job.batch_no_warehouse.length > 0 &&
            !pd &&
            !status.qc_inspection &&  // ยังไม่ได้ตรวจ
            ["QC", "COA", "Account", "Completed"].includes(currentStep);
        
          if (skipProduction) return "done";
        
          if (currentStep === "QC" && status.qc_inspection === "skip") return "done";
          if (["กำลังผลิต", "รอผลตรวจ", "กำลังบรรจุ"].includes(pd)) return "doing";
          if (["QC", "COA", "Account", "Completed"].includes(currentStep)) return "done";
          return "notStarted";
        }
  case "QC": {
    const qc = status.qc_inspection;
    const coa = status.qc_coa;
  
    if (["กำลังตรวจ", "กำลังตรวจ (Hold)", "กำลังตรวจ (รอปรับ)"].includes(qc)) return "doing";
    if (qc === "ตรวจผ่านแล้ว") return "done";
  
    // ✅ กรณีข้ามไป COA แล้วเริ่มทำ
    if (["ยังไม่เตรียม", "กำลังเตรียม"].includes(coa)) return "doing";
    if (coa === "เตรียมพร้อมแล้ว") return "done";
  
    if (["COA", "Account", "Completed"].includes(currentStep)) return "done";
  
    return "notStarted";
  }

case "Logistics": {
  const volume = Number(job.volume || 0);
  const delivered = (job.delivery_logs || []).reduce(
    (sum, d) => sum + Number(d.quantity || 0), 0
  );

  if (delivered === 0) return "notStarted";
  else if (delivered >= volume) return "done";
  else return "doing";
}
        
  case "Account": {
    const ac = status.account;
    if (ac === "Invoice ออกแล้ว") return "done";
    if (ac === "Invoice ยังไม่ออก") return "doing";
    return "notStarted";
  }

  default: return "notStarted";
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
  const snapshot = await getDocs(collection(db, "production_workflow"));
  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  setAllData(data); // ✅ สำคัญ
};
    fetchJobs();
  }, []);

  const getBatchNoWH = (job, index) => job.batch_no_warehouse?.[index] || "–";

  const renderLastUpdate = (job) => {
    const logs = job.audit_logs;
    if (!logs || logs.length === 0) return "-";
    const lastLog = logs[logs.length - 1];
    const timeStr = new Date(lastLog.timestamp).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
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
    try {
      const date = new Date(job.delivery_date);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date for job ${job.id}: ${job.delivery_date}`);
        return false;
      }
      const jobYear = date.getFullYear().toString();
      const jobMonth = date.getMonth();
      const selectedMonthIndex = months.indexOf(selectedMonth);
  
      if (selectedYear !== "ทั้งหมด" && jobYear !== selectedYear) return false;
      if (selectedMonth !== "ทั้งหมด" && jobMonth !== selectedMonthIndex) return false;
  
      if (statusFilter !== "ทั้งหมด") {
        const current = job.currentStep;
        if (statusFilter === "ยังไม่ถึง" && current !== "Sales") return false;
        if (statusFilter === "กำลังทำ" && (current === "Sales" || current === "Completed")) return false;
        if (statusFilter === "เสร็จแล้ว" && current !== "Completed") return false;
      }

        return true;

    } catch (error) {
        console.error(`Error processing date for job ${job.id}: ${job.delivery_date}`, error);
        return false;
    }
  };

  // ✅ ฟังก์ชันใหม่: แปลงข้อมูลตามรอบการส่ง
  const expandJobsByDeliveryLogs = (jobs) => {
    return jobs.flatMap(job => {
      const deliveryLogs = job.delivery_logs || [];
      
      // ถ้าไม่มี delivery_logs หรือยังไม่มีการส่งของ ให้คืนค่า job เดิม
      if (deliveryLogs.length === 0) {
        return [job];
      }
      
      // ถ้ามี delivery_logs ให้แยกเป็นหลาย job ตามแต่ละ log
      return deliveryLogs.map(log => ({
        ...job,
        _isDeliveryLog: true, // เพิ่ม flag เพื่อระบุว่าเป็น job ที่แยกจาก delivery_log
        _deliveryQuantity: log.quantity, // เก็บปริมาณที่ส่งในรอบนี้
        _deliveryDate: log.date, // เก็บวันที่ส่งในรอบนี้
        product_name_with_quantity: `${job.product_name}-${log.quantity}KG`, // สร้างชื่อที่มี -xxxKG ต่อท้าย
        po_number_with_quantity: `${job.po_number}-${log.quantity}KG` // สร้าง PO ที่มี -xxxKG ต่อท้าย
      }));
    });
  };

  // ✅ สำหรับ 📋 รายการงานทั้งหมด
  const filteredJobs = allData.filter((job) => {
    const po = job.po_number || "";
    const hasKG = po.includes("KG");
    const deliveryTotal = (job.delivery_logs || []).reduce(
      (sum, d) => sum + Number(d.quantity || 0), 0
    );

    if (hasKG) return true;
    if (deliveryTotal === 0) return true;

    const hasSub = allData.some((j) => {
      const subPo = j.po_number || "";
      return subPo !== po && subPo.startsWith(po) && subPo.includes("KG");
    });

    return !hasSub;
  });

// ✅ สำหรับ 🔴 ความคืบหน้าของงานแต่ละชุด
const filteredJobsForProgress = allData.filter((job) => {
  const po = job.po_number || "";
  const hasKG = po.includes("KG");
  const deliveryTotal = (job.delivery_logs || []).reduce(
    (sum, d) => sum + Number(d.quantity || 0), 0
  );
  const volume = Number(job.volume);
  const isValidVolume = !isNaN(volume);
  const isCompleted = job.currentStep === "Completed";

  // กรณีมี -xxxKG ในชื่อ (แบ่งส่ง) ให้แสดงเสมอ
  if (hasKG) return true;
  
  // กรณียังไม่มีการส่งของ ให้แสดงเสมอ
  if (deliveryTotal === 0) return true;
  
  // กรณีงานเสร็จสมบูรณ์แล้ว (Completed) ให้แสดงด้วย
  if (isCompleted) return true;
  
  // ตรวจสอบว่ามีรายการย่อยที่แบ่งส่งหรือไม่
  const hasSub = allData.some((j) => {
    const subPo = j.po_number || "";
    return subPo !== po && subPo.startsWith(po) && subPo.includes("KG");
  });
  
  // กรณีส่งครบในรอบเดียวและไม่มีรายการย่อย ให้แสดง
  if (isValidVolume && deliveryTotal >= volume && !hasSub) return true;
  
  // ถ้ามีรายการย่อย ไม่แสดงรายการหลัก
  return !hasSub;
});

  // ✅ แปลงข้อมูลตามรอบการส่งสำหรับ Progress Board
  const expandedJobsForProgress = expandJobsByDeliveryLogs(filteredJobsForProgress);
  const progressJobs = expandedJobsForProgress;

  const summaryPerStep = steps.map((step) => {
    let notStarted = 0;
    let doing = 0;
    let done = 0;

    filteredJobsForProgress.forEach((job) => {
      const status = getStepStatus(job, step);
      if (status === "done") done++;
      else if (status === "doing") doing++;
      else notStarted++;
    });

    return { name: step, notStarted, doing, done };
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // ✅ แปลงข้อมูลตามรอบการส่งสำหรับรายการงานทั้งหมด
  const expandedJobs = expandJobsByDeliveryLogs(filteredJobs);
  const sortedJobs = [...expandedJobs].sort((a, b) => {
    const getValue = (job, col) => {
      if (col === "delivery_date") {
          const dateA = new Date(a.delivery_date || 0);
          const dateB = new Date(b.delivery_date || 0);
          return isNaN(dateA.getTime()) ? (isNaN(dateB.getTime()) ? 0 : -1) : (isNaN(dateB.getTime()) ? 1 : dateA - dateB);
       }
       if (col === "bn_wh1") return job.batch_no_warehouse?.[0]?.toLowerCase() || "";
       if (col === "bn_wh2") return job.batch_no_warehouse?.[1]?.toLowerCase() || "";
       if (col === "bn_wh3") return job.batch_no_warehouse?.[2]?.toLowerCase() || "";
       if (col === "status") return job.currentStep?.toLowerCase() || "";
       if (col === "last_update") {
           const timeA = new Date(a.audit_logs?.at(-1)?.timestamp || 0);
           const timeB = new Date(b.audit_logs?.at(-1)?.timestamp || 0);
           return isNaN(timeA.getTime()) ? (isNaN(timeB.getTime()) ? 0 : -1) : (isNaN(timeB.getTime()) ? 1 : timeA - timeB);
       }
       const val = job[col];
       if (typeof val === 'number') return val;
       return (val || "").toString().toLowerCase();
    };

    const valA = getValue(a, sortColumn);
    const valB = getValue(b, sortColumn);

    if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
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
      setJobs(prevJobs => prevJobs.filter(job => job.id !== id));
      alert("✅ ลบงานเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("❌ ลบงานไม่สำเร็จ: " + error.message);
    }
  };

  const renderStatusBadge = (label, step, job) => {
    if (!job || !job.currentStep) return null;
    const stepOrder = ["Sales", "Warehouse", "Production", "QC", "COA", "Logistics", "Account", "Completed"];
    const currentIndex = stepOrder.indexOf(job.currentStep);
    const stepIndex = stepOrder.indexOf(step);
    let badgeClass = "status-badge pending";
    let statusValue = "–";

    if (currentIndex > stepIndex) {
        badgeClass = "status-badge completed";
        statusValue = "ผ่านแล้ว";
    } else if (currentIndex === stepIndex) {
        badgeClass = "status-badge working";
    }
    
    if (job.status) {
        let specificStatus = "";
        switch (step) {
            case "Sales": specificStatus = job.status.sales || ""; break;
            case "Warehouse": specificStatus = job.status.warehouse || ""; break;
            case "Production": specificStatus = job.status.production || ""; break;
            case "QC": specificStatus = job.status.qc_inspection || ""; break;
            case "COA": specificStatus = job.status.qc_coa || ""; break;
            case "Logistics": {
              const volume = Number(job.volume || 0);
              const delivered = (job.delivery_logs || []).reduce(
                (sum, d) => sum + Number(d.quantity || 0),
                0
              );
              if (delivered === 0) specificStatus = "ยังไม่ส่ง";
              else if (delivered >= volume) specificStatus = "ส่งครบแล้ว";
              else specificStatus = `ส่งบางส่วน`;
              break;
            }
            case "Account": specificStatus = job.status.account || ""; break;
        }

        if (badgeClass === "status-badge working" && specificStatus) {
            statusValue = specificStatus;
        } else if (badgeClass === "status-badge completed") {
            if (step === "Warehouse" && job.status.warehouse === "เบิกเสร็จ") {
                statusValue = "เบิกเสร็จ";
            } else if (step === "QC" && job.status.qc_inspection === "ตรวจผ่านแล้ว"){
                statusValue = "ตรวจผ่านแล้ว";
            } else if (step === "COA" && job.status.qc_coa === "เตรียมพร้อมแล้ว"){
                statusValue = "พร้อมแล้ว";
              } else if (step === "Logistics") {
                statusValue = "ส่งครบแล้ว";
            } else if (step === "Account" && job.status.account === "Invoice ออกแล้ว"){
                statusValue = "Inv. ออกแล้ว";
            }
        } else if (badgeClass === "status-badge pending") {
            statusValue = "–";
        }
    }

    return (
        <div className={badgeClass}>
            {statusValue}
        </div>
    );
  };

  const handleExportExcel = () => {
    const exportData = sortedJobs.map((job) => {
      const currentDelivered = (job.delivery_logs || []).reduce(
        (sum, log) => sum + Number(log.quantity || 0),
        0
      );
      
      return {
        "PO": job.po_number || "-",
        "ลูกค้า": job.customer || "-",
        "สินค้า": job._isDeliveryLog ? job.product_name_with_quantity : job.product_name || "-",
        "ปริมาณ (KG)": job.volume || "-",
        "ส่งแล้ว (KG)": currentDelivered || "-",
        "วันที่ต้องส่ง": job.delivery_date || "-",
        "Batch No. 1": getBatchNoWH(job, 0),
        "Batch No. 2": getBatchNoWH(job, 1),
        "Batch No. 3": getBatchNoWH(job, 2),
        "สถานะ": job.currentStep || "-",
        "อัปเดตล่าสุด": renderLastUpdate(job),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "production_jobs.xlsx");
  };

  return (
    <div className="page-container">
      <h2>🏠 หน้าหลัก - ภาพรวมการผลิต</h2>

      <div className="dashboard-section">
        <div className="filter-section">
          <div className="filter-group">
            <label>📅 ปี:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📅 เดือน:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {months.map((month, index) => (
                <option key={index} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>🔍 สถานะ:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="ยังไม่ถึง">ยังไม่ถึง</option>
              <option value="กำลังทำ">กำลังทำ</option>
              <option value="เสร็จแล้ว">เสร็จแล้ว</option>
            </select>
          </div>

          <div className="filter-group">
            <label>🔍 ค้นหา:</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ค้นหา..."
            />
          </div>

          <button className="clear-btn" onClick={handleClearFilters}>
            ล้างตัวกรอง
          </button>
        </div>

        <div className="summary-section">
          <div className="summary-card">
            <h3>📊 สรุปงานทั้งหมด</h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">จำนวนงาน:</span>
                <span className="stat-value">{filteredJobs.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">ปริมาณรวม (KG):</span>
                <span className="stat-value">{getTotalVolume().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="chart-container">
            <h3>📈 ความคืบหน้าแต่ละขั้นตอน</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summaryPerStep} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="done" stackId="a" fill="#4ade80" name="เสร็จแล้ว" />
                <Bar dataKey="doing" stackId="a" fill="#facc15" name="กำลังทำ" />
                <Bar dataKey="notStarted" stackId="a" fill="#e5e7eb" name="ยังไม่เริ่ม" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="progress-section">
          <h3>🔴 ความคืบหน้าของงานแต่ละชุด</h3>
          <ProgressBoard jobs={progressJobs} />
        </div>

        <div className="jobs-section">
          <div className="section-header">
            <h3>📋 รายการงานทั้งหมด</h3>
            <button className="export-btn" onClick={handleExportExcel}>
              📥 Export Excel
            </button>
          </div>

          <div className="table-wrapper" ref={tableWrapperRef} onMouseDown={handleMouseDown}>
            <table className="jobs-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("po_number")} className={sortColumn === "po_number" ? `sort-${sortDirection}` : ""}>
                    PO {sortColumn === "po_number" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("customer")} className={sortColumn === "customer" ? `sort-${sortDirection}` : ""}>
                    ลูกค้า {sortColumn === "customer" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("product_name")} className={sortColumn === "product_name" ? `sort-${sortDirection}` : ""}>
                    สินค้า {sortColumn === "product_name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("volume")} className={sortColumn === "volume" ? `sort-${sortDirection}` : ""}>
                    ⚖️ Volume (KG.) {sortColumn === "volume" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("delivery_date")} className={sortColumn === "delivery_date" ? `sort-${sortDirection}` : ""}>
                    📅 วันที่ต้องส่ง {sortColumn === "delivery_date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("bn_wh1")} className={sortColumn === "bn_wh1" ? `sort-${sortDirection}` : ""}>
                    Batch No. 1 {sortColumn === "bn_wh1" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("bn_wh2")} className={sortColumn === "bn_wh2" ? `sort-${sortDirection}` : ""}>
                    Batch No. 2 {sortColumn === "bn_wh2" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("bn_wh3")} className={sortColumn === "bn_wh3" ? `sort-${sortDirection}` : ""}>
                    Batch No. 3 {sortColumn === "bn_wh3" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("status")} className={sortColumn === "status" ? `sort-${sortDirection}` : ""}>
                    สถานะ {sortColumn === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("last_update")} className={sortColumn === "last_update" ? `sort-${sortDirection}` : ""}>
                    อัปเดตล่าสุด {sortColumn === "last_update" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs.map((job) => (
                  <tr key={job.id || job.docId} className={job.currentStep === "Completed" ? "completed-row" : ""}>
                    <td>{job.po_number || "–"}</td>
                    <td>{job.customer || "–"}</td>
                    <td>{job._isDeliveryLog ? job.product_name_with_quantity : job.product_name || "–"}</td>
                    <td>{job.volume || "–"}</td>
                    <td>
                      {job.delivery_date
                        ? new Date(job.delivery_date).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "–"}
                    </td>
                    <td>{getBatchNoWH(job, 0)}</td>
                    <td>{getBatchNoWH(job, 1)}</td>
                    <td>{getBatchNoWH(job, 2)}</td>
                    <td>
                      <div className="status-badges">
                        {steps.map((step) => (
                          <div key={step} className="status-badge-container">
                            <div className="badge-label">{step}</div>
                            {renderStatusBadge(step, step, job)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>{renderLastUpdate(job)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="view-btn"
                          onClick={() => {
                            if (!wasDragging) setSelectedJob(job);
                          }}
                        >
                          👁️
                        </button>
                        {role === "admin" && (
                          <button
                            className="delete-btn"
                            onClick={() => {
                              if (!wasDragging) handleDeleteJob(job.id);
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
