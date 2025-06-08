// src/pages/Home.jsx
// ขอให้เรียกคืนได้
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
        const date = new Date(job.delivery_date || 0);
        return isNaN(date.getTime()) ? 0 : date.getTime();
    }
    if (col === "bn_wh1") return job.batch_no_warehouse?.[0]?.toLowerCase() || "";
    if (col === "bn_wh2") return job.batch_no_warehouse?.[1]?.toLowerCase() || "";
    if (col === "bn_wh3") return job.batch_no_warehouse?.[2]?.toLowerCase() || "";
    if (col === "bn_pd") {
        // ✅ แก้ไขตรงนี้: ใช้ job.batch_no ตรงๆ สำหรับการเรียง
        const bnPdValue = job.batch_no || "";
        return bnPdValue; // ส่งคืนค่า string เพื่อให้เรียงแบบธรรมชาติ
    }
    if (col === "status") return job.currentStep?.toLowerCase() || "";
    if (col === "last_update") {
        const timeA = new Date(job.audit_logs?.at(-1)?.timestamp || 0);
        const timeB = new Date(b.audit_logs?.at(-1)?.timestamp || 0);
        return isNaN(timeA.getTime()) ? (isNaN(timeB.getTime()) ? 0 : -1) : (isNaN(timeB.getTime()) ? 1 : timeA - timeB);
    }
    if (col === "volume") {
      const num = Number(job.volume);
      return isNaN(num) ? 0 : num;
    }
    const val = job[col];
    if (typeof val === 'number') return val;
    return (val || "").toString().toLowerCase();
  };

  const valA = getValue(a, sortColumn);
  const valB = getValue(b, sortColumn);

  // Custom natural sort for strings (especially for "BN PD" and other text columns)
  if (typeof valA === 'string' && typeof valB === 'string') {
    // This regular expression splits strings into parts of numbers and non-numbers.
    // e.g., "BN007-A" -> ["BN", "007", "-A"]
    const regex = /(\d+)|(\D+)/g;
    const partsA = valA.match(regex) || [];
    const partsB = valB.match(regex) || [];

    let i = 0;
    while (i < partsA.length && i < partsB.length) {
      const partA = partsA[i];
      const partB = partsB[i];

      const isNumA = !isNaN(partA);
      const isNumB = !isNaN(partB);

      if (isNumA && isNumB) {
        const numA = parseInt(partA, 10);
        const numB = parseInt(partB, 10);
        if (numA !== numB) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
      } else {
        if (partA < partB) return sortDirection === 'asc' ? -1 : 1;
        if (partA > partB) return sortDirection === 'asc' ? 1 : -1;
      }
      i++;
    }
    // If one string is a prefix of the other (e.g., "BN" vs "BN1")
    if (partsA.length !== partsB.length) {
      return sortDirection === 'asc' ? partsA.length - partsB.length : partsB.length - partsA.length;
    }
    return 0; // Equal
  }

  // Original numeric/other type comparison
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
            statusValue = specificStatus || "ยังไม่เริ่ม";
        }
    }

    if (step === "Sales" && currentIndex > stepIndex) {
        statusValue = "กรอกแล้ว";
    }
    
    if (step === "Production" && job.currentStep === "QC" && job.status?.qc_inspection === "skip"){
        badgeClass = "status-badge completed";
        statusValue = "ข้าม";
    }

    return (
      <span className={badgeClass} title={`${label}: ${statusValue}`}>
        {label}
      </span>
    );
  };

  // ฟังก์ชัน Export ที่ปรับปรุงใหม่
  const exportToExcel = () => {
    const headers = [
      "Customer", "PO", "BN WH1", "BN WH2", "BN WH3", 
      "BN PD", "Product", "Current Step", "Status", 
      "Volume (KG)", "Delivery Date", "Last Update",
      "Sales Note", "Warehouse Note", "Production Note", 
      "QC Note", "Account Note"
    ];

    if (role === "Admin") {
      headers.push("Audit Logs");
    }

    const dataToExport = sortedJobs.map((job) => {
      const bnPd = job.batch_no_warehouse?.filter(Boolean).join(" / ") || "–";
      
      let statusText = "–";
      if (job.currentStep === "Completed") {
        statusText = "✅ งานเสร็จสิ้นแล้ว";
      } else if (job.currentStep) {
        statusText = `🟡 กำลังทำในขั้นตอน: ${job.currentStep}`;
      }

      const rowData = {
        "Customer": job.customer || "–",
        "PO": job.po_number || "–",
        "BN WH1": getBatchNoWH(job, 0),
        "BN WH2": getBatchNoWH(job, 1),
        "BN WH3": getBatchNoWH(job, 2),
        "BN PD": bnPd,
        "Product": job.product_name || "–",
        "Current Step": job.currentStep || "–",
        "Status": statusText,
        "Volume (KG)": job.volume || "–",
        "Delivery Date": job.delivery_date || "–",
        "Last Update": renderLastUpdate(job),
        "Sales Note": job.notes?.sales || "–",
        "Warehouse Note": job.notes?.warehouse || "–",
        "Production Note": job.notes?.production || "–",
        "QC Note": job.notes?.qc_inspection || "–",
        "Logistics Note": job.notes?.logistics || "–",
        "Account Note": job.notes?.account || "–"
      };

      if (role === "Admin" && job.audit_logs) {
        const formattedLogs = job.audit_logs.map(log => 
          `${new Date(log.timestamp).toLocaleString("th-TH")} - ${log.step}: ${log.action || "อัปเดตสถานะ"}`
        ).join("\n");
        rowData["Audit Logs"] = formattedLogs;
      }

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
    
    const colWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
      { wch: 10 }, { wch: 15 }, { wch: 25 },
      { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }
    ];

    if (role === "Admin") {
      colWidths.push({ wch: 50 });
    }

    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EP Jobs (Filtered)");
    
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
    saveAs(blob, `EP_Jobs_Export_${timestamp}.xlsx`);
  };

  const exportAllToExcel = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const headers = [
      "No.", "Product", "Customer", "Volume (KG)", "Delivery Date", "Current Step",
      "Sales Status", "WH Status", "PD Status", "QC Status", "COA Status", "ACC Status"
    ];
    
    if (role === "Admin") {
      headers.push("Audit Logs");
    }

    const allData = snapshot.docs.map((doc, index) => {
      const job = { id: doc.id, ...doc.data() };
      
      const rowData = {
        "No.": index + 1,
        "Product": job.product_name || "–",
        "Customer": job.customer || "–",
        "Volume (KG)": job.volume || "–",
        "Delivery Date": job.delivery_date || "–",
        "Current Step": job.currentStep || "–",
        "Sales Status": job.status?.sales || (job.currentStep !== "Sales" ? "Done" : "Pending"),
        "WH Status": job.status?.warehouse || "–",
        "PD Status": job.status?.production || "–",
        "QC Status": job.status?.qc_inspection || "–",
        "COA Status": job.status?.qc_coa || "–",
        "Logistics Status": (() => {
  const volume = Number(job.volume || 0);
  const delivered = (job.delivery_logs || []).reduce(
    (sum, d) => sum + Number(d.quantity || 0), 0
  );
  if (delivered === 0) return "ยังไม่ส่ง";
  else if (delivered >= volume) return "ส่งครบแล้ว";
  else return `ส่งบางส่วน (${delivered}/${volume})`;
})(),
        "ACC Status": job.status?.account || "–"
      };

      if (role === "Admin" && job.audit_logs) {
        const formattedLogs = job.audit_logs.map(log => 
          `${new Date(log.timestamp).toLocaleString("th-TH")} - ${log.step}: ${log.action || "อัปเดตสถานะ"}`
        ).join("\n");
        rowData["Audit Logs"] = formattedLogs;
      }

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(allData, { header: headers });
    
    const colWidths = [
      { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    if (role === "Admin") {
      colWidths.push({ wch: 50 });
    }

    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All EP Jobs");
    
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
    saveAs(blob, `EP_All_Jobs_${timestamp}.xlsx`);
  };

  const getStepKey = (currentStep) => {
    switch (currentStep) {
      case "Sales": return "sales";
      case "Warehouse": return "warehouse";
      case "Production": return "production";
      case "QC": return "qc_inspection";
      case "COA": return "qc_coa";
      case "Logistics": return "logistics";
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
          <option>ยังไม่ถึง</option>
          <option>กำลังทำ</option>
          <option>เสร็จแล้ว</option>
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}> <div style={{ width: "16px", height: "16px", backgroundColor: "#4ade80", borderRadius: "4px" }}></div> <span>ผ่านแล้ว</span> </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}> <div style={{ width: "16px", height: "16px", backgroundColor: "#facc15", borderRadius: "4px" }}></div> <span>กำลังทำ</span> </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}> <div style={{ width: "16px", height: "16px", backgroundColor: "#d1d5db", borderRadius: "4px" }}></div> <span>ยังไม่เริ่ม</span> </div>
      </div>
<ProgressBoard
  jobs={itemsPerPageProgress === "All" 
    ? progressJobs 
    : progressJobs.slice(
        (currentPageProgress - 1) * itemsPerPageProgress,
        currentPageProgress * itemsPerPageProgress
      )
  }
/>

{/* Pagination Controls สำหรับ Progress Board */}
<div style={{ marginTop: "1rem", display: 'flex', alignItems: 'center', gap: '10px' }}>
  <span>แสดง:</span>
  <select
    value={itemsPerPageProgress}
    onChange={(e) => {
      setItemsPerPageProgress(e.target.value === "All" ? "All" : Number(e.target.value));
      setCurrentPageProgress(1);
    }}
    style={{ padding: '4px 8px' }}
  >
    <option value={10}>10</option>
    <option value={25}>25</option>
    <option value={50}>50</option>
    <option value="All">ทั้งหมด</option>
  </select>
  <span>รายการ</span>
  
  {itemsPerPageProgress !== "All" && (
    <div className="pagination" style={{ marginLeft: 'auto' }}>
      <button
        onClick={() => setCurrentPageProgress(prev => Math.max(prev - 1, 1))}
        disabled={currentPageProgress === 1}
        className="pagination-button"
      >
        &lt;
      </button>
      
      {Array.from({ length: Math.ceil(filteredJobs.length / itemsPerPageProgress) }, (_, i) => (
        <button
          key={i}
          onClick={() => setCurrentPageProgress(i + 1)}
          disabled={currentPageProgress === i + 1}
          className={`pagination-button ${currentPageProgress === i + 1 ? 'active' : ''}`}
        >
          {i + 1}
        </button>
      ))}
      
      <button
        onClick={() => setCurrentPageProgress(prev => Math.min(prev + 1, Math.ceil(filteredJobs.length / itemsPerPageProgress)))}
        disabled={currentPageProgress === Math.ceil(filteredJobs.length / itemsPerPageProgress)}
        className="pagination-button"
      >
        &gt;
      </button>
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
          <YAxis dataKey="name" type="category" width={80} />
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
        <button onClick={exportToExcel} className="submit-btn" style={{ marginRight: "8px" }}>📦 Export</button>
        <button onClick={exportAllToExcel} className="submit-btn">📜 Export All</button>
      </div>

      {/* --- Table Wrapper with Drag Scroll --- */}
      <div
        className="table-wrapper"
        ref={tableWrapperRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab' }}
      >
        <table className="job-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("customer")} style={{ minWidth: "120px", cursor: "pointer" }}> Customer {sortColumn === "customer" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("po_number")} style={{ minWidth: "100px", cursor: "pointer" }}> PO {sortColumn === "po_number" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("bn_wh1")} style={{ minWidth: "90px", cursor: "pointer" }}> BN WH1 {sortColumn === "bn_wh1" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("bn_wh2")} style={{ minWidth: "90px", cursor: "pointer" }}> BN WH2 {sortColumn === "bn_wh2" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("bn_wh3")} style={{ minWidth: "90px", cursor: "pointer" }}> BN WH3 {sortColumn === "bn_wh3" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("bn_pd")} style={{ minWidth: "90px", cursor: "pointer" }}> BN PD {sortColumn === "bn_pd" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("product_name")} style={{ minWidth: "150px", cursor: "pointer" }}> Product {sortColumn === "product_name" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("currentStep")} style={{ minWidth: "110px", cursor: "pointer" }}> Current Step {sortColumn === "currentStep" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("status")} style={{ minWidth: "140px", cursor: "pointer" }}> Status {sortColumn === "status" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("volume")} style={{ minWidth: "80px", cursor: "pointer" }}> Volume {sortColumn === "volume" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("delivery_date")} style={{ minWidth: "120px", cursor: "pointer" }}> Delivery Date {sortColumn === "delivery_date" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th onClick={() => handleSort("last_update")} style={{ minWidth: "180px", cursor: "pointer" }}> Last Update {sortColumn === "last_update" ? (sortDirection === "asc" ? "🔼" : "🔽") : ''} </th>
              <th style={{ minWidth: "60px" }}>Delete</th>
            </tr>
          </thead>
<tbody>
  {sortedJobs.length > 0 ? sortedJobs.map((job) => {
    // ตรวจสอบสถานะการจัดส่ง
    const po = job.po_number || "";
    const hasKG = po.includes("KG");
    const deliveryLogs = job.delivery_logs || [];
    const deliveredTotal = deliveryLogs.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const volume = Number(job.volume || 0);
    const isMultiDelivery = deliveredTotal > 0 && deliveredTotal < volume;

    // กำหนดชื่อที่จะแสดงในคอลัมน์ Product
    const displayProductName = isMultiDelivery || hasKG 
      ? (hasKG ? po : `${job.product_name}-${deliveredTotal}KG`) 
      : job.product_name;

    return (
      <tr
        key={job.id}
        onClick={() => {
          if (!wasDragging) {
            setSelectedJob(job);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {/* คอลัมน์ Customer - แสดงชื่อเดิมเสมอ */}
        <td>{job.customer || "–"}</td>
        
        {/* คอลัมน์ PO - แสดงชื่อเดิมเสมอ */}
        <td>{job.po_number || "–"}</td>
        
        {/* คอลัมน์ BN WH1-3 */}
        <td>{getBatchNoWH(job, 0)}</td>
        <td>{getBatchNoWH(job, 1)}</td>
        <td>{getBatchNoWH(job, 2)}</td>
        
        {/* คอลัมน์ BN PD */}
        <td>{job.batch_no || "–"}</td>
        
        {/* คอลัมน์ Product - แสดงตามเงื่อนไขการจัดส่ง */}
        <td>{job._isDeliveryLog ? job.product_name_with_quantity : job.product_name || "–"}</td>
        
        {/* คอลัมน์ Current Step */}
        <td>{job.currentStep || "–"}</td>
        
        {/* คอลัมน์ Status */}
        <td style={{ whiteSpace: 'nowrap' }}>
          {renderStatusBadge("SL", "Sales", job)} {' '}
          {renderStatusBadge("WH", "Warehouse", job)} {' '}
          {renderStatusBadge("PD", "Production", job)} {' '}
          {renderStatusBadge("QC", "QC", job)} {' '}
          {renderStatusBadge("COA", "COA", job)} {' '}
          {renderStatusBadge("LO", "Logistics", job)} {' '}
          {renderStatusBadge("AC", "Account", job)}
        </td>
        
        {/* คอลัมน์ Volume */}
        <td>{job.volume || "–"}</td>
        
        {/* คอลัมน์ Delivery Date */}
        <td>{job.delivery_date || "–"}</td>
        
        {/* คอลัมน์ Last Update */}
        <td>{renderLastUpdate(job)}</td>
        
        {/* คอลัมน์ Delete */}
        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
          {(role === "Admin" || role === "Sales") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteJob(job.id);
              }}
              style={{
                backgroundColor: "#ef4444",
                color: "white", 
                border: "none", 
                borderRadius: "6px",
                padding: "4px 12px", 
                fontWeight: "bold", 
                cursor: "pointer", 
                fontSize: '12px'
              }}
              title="Delete Job"
            >
              ลบ
            </button>
          )}
        </td>
      </tr>
    );
  }) : (
    <tr>
      <td colSpan="13" style={{ textAlign: 'center', padding: '20px' }}>
        No jobs found matching your criteria.
      </td>
    </tr>
  )}
</tbody>
          </table>
      </div>

      {/* --- Modal --- */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
