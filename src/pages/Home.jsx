// src/pages/Home.jsx
// ✅ แก้ไขกราฟสรุปสถานะงานรายแผนก: ใช้ข้อมูลจริงจาก allData และปรับการคำนวณให้ถูกต้อง
import React, { useEffect, useState, useRef, useCallback } from "react";
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
  const steps = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"];

  // --- Handlers สำหรับการลาก (เพิ่มเข้ามา) ---
  const handleMouseDown = (e) => {
    if (!tableWrapperRef.current) return;

    setWasDragging(false);
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
    if (Math.abs(walk) > 10) {
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

  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUpOrLeave();

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (tableWrapperRef.current) {
          tableWrapperRef.current.style.cursor = 'grab';
          tableWrapperRef.current.style.userSelect = 'auto';
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUpOrLeave]);

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
        
        const skipProduction =
          Array.isArray(job.batch_no_warehouse) &&
          job.batch_no_warehouse.length > 0 &&
          !pd &&
          !status.qc_inspection &&
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
      
        if (["Account", "Completed"].includes(currentStep)) {
          if (delivered > 0) {
            return "done"; 
          }
          return "done";
        }
      
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
      setAllData(data);
      console.log("Fetched jobs:", data.length); // Debug log
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

  const filterJobsForProgress = (job) => {
    if (!job.delivery_date) return false;
    
    try {
      const date = new Date(job.delivery_date);
      if (isNaN(date.getTime())) return false;
      
      const jobYear = date.getFullYear().toString();
      const jobMonth = date.getMonth();
      const selectedMonthIndex = months.indexOf(progressMonthFilter);
  
      if (progressYearFilter !== "ทั้งหมด" && jobYear !== progressYearFilter) return false;
      if (progressMonthFilter !== "ทั้งหมด" && jobMonth !== selectedMonthIndex) return false;
      if (progressShowOnlyIncomplete && job.currentStep === "Completed") return false;

      return true;
    } catch (error) {
      console.error(`Error processing date for job ${job.id}: ${job.delivery_date}`, error);
      return false;
    }
  };

  const expandJobsByDeliveryLogs = (jobs) => {
    return jobs.flatMap(job => {
      const deliveryLogs = job.delivery_logs || [];
      
      if (deliveryLogs.length === 0) {
        return [job];
      }
      
      return deliveryLogs.map(log => ({
        ...job,
        _isDeliveryLog: true,
        _deliveryQuantity: log.quantity,
        _deliveryDate: log.date,
        product_name_with_quantity: `${job.product_name}-${log.quantity}KG`,
        po_number_with_quantity: `${job.po_number}-${log.quantity}KG`
      }));
    });
  };

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

  const filteredJobsForProgress = allData.filter((job) => {
    const po = job.po_number || "";
    const hasKG = po.includes("KG");
    const deliveryTotal = (job.delivery_logs || []).reduce(
      (sum, d) => sum + Number(d.quantity || 0), 0
    );
    const volume = Number(job.volume);
    const isValidVolume = !isNaN(volume);
    const isCompleted = job.currentStep === "Completed";

    let passBasicFilter = false;
    
    if (hasKG) passBasicFilter = true;
    else if (deliveryTotal === 0) passBasicFilter = true;
    else if (isCompleted) passBasicFilter = true;
    else {
      const hasSub = allData.some((j) => {
        const subPo = j.po_number || "";
        return subPo !== po && subPo.startsWith(po) && subPo.includes("KG");
      });
      
      if (isValidVolume && deliveryTotal >= volume && !hasSub) passBasicFilter = true;
      else if (!hasSub) passBasicFilter = true;
    }
    
    if (!passBasicFilter) return false;
    
    return filterJobsForProgress(job);
  });

  const expandedJobsForProgress = expandJobsByDeliveryLogs(filteredJobsForProgress);

  const sortedProgressJobs = [...expandedJobsForProgress].sort((a, b) => {
    const nameA = a._isDeliveryLog ? a.product_name_with_quantity : a.product_name || "";
    const nameB = b._isDeliveryLog ? b.product_name_with_quantity : b.product_name || "";
    
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
            return numA - numB;
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

    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  const progressJobs = sortedProgressJobs;

  // ✅ แก้ไขการคำนวณ summaryPerStep ให้แสดงข้อมูลจริง
  const summaryPerStep = steps.map((step) => {
    // นับจำนวนงานที่อยู่ในแต่ละแผนก
    const currentStepCount = allData.filter(job => job.currentStep === step).length;
    
    // นับจำนวนงานที่ผ่านแผนกนี้ไปแล้ว (เสร็จแล้ว)
    const stepIndex = steps.indexOf(step);
    const completedCount = allData.filter(job => {
      const jobStepIndex = steps.indexOf(job.currentStep);
      return jobStepIndex > stepIndex || job.currentStep === "Completed";
    }).length;
    
    // นับจำนวนงานที่ยังไม่ถึงแผนกนี้ (ยังไม่เริ่ม)
    const notStartedCount = allData.filter(job => {
      const jobStepIndex = steps.indexOf(job.currentStep);
      return jobStepIndex < stepIndex && job.currentStep !== "Completed";
    }).length;

    console.log(`${step}: กำลังทำ=${currentStepCount}, เสร็จแล้ว=${completedCount}, ยังไม่เริ่ม=${notStartedCount}`);

    return { 
      name: step, 
      ยังไม่เริ่ม: notStartedCount,
      กำลังทำ: currentStepCount,
      เสร็จแล้ว: completedCount
    };
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

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
          const bnPdValue = job.batch_no || "";
          return bnPdValue;
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

    if (typeof valA === 'string' && typeof valB === 'string') {
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
            return sortDirection === "asc" ? numA - numB : numB - numA;
          }
        } else {
          if (partA < partB) return sortDirection === "asc" ? -1 : 1;
          if (partA > partB) return sortDirection === "asc" ? 1 : -1;
        }
        i++;
      }
      
      if (partsA.length !== partsB.length) {
        return sortDirection === "asc" ? partsA.length - partsB.length : partsB.length - partsA.length;
      }
      return 0;
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const filteredAndSearchedJobs = sortedJobs.filter((job) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      (job.product_name || "").toLowerCase().includes(searchLower) ||
      (job.customer || "").toLowerCase().includes(searchLower) ||
      (job.po_number || "").toLowerCase().includes(searchLower) ||
      (job.batch_no || "").toLowerCase().includes(searchLower)
    );
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(filteredAndSearchedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentJobs = filteredAndSearchedJobs.slice(startIndex, endIndex);

  const totalPagesProgress = Math.ceil(progressJobs.length / itemsPerPageProgress);
  const startIndexProgress = (currentPageProgress - 1) * itemsPerPageProgress;
  const endIndexProgress = startIndexProgress + itemsPerPageProgress;
  const currentProgressJobs = progressJobs.slice(startIndexProgress, endIndexProgress);

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบงานนี้?")) {
      try {
        await deleteDoc(doc(db, "production_workflow", jobId));
        setAllData(allData.filter((job) => job.id !== jobId));
        alert("ลบงานเรียบร้อยแล้ว");
      } catch (error) {
        console.error("Error deleting job:", error);
        alert("เกิดข้อผิดพลาดในการลบงาน");
      }
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredAndSearchedJobs.map((job) => ({
      "Product": job._isDeliveryLog 
        ? `${job.product_name}-${job._deliveryQuantity}KG`
        : job.product_name,
      "Customer": job.customer || "",
      "Delivery Date": job.delivery_date || "",
      "Volume": job.volume || "",
      "PO": job._isDeliveryLog 
        ? `${job.po_number}-${job._deliveryQuantity}KG`
        : job.po_number,
      "BN PD": job.batch_no || "",
      "BN WH1": getBatchNoWH(job, 0),
      "BN WH2": getBatchNoWH(job, 1),
      "BN WH3": getBatchNoWH(job, 2),
      "Last Update": renderLastUpdate(job),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, "jobs_export.xlsx");
  };

  const handleRowClick = (job, event) => {
    if (wasDragging) {
      setWasDragging(false);
      return;
    }
    
    if (event.target.tagName === "BUTTON") return;
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
      <section style={{ 
        marginBottom: "30px", 
        padding: "20px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #e9ecef"
      }}>
        <h2 style={{ fontSize: "18px", marginBottom: "15px" }}>📊 สรุปสถานะงานรายแผนก</h2>
        <div style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="horizontal"
              data={summaryPerStep}
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={70} />
              <Tooltip 
                formatter={(value, name) => [value, name]}
                labelFormatter={(label) => `แผนก: ${label}`}
              />
              <Bar dataKey="ยังไม่เริ่ม" stackId="a" fill="#e5e7eb" name="ยังไม่เริ่ม" />
              <Bar dataKey="กำลังทำ" stackId="a" fill="#facc15" name="กำลังทำ" />
              <Bar dataKey="เสร็จแล้ว" stackId="a" fill="#4ade80" name="เสร็จแล้ว" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* ✅ Debug info - จะลบออกหลังจากแก้ไขเสร็จ */}
        <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
          Total jobs: {allData.length} | Chart data: {JSON.stringify(summaryPerStep)}
        </div>
      </section>

      {/* ✅ เส้นแบ่งระหว่างส่วน */}
      <hr style={{ 
        border: "none", 
        borderTop: "2px solid #dee2e6", 
        margin: "30px 0" 
      }} />

      {/* 🔴 ความคืบหน้าของงานแต่ละชุด */}
      <section style={{ 
        marginBottom: "30px", 
        padding: "20px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #e9ecef"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h2 style={{ fontSize: "18px", margin: 0 }}>🔴 ความคืบหน้าของงานแต่ละชุด</h2>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <select 
              value={progressYearFilter} 
              onChange={(e) => setProgressYearFilter(e.target.value)}
              style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <select 
              value={progressMonthFilter} 
              onChange={(e) => setProgressMonthFilter(e.target.value)}
              style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            
            <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
              <input 
                type="checkbox" 
                checked={progressShowOnlyIncomplete}
                onChange={(e) => setProgressShowOnlyIncomplete(e.target.checked)}
              />
              <span>เฉพาะยังไม่เสร็จ</span>
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
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px" }}>
          <div style={{ fontSize: "12px" }}>
            แสดง {startIndexProgress + 1}-{Math.min(endIndexProgress, progressJobs.length)} จาก {progressJobs.length} รายการ
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select 
              value={itemsPerPageProgress} 
              onChange={(e) => {
                setItemsPerPageProgress(Number(e.target.value));
                setCurrentPageProgress(1);
              }}
              style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={progressJobs.length}>ทั้งหมด</option>
            </select>
            
            <div style={{ display: "flex", gap: "5px" }}>
              <button 
                onClick={() => setCurrentPageProgress(Math.max(1, currentPageProgress - 1))}
                disabled={currentPageProgress === 1}
                style={{ 
                  padding: "5px 10px", 
                  backgroundColor: currentPageProgress === 1 ? "#f3f4f6" : "#007bff", 
                  color: currentPageProgress === 1 ? "#6c757d" : "white",
                  border: "none", 
                  borderRadius: "4px",
                  cursor: currentPageProgress === 1 ? "not-allowed" : "pointer",
                  fontSize: "12px"
                }}
              >
                ก่อนหน้า
              </button>
              
              <span style={{ padding: "5px 10px", fontSize: "12px" }}>
                หน้า {currentPageProgress} จาก {totalPagesProgress}
              </span>
              
              <button 
                onClick={() => setCurrentPageProgress(Math.min(totalPagesProgress, currentPageProgress + 1))}
                disabled={currentPageProgress === totalPagesProgress}
                style={{ 
                  padding: "5px 10px", 
                  backgroundColor: currentPageProgress === totalPagesProgress ? "#f3f4f6" : "#007bff", 
                  color: currentPageProgress === totalPagesProgress ? "#6c757d" : "white",
                  border: "none", 
                  borderRadius: "4px",
                  cursor: currentPageProgress === totalPagesProgress ? "not-allowed" : "pointer",
                  fontSize: "12px"
                }}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ เส้นแบ่งระหว่างส่วน */}
      <hr style={{ 
        border: "none", 
        borderTop: "2px solid #dee2e6", 
        margin: "30px 0" 
      }} />

      {/* 📋 รายการงานทั้งหมด */}
      <section style={{ 
        padding: "20px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #e9ecef"
      }}>
        <h2 style={{ fontSize: "18px", marginBottom: "15px" }}>📋 รายการงานทั้งหมด</h2>
        
        <div className="filter-bar" style={{ 
          display: "flex", 
          gap: "10px", 
          marginBottom: "15px", 
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}
          >
            <option value="ทั้งหมด">ทั้งหมด</option>
            {months.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}
          >
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
            style={{ 
              padding: "5px 10px", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              fontSize: "12px",
              minWidth: "150px"
            }}
          />
          
          <button 
            onClick={handleClearFilters}
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
          
          <button 
            onClick={exportToExcel}
            style={{ 
              padding: "5px 10px", 
              backgroundColor: "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Export Excel
          </button>
        </div>

        <div 
          className="table-wrapper"
          ref={tableWrapperRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: isDragging ? 'none' : 'auto',
            overflowX: "auto",
            border: "1px solid #dee2e6",
            borderRadius: "4px"
          }}
        >
          <table className="job-table" style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            fontSize: "12px",
            backgroundColor: "white"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th 
                  onClick={() => handleSort("product_name")}
                  className={sortColumn === "product_name" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "product_name" ? "#e9ecef" : "inherit"
                  }}
                >
                  Product {sortColumn === "product_name" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("customer")}
                  className={sortColumn === "customer" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "customer" ? "#e9ecef" : "inherit"
                  }}
                >
                  Customer {sortColumn === "customer" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("delivery_date")}
                  className={sortColumn === "delivery_date" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "delivery_date" ? "#e9ecef" : "inherit"
                  }}
                >
                  Delivery Date {sortColumn === "delivery_date" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("volume")}
                  className={sortColumn === "volume" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "volume" ? "#e9ecef" : "inherit"
                  }}
                >
                  Volume {sortColumn === "volume" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("po_number")}
                  className={sortColumn === "po_number" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "po_number" ? "#e9ecef" : "inherit"
                  }}
                >
                  PO {sortColumn === "po_number" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("bn_pd")}
                  className={sortColumn === "bn_pd" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "bn_pd" ? "#e9ecef" : "inherit"
                  }}
                >
                  BN PD {sortColumn === "bn_pd" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("bn_wh1")}
                  className={sortColumn === "bn_wh1" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "bn_wh1" ? "#e9ecef" : "inherit"
                  }}
                >
                  BN WH1 {sortColumn === "bn_wh1" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("bn_wh2")}
                  className={sortColumn === "bn_wh2" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "bn_wh2" ? "#e9ecef" : "inherit"
                  }}
                >
                  BN WH2 {sortColumn === "bn_wh2" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("bn_wh3")}
                  className={sortColumn === "bn_wh3" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "bn_wh3" ? "#e9ecef" : "inherit"
                  }}
                >
                  BN WH3 {sortColumn === "bn_wh3" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => handleSort("last_update")}
                  className={sortColumn === "last_update" ? "sorted" : ""}
                  style={{ 
                    padding: "8px", 
                    border: "1px solid #dee2e6", 
                    cursor: "pointer",
                    backgroundColor: sortColumn === "last_update" ? "#e9ecef" : "inherit"
                  }}
                >
                  Last Update {sortColumn === "last_update" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                {role === "admin" && <th style={{ padding: "8px", border: "1px solid #dee2e6" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentJobs.map((job) => (
                <tr 
                  key={`${job.id || job.docId}${job._isDeliveryLog ? `-${job._deliveryQuantity}` : ''}`}
                  onClick={(e) => handleRowClick(job, e)}
                  className="clickable-row"
                  style={{ 
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>
                    {job._isDeliveryLog 
                      ? `${job.product_name}-${job._deliveryQuantity}KG`
                      : job.product_name
                    }
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>{job.customer}</td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>{job.delivery_date}</td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>{job.volume}</td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>
                    {job._isDeliveryLog 
                      ? `${job.po_number}-${job._deliveryQuantity}KG`
                      : job.po_number
                    }
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>{job.batch_no}</td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>{getBatchNoWH(job, 0)}</td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>{getBatchNoWH(job, 1)}</td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>{getBatchNoWH(job, 2)}</td>
                  <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "11px" }}>{renderLastUpdate(job)}</td>
                  {role === "admin" && (
                    <td style={{ padding: "8px", border: "1px solid #dee2e6" }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        style={{ 
                          padding: "3px 6px", 
                          backgroundColor: "#dc3545", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "11px"
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

        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginTop: "15px",
          fontSize: "12px"
        }}>
          <div>
            แสดง {startIndex + 1}-{Math.min(endIndex, filteredAndSearchedJobs.length)} จาก {filteredAndSearchedJobs.length} รายการ
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={filteredAndSearchedJobs.length}>ทั้งหมด</option>
            </select>
            
            <div style={{ display: "flex", gap: "5px" }}>
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{ 
                  padding: "5px 10px", 
                  backgroundColor: currentPage === 1 ? "#f3f4f6" : "#007bff", 
                  color: currentPage === 1 ? "#6c757d" : "white",
                  border: "none", 
                  borderRadius: "4px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "12px"
                }}
              >
                ก่อนหน้า
              </button>
              
              <span style={{ padding: "5px 10px", fontSize: "12px" }}>
                หน้า {currentPage} จาก {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{ 
                  padding: "5px 10px", 
                  backgroundColor: currentPage === totalPages ? "#f3f4f6" : "#007bff", 
                  color: currentPage === totalPages ? "#6c757d" : "white",
                  border: "none", 
                  borderRadius: "4px",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "12px"
                }}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </section>

      {selectedJob && (
        <JobDetailModal 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)} 
        />
      )}
    </div>
  );
}

