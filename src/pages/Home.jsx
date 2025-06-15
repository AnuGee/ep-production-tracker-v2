// src/pages/Home.jsx
// ✅ Merge เวอร์ชันเต็ม + เพิ่ม Export, Badge, Sort คอลัมน์ + Highlight คอลัมน์ที่กำลัง Sort และแถว hover
// ✅ เพิ่ม Click & Drag Scroll ตาราง
// ✅ เพิ่มตัวกรองสำหรับ Progress Board (ปี, เดือน, สถานะยังไม่เสร็จ)
// ✅ ปรับปรุงตารางรายการงานทั้งหมด (ลบคอลัมน์ Status และจัดเรียงคอลัมน์ใหม่)
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

  // ✅ เพิ่ม State สำหรับตัวกรอง Progress Board
  const [progressYearFilter, setProgressYearFilter] = useState("ทั้งหมด");
  const [progressMonthFilter, setProgressMonthFilter] = useState("ทั้งหมด");
  const [progressShowOnlyIncomplete, setProgressShowOnlyIncomplete] = useState(false);

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
  
    // ✅ แก้ไขหลัก: ถ้า currentStep ไปถึง Account หรือ Completed แล้ว 
    // และมีการส่งมอบแล้ว (ไม่ว่าจะครบหรือไม่) ให้เป็น "done"
    if (["Account", "Completed"].includes(currentStep)) {
      // ถ้ามีการส่งมอบแล้วบางส่วนหรือครบถ้วน ให้เป็น done
      if (delivered > 0) {
        return "done"; 
      }
      // ถ้ายังไม่มีการส่งมอบเลย แต่งานไปถึง Account/Completed แล้ว 
      // อาจเป็นกรณีพิเศษ ให้เป็น done ด้วย (เพราะงานผ่านขั้นตอนนี้ไปแล้ว)
      return "done";
    }
  
    // กรณีปกติ: ตรวจสอบปริมาณการส่งมอบ
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

  // ✅ เพิ่มฟังก์ชันล้างตัวกรอง Progress Board
  const handleClearProgressFilters = () => {
    setProgressYearFilter("ทั้งหมด");
    setProgressMonthFilter("ทั้งหมด");
    setProgressShowOnlyIncomplete(false);
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

  // ✅ เพิ่มฟังก์ชันกรองสำหรับ Progress Board
  const filterJobsForProgress = (job) => {
    if (!job.delivery_date) return false;
    
    try {
      const date = new Date(job.delivery_date);
      if (isNaN(date.getTime())) return false;
      
      const jobYear = date.getFullYear().toString();
      const jobMonth = date.getMonth();
      const selectedMonthIndex = months.indexOf(progressMonthFilter);
  
      // กรองตามปี
      if (progressYearFilter !== "ทั้งหมด" && jobYear !== progressYearFilter) return false;
      
      // กรองตามเดือน
      if (progressMonthFilter !== "ทั้งหมด" && jobMonth !== selectedMonthIndex) return false;
      
      // กรองเฉพาะงานที่ยังไม่เสร็จ
      if (progressShowOnlyIncomplete && job.currentStep === "Completed") return false;

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

// ✅ สำหรับ 🔴 ความคืบหน้าของงานแต่ละชุด - เพิ่มการกรองตามตัวกรองใหม่
const filteredJobsForProgress = allData.filter((job) => {
  const po = job.po_number || "";
  const hasKG = po.includes("KG");
  const deliveryTotal = (job.delivery_logs || []).reduce(
    (sum, d) => sum + Number(d.quantity || 0), 0
  );
  const volume = Number(job.volume);
  const isValidVolume = !isNaN(volume);
  const isCompleted = job.currentStep === "Completed";

  // กรองตามเงื่อนไขเดิม
  let passBasicFilter = false;
  
  // กรณีมี -xxxKG ในชื่อ (แบ่งส่ง) ให้แสดงเสมอ
  if (hasKG) passBasicFilter = true;
  
  // กรณียังไม่มีการส่งของ ให้แสดงเสมอ
  else if (deliveryTotal === 0) passBasicFilter = true;
  
  // กรณีงานเสร็จสมบูรณ์แล้ว (Completed) ให้แสดงด้วย
  else if (isCompleted) passBasicFilter = true;
  
  else {
    // ตรวจสอบว่ามีรายการย่อยที่แบ่งส่งหรือไม่
    const hasSub = allData.some((j) => {
      const subPo = j.po_number || "";
      return subPo !== po && subPo.startsWith(po) && subPo.includes("KG");
    });
    
    // กรณีส่งครบในรอบเดียวและไม่มีรายการย่อย ให้แสดง
    if (isValidVolume && deliveryTotal >= volume && !hasSub) passBasicFilter = true;
    
    // ถ้ามีรายการย่อย ไม่แสดงรายการหลัก
    else if (!hasSub) passBasicFilter = true;
  }
  
  // ถ้าไม่ผ่านการกรองพื้นฐาน ให้ return false
  if (!passBasicFilter) return false;
  
  // ✅ เพิ่มการกรองตามตัวกรองใหม่
  return filterJobsForProgress(job);
});

  // ✅ แปลงข้อมูลตามรอบการส่งสำหรับ Progress Board
// ✅ แปลงข้อมูลตามรอบการส่งสำหรับ Progress Board
const expandedJobsForProgress = expandJobsByDeliveryLogs(filteredJobsForProgress);

// ✅ เรียงลำดับตาม product_name หรือ product_name_with_quantity
const sortedProgressJobs = [...expandedJobsForProgress].sort((a, b) => {
  // ใช้ product_name_with_quantity ถ้ามี (กรณีเป็น job ที่แยกจาก delivery_log)
  const nameA = a._isDeliveryLog ? a.product_name_with_quantity : a.product_name || "";
  const nameB = b._isDeliveryLog ? b.product_name_with_quantity : b.product_name || "";
  
  // ใช้ natural sort ที่มีอยู่แล้ว
  if (typeof nameA === 'string' && typeof nameB === 'string') {
    const regex = /(\d+)|(\D+)/g;
    const partsA = nameA.match(regex) || [];
    const partsB = nameB.match(regex) || [];

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
          return numA - numB; // เรียงจากน้อยไปมากเสมอ
        }
      } else {
        if (partA < partB) return -1;
        if (partA > partB) return 1;
      }
      i++;
    }
    
    if (partsA.length !== partsB.length) {
      return partsA.length - partsB.length;
    }
    return 0;
  }

  // กรณีไม่ใช่ string
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
});

// ใช้ sortedProgressJobs แทน progressJobs
const progressJobs = sortedProgressJobs;


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
    // This regular expression splits strings into numeric and non-numeric parts
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
        // Both parts are numeric, compare as numbers
        const numA = parseInt(partA, 10);
        const numB = parseInt(partB, 10);
        if (numA !== numB) {
          return sortDirection === "asc" ? numA - numB : numB - numA;
        }
      } else {
        // At least one part is non-numeric, compare as strings
        if (partA < partB) return sortDirection === "asc" ? -1 : 1;
        if (partA > partB) return sortDirection === "asc" ? 1 : -1;
      }
      i++;
    }
    
    // If all compared parts are equal, compare by length
    if (partsA.length !== partsB.length) {
      return sortDirection === "asc" ? partsA.length - partsB.length : partsB.length - partsA.length;
    }
    return 0;
  }

  // For non-string values, use standard comparison
  if (valA < valB) return sortDirection === "asc" ? -1 : 1;
  if (valA > valB) return sortDirection === "asc" ? 1 : -1;
  return 0;
});

  const filteredAndSearchedJobs = sortedJobs.filter((job) => {
    if (!filterJobs(job)) return false;
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      (job.product_name || "").toLowerCase().includes(searchLower) ||
      (job.customer || "").toLowerCase().includes(searchLower) ||
      (job.po_number || "").toLowerCase().includes(searchLower) ||
      (job.batch_no || "").toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredAndSearchedJobs.length / 10);
  const currentPage = Math.min(Math.max(1, parseInt(new URLSearchParams(window.location.search).get("page")) || 1), totalPages);
  const startIndex = (currentPage - 1) * 10;
  const endIndex = startIndex + 10;
  const currentJobs = filteredAndSearchedJobs.slice(startIndex, endIndex);

  const totalPagesProgress = Math.ceil(progressJobs.length / itemsPerPageProgress);
  const startIndexProgress = (currentPageProgress - 1) * itemsPerPageProgress;
  const endIndexProgress = startIndexProgress + itemsPerPageProgress;
  const currentProgressJobs = progressJobs.slice(startIndexProgress, endIndexProgress);

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบงานนี้?")) {
      try {
        await deleteDoc(doc(db, "production_workflow", jobId));
        setAllData((prev) => prev.filter((job) => job.id !== jobId));
        alert("ลบงานเรียบร้อยแล้ว");
      } catch (error) {
        console.error("Error deleting job:", error);
        alert("เกิดข้อผิดพลาดในการลบงาน");
      }
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredAndSearchedJobs.map((job) => ({
      "Product Name": job.product_name || "",
      "Customer": job.customer || "",
      "PO Number": job.po_number || "",
      "Volume": job.volume || "",
      "Delivery Date": job.delivery_date || "",
      "BN WH1": getBatchNoWH(job, 0),
      "BN WH2": getBatchNoWH(job, 1),
      "BN WH3": getBatchNoWH(job, 2),
      "BN PD": job.batch_no || "",
      "Last Update": renderLastUpdate(job),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, `jobs_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleRowClick = (job, event) => {
    if (wasDragging) {
      event.preventDefault();
      return;
    }
    setSelectedJob(job);
  };

  return (
    <div className="home-container" style={{ 
      maxWidth: "1400px", 
      margin: "0 auto", 
      padding: "20px",
      fontSize: "14px" 
    }}>
      {/* ✅ ปรับขนาดหัวข้อให้เล็กลง */}
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>🏠 หน้าแรก</h1>

      {/* 📊 สรุปสถานะงานรายแผนก */}
      <section>
        <h2>📊 สรุปสถานะงานรายแผนก</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={summaryPerStep}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="notStarted" stackId="a" fill="#e5e7eb" name="ยังไม่เริ่ม" />
            <Bar dataKey="doing" stackId="a" fill="#facc15" name="กำลังทำ" />
            <Bar dataKey="done" stackId="a" fill="#4ade80" name="เสร็จแล้ว" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* 🔴 ความคืบหน้าของงานแต่ละชุด */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h2>🔴 ความคืบหน้าของงานแต่ละชุด</h2>
          
          {/* ✅ เพิ่มตัวกรองสำหรับ Progress Board */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <select 
              value={progressYearFilter} 
              onChange={(e) => setProgressYearFilter(e.target.value)}
              style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <select 
              value={progressMonthFilter} 
              onChange={(e) => setProgressMonthFilter(e.target.value)}
              style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            
            <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input 
                type="checkbox" 
                checked={progressShowOnlyIncomplete}
                onChange={(e) => setProgressShowOnlyIncomplete(e.target.checked)}
              />
              <span style={{ fontSize: "14px" }}>เฉพาะยังไม่เสร็จ</span>
            </label>
            
            <button 
              onClick={handleClearProgressFilters}
              style={{ 
                padding: "5px 10px", 
                backgroundColor: "#f3f4f6", 
                border: "1px solid #ccc", 
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        <ProgressBoard jobs={currentProgressJobs} />
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
          <div>
            <label>แสดง: </label>
            <select 
              value={itemsPerPageProgress} 
              onChange={(e) => setItemsPerPageProgress(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={progressJobs.length}>ทั้งหมด ({progressJobs.length})</option>
            </select>
            <span> รายการ (รวม {progressJobs.length} รายการ)</span>
          </div>
          
          <div>
            {Array.from({ length: totalPagesProgress }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPageProgress(page)}
                style={{
                  margin: "0 2px",
                  padding: "5px 10px",
                  backgroundColor: currentPageProgress === page ? "#3b82f6" : "#f3f4f6",
                  color: currentPageProgress === page ? "white" : "black",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 📋 รายการงานทั้งหมด - ✅ ปรับปรุงการจัดเรียงคอลัมน์ */}
      <section>
        <h2>📋 รายการงานทั้งหมด</h2>
        
        <div className="filter-bar">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="ทั้งหมด">ทั้งหมด</option>
            {months.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ทั้งหมด">ทั้งหมด</option>
            <option value="ยังไม่ถึง">ยังไม่ถึง</option>
            <option value="กำลังทำ">กำลังทำ</option>
            <option value="เสร็จแล้ว">เสร็จแล้ว</option>
          </select>
          <input
            type="text"
            placeholder="ค้นหา..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button onClick={handleClearFilters}>ล้างตัวกรอง</button>
          <button onClick={exportToExcel}>📊 Export Excel</button>
        </div>

        <div 
          className="table-wrapper"
          ref={tableWrapperRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: isDragging ? 'none' : 'auto'
          }}
        >
          <table className="job-table">
            <thead>
              <tr>
                {/* ✅ จัดเรียงคอลัมน์ใหม่: ข้อมูลสำคัญก่อน */}
                <th 
                  onClick={() => handleSort("product_name")}
                  className={sortColumn === "product_name" ? "sorted" : ""}
                >
                  Product {sortColumn === "product_name" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("customer")}
                  className={sortColumn === "customer" ? "sorted" : ""}
                >
                  Customer {sortColumn === "customer" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("delivery_date")}
                  className={sortColumn === "delivery_date" ? "sorted" : ""}
                >
                  Delivery Date {sortColumn === "delivery_date" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("volume")}
                  className={sortColumn === "volume" ? "sorted" : ""}
                >
                  Volume {sortColumn === "volume" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("po_number")}
                  className={sortColumn === "po_number" ? "sorted" : ""}
                >
                  PO {sortColumn === "po_number" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                {/* ✅ ย้าย Batch Numbers มาท้าย */}
                <th 
                  onClick={() => handleSort("bn_pd")}
                  className={sortColumn === "bn_pd" ? "sorted" : ""}
                >
                  BN PD {sortColumn === "bn_pd" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("bn_wh1")}
                  className={sortColumn === "bn_wh1" ? "sorted" : ""}
                >
                  BN WH1 {sortColumn === "bn_wh1" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("bn_wh2")}
                  className={sortColumn === "bn_wh2" ? "sorted" : ""}
                >
                  BN WH2 {sortColumn === "bn_wh2" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("bn_wh3")}
                  className={sortColumn === "bn_wh3" ? "sorted" : ""}
                >
                  BN WH3 {sortColumn === "bn_wh3" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                {/* ✅ ลบคอลัมน์ Status ออกแล้ว */}
                <th 
                  onClick={() => handleSort("last_update")}
                  className={sortColumn === "last_update" ? "sorted" : ""}
                >
                  Last Update {sortColumn === "last_update" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                {role === "admin" && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentJobs.map((job) => (
                <tr 
                  key={`${job.id || job.docId}${job._isDeliveryLog ? `-${job._deliveryQuantity}` : ''}`}
                  onClick={(e) => handleRowClick(job, e)}
                  className="clickable-row"
                >
                  {/* ✅ จัดเรียงข้อมูลตามคอลัมน์ใหม่ */}
                  <td>
                    {job._isDeliveryLog 
                      ? `${job.product_name}-${job._deliveryQuantity}KG`
                      : job.product_name
                    }
                  </td>
                  <td>{job.customer}</td>
                  <td>{job.delivery_date}</td>
                  <td>{job.volume}</td>
                  <td>
                    {job._isDeliveryLog 
                      ? `${job.po_number}-${job._deliveryQuantity}KG`
                      : job.po_number
                    }
                  </td>
                  <td>{job.batch_no}</td>
                  <td>{getBatchNoWH(job, 0)}</td>
                  <td>{getBatchNoWH(job, 1)}</td>
                  <td>{getBatchNoWH(job, 2)}</td>
                  {/* ✅ ลบคอลัมน์ Status ออกแล้ว */}
                  <td style={{ fontSize: "12px" }}>{renderLastUpdate(job)}</td>
                  {role === "admin" && (
                    <td>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        style={{ 
                          backgroundColor: "#ef4444", 
                          color: "white", 
                          border: "none", 
                          padding: "5px 10px", 
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        ลบ
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
          <div>
            แสดง {startIndex + 1}-{Math.min(endIndex, filteredAndSearchedJobs.length)} จาก {filteredAndSearchedJobs.length} รายการ
          </div>
          <div>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => {
                  const url = new URL(window.location);
                  url.searchParams.set("page", page);
                  window.history.pushState({}, "", url);
                  window.location.reload();
                }}
                style={{
                  margin: "0 2px",
                  padding: "5px 10px",
                  backgroundColor: currentPage === page ? "#3b82f6" : "#f3f4f6",
                  color: currentPage === page ? "white" : "black",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={(updatedJob) => {
            setAllData((prev) =>
              prev.map((job) => (job.id === updatedJob.id ? updatedJob : job))
            );
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
}
