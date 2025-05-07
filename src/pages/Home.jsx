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
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"]; // Removed COA as it's part of QC visually

  // --- Handlers สำหรับการลาก (เพิ่มเข้ามา) ---
  const handleMouseDown = (e) => {
    // ตรวจสอบว่าคลิกบน scrollbar หรือไม่ (ถ้าต้องการหลีกเลี่ยงการเริ่มลาก)
    // console.log('Target:', e.target);
    // console.log('Wrapper Scroll Width:', tableWrapperRef.current?.scrollWidth);
    // console.log('Wrapper Client Width:', tableWrapperRef.current?.clientWidth);
    // console.log('Mouse ClientX:', e.clientX);
    // console.log('Wrapper OffsetLeft:', tableWrapperRef.current?.offsetLeft);
    // console.log('Wrapper ScrollLeft:', tableWrapperRef.current?.scrollLeft);

    // เงื่อนไขนี้อาจจะต้องปรับปรุงให้แม่นยำขึ้น ถ้าต้องการป้องกันการลากเมื่อคลิก scrollbar จริงๆ
    // const scrollbarWidth = tableWrapperRef.current.offsetWidth - tableWrapperRef.current.clientWidth;
    // if (e.nativeEvent.offsetX >= tableWrapperRef.current.clientWidth - scrollbarWidth) {
    //    return; // ไม่เริ่มลากถ้าคลิกใกล้ scrollbar
    // }

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
       // Optional: Add mouseleave listener on the document body as a fallback
      // document.body.addEventListener('mouseleave', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      // document.body.removeEventListener('mouseleave', handleGlobalMouseUp);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      // document.body.removeEventListener('mouseleave', handleGlobalMouseUp);
       // คืนค่า style เผื่อ unmount ขณะกำลังลาก
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
    if (qc === "ตรวจผ่านแล้ว") return "done";
    if (["กำลังตรวจ", "กำลังตรวจ (Hold)", "กำลังตรวจ (รอปรับ)"].includes(qc)) return "doing";
    if (["COA", "Account", "Completed"].includes(currentStep)) return "done";
    return "notStarted";
  } // ←❗ ต้องมีการปิดบล็อกก่อนเริ่ม case ถัดไป

  case "COA": {
    const coa = status.qc_coa;
    if (coa === "เตรียมพร้อมแล้ว") return "done";
    if (["ยังไม่เตรียม", "กำลังเตรียม"].includes(coa)) return "doing";
    if (["Account", "Completed"].includes(currentStep)) return "done";
    return "notStarted";
  } // ←❗ สำคัญ: ปิดให้ครบก่อน case ถัดไป

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
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
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
    if (!job.delivery_date) return false; // Handle jobs without delivery date
    try {
        const date = new Date(job.delivery_date);
        // Check if date is valid before proceeding
        if (isNaN(date.getTime())) {
             console.warn(`Invalid date for job ${job.id}: ${job.delivery_date}`);
             return false; // Or handle as needed
        }
        const jobYear = date.getFullYear().toString();
        const jobMonth = date.getMonth(); // 0-11
        const selectedMonthIndex = months.indexOf(selectedMonth); // -1 if "ทั้งหมด"

        // Year filter
        if (selectedYear !== "ทั้งหมด" && jobYear !== selectedYear) return false;
        // Month filter
        if (selectedMonth !== "ทั้งหมด" && jobMonth !== selectedMonthIndex) return false;

        // Status filter based on currentStep
        if (statusFilter !== "ทั้งหมด") {
            const current = job.currentStep;
            if (statusFilter === "ยังไม่ถึง" && current !== "Sales") return false;
            // "กำลังทำ" includes all steps except Sales and Completed
            if (statusFilter === "กำลังทำ" && (current === "Sales" || current === "Completed")) return false;
            if (statusFilter === "เสร็จแล้ว" && current !== "Completed") return false;
        }

        return true; // Passes all filters

    } catch (error) {
        console.error(`Error processing date for job ${job.id}: ${job.delivery_date}`, error);
        return false; // Exclude job if date processing fails
    }
  };

  const filteredJobs = jobs
    .filter(filterJobs)
    .filter((job) => {
      const search = searchText.toLowerCase();
      // Ensure fields exist before calling toLowerCase
      const productNameMatch = job.product_name?.toLowerCase().includes(search);
      const customerMatch = job.customer?.toLowerCase().includes(search);
      const batchNoProdMatch = job.batch_no_production?.toLowerCase().includes(search);
      // Optionally search in Warehouse Batch Numbers
      const batchNoWHMatch = Array.isArray(job.batch_no_warehouse) &&
                             job.batch_no_warehouse.some(bn => bn?.toLowerCase().includes(search));

      return productNameMatch || customerMatch || batchNoProdMatch || batchNoWHMatch;
    });

  const summaryPerStep = steps.map((step) => {
    let notStarted = 0;
    let doing = 0;
    let done = 0;
    filteredJobs.forEach((job) => {
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

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const getValue = (job, col) => {
      if (col === "delivery_date") {
          // Handle potential invalid dates during sort
          const dateA = new Date(a.delivery_date || 0);
          const dateB = new Date(b.delivery_date || 0);
          return isNaN(dateA.getTime()) ? (isNaN(dateB.getTime()) ? 0 : -1) : (isNaN(dateB.getTime()) ? 1 : dateA - dateB);
       }
       if (col === "bn_wh1") return job.batch_no_warehouse?.[0]?.toLowerCase() || "";
       if (col === "bn_wh2") return job.batch_no_warehouse?.[1]?.toLowerCase() || "";
       if (col === "bn_wh3") return job.batch_no_warehouse?.[2]?.toLowerCase() || "";
       // Simplified status sort (consider complexity if needed)
       if (col === "status") return job.currentStep?.toLowerCase() || "";
       if (col === "last_update") {
           const timeA = new Date(a.audit_logs?.at(-1)?.timestamp || 0);
           const timeB = new Date(b.audit_logs?.at(-1)?.timestamp || 0);
           return isNaN(timeA.getTime()) ? (isNaN(timeB.getTime()) ? 0 : -1) : (isNaN(timeB.getTime()) ? 1 : timeA - timeB);
       }
       // Default string/number sort
       const val = job[col];
       if (typeof val === 'number') return val;
       return (val || "").toString().toLowerCase(); // Ensure lowercase comparison for strings
    };

    const valA = getValue(a, sortColumn);
    const valB = getValue(b, sortColumn);

    // Adjust sorting logic for specific columns if needed (e.g., dates already handled)
    if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    // String comparison
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
      // Instead of refetching all, just remove the job from the state
       setJobs(prevJobs => prevJobs.filter(job => job.id !== id));
      alert("✅ ลบงานเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("❌ ลบงานไม่สำเร็จ: " + error.message);
    }
  };

  const renderStatusBadge = (label, step, job) => {
    if (!job || !job.currentStep) return null;
    const stepOrder = ["Sales", "Warehouse", "Production", "QC", "COA", "Account", "Completed"];
    const currentIndex = stepOrder.indexOf(job.currentStep);
    const stepIndex = stepOrder.indexOf(step);
    let badgeClass = "status-badge pending"; // Default gray
    let statusValue = "–";

    if (currentIndex > stepIndex) {
        badgeClass = "status-badge completed"; // Green if past this step
        statusValue = "ผ่านแล้ว"; // Generic "Passed" status for simplicity on badge
    } else if (currentIndex === stepIndex) {
        badgeClass = "status-badge working"; // Yellow if currently at this step
    }
     // Determine specific status text if needed, especially for "working" state
     if (job.status) {
        let specificStatus = "";
        switch (step) {
            case "Sales": specificStatus = job.status.sales || ""; break; // Should be empty if done
            case "Warehouse": specificStatus = job.status.warehouse || ""; break;
            case "Production": specificStatus = job.status.production || ""; break;
            case "QC": specificStatus = job.status.qc_inspection || ""; break;
            case "COA": specificStatus = job.status.qc_coa || ""; break;
            case "Account": specificStatus = job.status.account || ""; break;
        }

         // Refine statusValue for the "working" badge based on specific status
         if (badgeClass === "status-badge working" && specificStatus) {
             statusValue = specificStatus;
         } else if (badgeClass === "status-badge completed") {
             // If completed, maybe show "เบิกเสร็จ", "ตรวจผ่านแล้ว" etc. if available?
             // Example for Warehouse:
             if (step === "Warehouse" && job.status.warehouse === "เบิกเสร็จ") {
                 statusValue = "เบิกเสร็จ";
             } else if (step === "QC" && job.status.qc_inspection === "ตรวจผ่านแล้ว"){
                  statusValue = "ตรวจผ่านแล้ว";
             } else if (step === "COA" && job.status.qc_coa === "เตรียมพร้อมแล้ว"){
                  statusValue = "พร้อมแล้ว";
             } else if (step === "Account" && job.status.account === "Invoice ออกแล้ว"){
                   statusValue = "Inv. ออกแล้ว";
             }
             // Keep default "ผ่านแล้ว" for others or if specific status isn't needed
         } else if (badgeClass === "status-badge pending") {
             statusValue = specificStatus || "ยังไม่เริ่ม"; // Show specific status if pending but has one? unlikely
         }
    }

     // Override for Sales if past it
     if (step === "Sales" && currentIndex > stepIndex) {
          statusValue = "กรอกแล้ว";
     }
     // Special case for QC skip in Production step
     if (step === "Production" && job.currentStep === "QC" && job.status?.qc_inspection === "skip"){
          badgeClass = "status-badge completed";
          statusValue = "ข้าม";
     }

    return (
      <span className={badgeClass} title={`${label}: ${statusValue}`}> {/* Add tooltip */}
        {label}{/*: {statusValue} */} {/* Keep label only for space? */}
      </span>
    );
  };

  const exportToExcel = () => {
     // Define headers matching the table display order
     const headers = [
        "Customer", "PO", "WH1", "WH2", "WH3", "PD", "Product",
        "Current Step", "Status Badges", "Volume", "Delivery Date", "Last Update"
    ];
     const dataToExport = sortedJobs.map((job) => ({ // Use sortedJobs to match table
        "Customer": job.customer || "–",
        "PO": job.po_number || "–",
        "WH1": getBatchNoWH(job, 0),
        "WH2": getBatchNoWH(job, 1),
        "WH3": getBatchNoWH(job, 2),
        "PD": job.batch_no_production || "–",
        "Product": job.product_name || "–",
        "Current Step": job.currentStep || "–",
         // Combine badge statuses into a single string or keep separate?
         // Simple approach: just list current step's status if available
         "Status Badges": job.status ?
             (job.status[getStepKey(job.currentStep)?.toLowerCase()] || job.currentStep)
             : job.currentStep || "–",
        "Volume": job.volume || "–",
        "Delivery Date": job.delivery_date || "–",
        "Last Update": renderLastUpdate(job),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EP Jobs (Filtered)");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `EP_Production_Jobs_${selectedYear}_${selectedMonth}.xlsx`);
  };

  const exportAllToExcel = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    // Define headers for the "All Jobs" export
     const headers = [
        "No.", "Product", "Customer", "Volume (KG)", "Delivery Date", "Current Step",
        "Sales Status", "WH Status", "PD Status", "QC Status", "COA Status", "ACC Status"
    ];
    const allData = snapshot.docs.map((doc, index) => {
      const job = { id: doc.id, ...doc.data() }; // Include ID if needed
      return {
        "No.": index + 1,
        "Product": job.product_name || "–",
        "Customer": job.customer || "–",
        "Volume (KG)": job.volume || "–",
        "Delivery Date": job.delivery_date || "–",
        "Current Step": job.currentStep || "–",
        "Sales Status": job.status?.sales || (job.currentStep !== "Sales" ? "Done" : "Pending"), // Example logic
        "WH Status": job.status?.warehouse || "–",
        "PD Status": job.status?.production || "–",
        "QC Status": job.status?.qc_inspection || "–",
        "COA Status": job.status?.qc_coa || "–",
        "ACC Status": job.status?.account || "–",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(allData, { header: headers });
    // Add auto-filter?
    // worksheet['!autofilter'] = { ref: worksheet['!ref'] };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All EP Jobs");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `EP_All_Jobs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getStepKey = (currentStep) => { // Helper for status access
    switch (currentStep) {
      case "Sales": return "sales";
      case "Warehouse": return "warehouse";
      case "Production": return "production";
      case "QC": return "qc_inspection"; // Or combine QC/COA?
      case "COA": return "qc_coa";
      case "Account": return "account";
      default: return "";
    }
  };

  // --- ส่วน JSX Return ---
  return (
    <div className="page-container">
      <h2 style={{ marginTop: 0 }}>🏠 หน้าหลัก – ภาพรวมการทำงาน</h2>

      {/* --- Filters --- */}
      <hr style={{ margin: "2rem 0" }} />
      <h3>🎛 ตัวกรอง</h3>
      <div className="filter-bar" style={{ display: 'flex', flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
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
          <option>ยังไม่ถึง</option> {/* Sales */}
          <option>กำลังทำ</option> {/* Not Sales or Completed */}
          <option>เสร็จแล้ว</option> {/* Completed */}
        </select>
        <input type="text" placeholder="🔍 ค้นหา Product, Customer, Batch No..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="input-box" style={{ flexGrow: 1, minWidth: "250px", maxWidth: "450px" }} />
        <button className="clear-button" onClick={handleClearFilters} style={{ padding: '6px 12px'}}>♻️ Reset</button>
      </div>

      {/* --- Total Volume --- */}
      <hr style={{ margin: '2rem 0' }} />
      <h3 className="total-volume">
        📦 รวมยอดผลิต ({selectedMonth} {selectedYear !== 'ทั้งหมด' ? selectedYear : ''}): {getTotalVolume().toLocaleString()} KG
      </h3>

      {/* --- Progress Board --- */}
      <hr style={{ margin: '2rem 0' }} />
      <h3>🔴 ความคืบหน้าของงานแต่ละชุด</h3>
      <div className="legend" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "1rem", marginTop: "1rem" }}>
        {/* Legend Items */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}> <div style={{ width: "16px", height: "16px", backgroundColor: "#4ade80", borderRadius: "4px" }}></div> <span>ผ่านแล้ว</span> </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}> <div style={{ width: "16px", height: "16px", backgroundColor: "#facc15", borderRadius: "4px" }}></div> <span>กำลังทำ</span> </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}> <div style={{ width: "16px", height: "16px", backgroundColor: "#d1d5db", borderRadius: "4px" }}></div> <span>ยังไม่เริ่ม</span> </div>
      </div>
      <ProgressBoard
        jobs={itemsPerPageProgress === "All"
          ? filteredJobs // Use filtered jobs for progress board as well
          : sortedJobs.slice( // Use sortedJobs if pagination should follow table sort
              (currentPageProgress - 1) * Number(itemsPerPageProgress),
              currentPageProgress * Number(itemsPerPageProgress)
            )
        }
      />
      {/* Progress Pagination Controls */}
      <div style={{ marginTop: "1rem", display: 'flex', alignItems: 'center', gap: '10px' }}>
           <span>แสดง:</span>
           <select
                value={itemsPerPageProgress}
                onChange={(e) => {
                    setItemsPerPageProgress(e.target.value === "All" ? "All" : Number(e.target.value));
                    setCurrentPageProgress(1); // Reset to first page on change
                }}
                style={{ padding: '4px 8px' }}
            >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="All">ทั้งหมด</option>
            </select>
           <span>รายการ</span>
           {itemsPerPageProgress !== "All" && Math.ceil(sortedJobs.length / itemsPerPageProgress) > 1 && (
  <div className="pagination" style={{ marginLeft: 'auto' }}>
    {Array.from({ length: Math.ceil(sortedJobs.length / itemsPerPageProgress) }, (_, i) => (
      <button
        key={i}
        onClick={() => setCurrentPageProgress(i + 1)}
        disabled={currentPageProgress === (i + 1)}
        className="pagination-button"
      >
        {i + 1}
      </button>
    ))}
  </div>
)}
       </div>


      {/* --- Summary Chart --- */}
      <hr style={{ margin: '2rem 0' }} />
      <h3>📊 สรุปสถานะงานรายแผนก</h3>
<div className="legend" style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <div style={{ width: "16px", height: "16px", backgroundColor: "#4ade80", borderRadius: "4px" }}></div>
    <span>ผ่านแล้ว</span>
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <div style={{ width: "16px", height: "16px", backgroundColor: "#facc15", borderRadius: "4px" }}></div>
    <span>กำลังทำ</span>
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <div style={{ width: "16px", height: "16px", backgroundColor: "#d1d5db", borderRadius: "4px" }}></div>
    <span>ยังไม่เริ่ม</span>
  </div>
</div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart layout="vertical" data={summaryPerStep} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={80} /> {/* Adjust width if needed */}
<Tooltip
  formatter={(value, name, props) => {
    const key = props?.dataKey;
    const labelMap = {
      done: "ผ่านแล้ว",
      doing: "กำลังทำ",
      notStarted: "ยังไม่เริ่ม"
    };
    return [`${value} งาน`, labelMap[key] || key];
  }}
/>


          <Bar dataKey="done" stackId="a" fill="#4ade80" name="ผ่านแล้ว"/>
          <Bar dataKey="doing" stackId="a" fill="#facc15" name="กำลังทำ"/>
          <Bar dataKey="notStarted" stackId="a" fill="#d1d5db" name="ยังไม่เริ่ม"/>
        </BarChart>
      </ResponsiveContainer>

      {/* --- Main Job Table --- */}
      <hr style={{ margin: '2rem 0' }} />
      <h3>📋 รายการงานทั้งหมด ({sortedJobs.length} รายการ)</h3>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={exportAllToExcel} className="submit-btn" style={{ marginRight: "8px" }}>📦 Export</button>
      </div>

      {/* --- Table Wrapper with Drag Scroll (แก้ไขแล้ว) --- */}
      <div
        className="table-wrapper"
        ref={tableWrapperRef}
        onMouseDown={handleMouseDown}
        // Removed inline comments causing errors
        style={{ cursor: 'grab' }}
      >
        <table className="job-table">
          <thead>
            <tr>
              {/* Use map for headers? or keep manual */}
              <th onClick={() => handleSort("customer")} style={{ minWidth: "120px", cursor: "pointer" }}> Customer {sortColumn === "customer" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("po_number")} style={{ minWidth: "100px", cursor: "pointer" }}> PO {sortColumn === "po_number" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("bn_wh1")} style={{ minWidth: "90px", cursor: "pointer" }}> BN WH1 {sortColumn === "bn_wh1" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("bn_wh2")} style={{ minWidth: "90px", cursor: "pointer" }}> BN WH2 {sortColumn === "bn_wh2" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("bn_wh3")} style={{ minWidth: "90px", cursor: "pointer" }}> BN WH3 {sortColumn === "bn_wh3" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("batch_no_production")} style={{ minWidth: "90px", cursor: "pointer" }}> BN PD {sortColumn === "batch_no_production" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("product_name")} style={{ minWidth: "150px", cursor: "pointer" }}> Product {sortColumn === "product_name" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("currentStep")} style={{ minWidth: "110px", cursor: "pointer" }}> Current Step {sortColumn === "currentStep" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("status")} style={{ minWidth: "140px", cursor: "pointer" }}> Status {sortColumn === "status" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th> {/* Header for badges */}
              <th onClick={() => handleSort("volume")} style={{ minWidth: "80px", cursor: "pointer" }}> Volume {sortColumn === "volume" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("delivery_date")} style={{ minWidth: "120px", cursor: "pointer" }}> Delivery Date {sortColumn === "delivery_date" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("last_update")} style={{ minWidth: "180px", cursor: "pointer" }}> Last Update {sortColumn === "last_update" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th style={{ minWidth: "60px" }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.length > 0 ? sortedJobs.map((job) => (
              // --- แก้ไข onClick ของ tr นี้ ---
              <tr
                key={job.id}
                onClick={() => {
                  // ตรวจสอบก่อนเปิด Modal
                  if (!wasDragging) {
                    setSelectedJob(job);
                  }
                  // No need to reset wasDragging here, it resets on next mousedown
                }}
                style={{ cursor: "pointer" }} // Keep pointer style on row
              >
                <td>{job.customer || "–"}</td>
                <td>{job.po_number || "–"}</td>
                <td>{getBatchNoWH(job, 0)}</td>
                <td>{getBatchNoWH(job, 1)}</td>
                <td>{getBatchNoWH(job, 2)}</td>
                <td>{job.batch_no_production || "–"}</td>
                <td>{job.product_name || "–"}</td>
                <td>{job.currentStep || "–"}</td>
                {/* Cell for Status Badges */}
                <td style={{ whiteSpace: 'nowrap' }}> {/* Prevent badges wrapping */}
                  {renderStatusBadge("SL", "Sales", job)} {' '} {/* Add space */}
                  {renderStatusBadge("WH", "Warehouse", job)} {' '}
                  {renderStatusBadge("PD", "Production", job)} {' '}
                  {renderStatusBadge("QC", "QC", job)} {' '}
                  {renderStatusBadge("COA", "COA", job)} {' '}
                  {renderStatusBadge("AC", "Account", job)}
                </td>
                <td>{job.volume || "–"}</td>
                <td>{job.delivery_date || "–"}</td>
                <td>{renderLastUpdate(job)}</td>
                <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  {(role === "Admin" || role === "Sales") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering row onClick
                        handleDeleteJob(job.id);
                      }}
                      style={{ /* Button styles */
                        backgroundColor: "#ef4444", // Red-500
                        color: "white", border: "none", borderRadius: "6px",
                        padding: "4px 12px", fontWeight: "bold", cursor: "pointer", fontSize: '12px'
                      }}
                      title="Delete Job" // Tooltip for delete button
                    >
                      ลบ
                    </button>
                  )}
                </td>
              </tr>
            )) : (
                 <tr><td colSpan="13" style={{ textAlign: 'center', padding: '20px' }}>No jobs found matching your criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* --------------------------------------------------------------- */}

      {/* --- Modal --- */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}

    </div> // End page-container
  );
}
