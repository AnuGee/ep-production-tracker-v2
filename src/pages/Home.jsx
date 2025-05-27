// src/pages/Home.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import ProgressBoard from "./ProgressBoard"; // ตรวจสอบว่า import ถูกต้อง
import JobDetailModal from "../components/JobDetailModal";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { doc, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/Responsive.css"; // ตรวจสอบว่าไฟล์ CSS นี้มีอยู่จริงและเส้นทางถูกต้อง
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

  // --- State และ Ref สำหรับการลาก ---
  const tableWrapperRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Pagination states สำหรับตารางหลัก (ไม่ใช่ Progress Board)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setStartX(e.pageX - tableWrapperRef.current.offsetLeft);
    setScrollLeft(tableWrapperRef.current.scrollLeft);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - tableWrapperRef.current.offsetLeft;
      const walk = (x - startX) * 2; // The scroll speed
      tableWrapperRef.current.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft]
  );

  const fetchJobs = useCallback(async () => {
    const jobsCollection = collection(db, "jobs");
    const jobSnapshot = await getDocs(jobsCollection);
    const jobsList = jobSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setJobs(jobsList);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIndicator = (column) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? " 🔼" : " 🔽";
    }
    return "";
  };

  const handleDeleteJob = async (id) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่ต้องการลบงานนี้?")) {
      try {
        await deleteDoc(doc(db, "jobs", id));
        setJobs(jobs.filter((job) => job.id !== id));
        alert("ลบงานสำเร็จ!");
      } catch (e) {
        console.error("Error deleting document: ", e);
        alert("เกิดข้อผิดพลาดในการลบงาน!");
      }
    }
  };


  // ----------------------------------------------------------------------
  // ✅ ส่วนสำคัญ: ตรรกะการรวมงาน (processedJobs) ย้ายมาจาก ProgressBoard.jsx
  //    และเพิ่มการเรียงลำดับที่นี่
  // ----------------------------------------------------------------------

  // Group jobs by PO prefix to handle partial deliveries
  const jobMap = new Map();
  jobs.forEach((job) => {
    // ใช้ PO Prefix เป็น key เช่น "PO001" จาก "PO001" หรือ "PO001-80KG"
    const poPrefix = job.po_number?.split("-")[0] || job.po_number; 
    if (!jobMap.has(poPrefix)) {
      jobMap.set(poPrefix, []);
    }
    jobMap.get(poPrefix).push(job);
  });

  // Create processedJobs: consolidate partial deliveries and rename products
  const processedJobs = Array.from(jobMap.values()).map(
    (jobList) => {
      // Find a job in the list that has a "-xxxKG" suffix in its PO number
      const partialDeliveryJob = jobList.find((job) =>
        job.po_number?.includes("KG")
      );

      // If a partial delivery job exists, use it as the main job for the group
      if (partialDeliveryJob) {
        // Ensure the product_name includes the "-xxxKG" suffix for clarity
        // E.g., if product_name is "Product A" and po_number is "PO-80KG", it becomes "Product A-80KG"
        if (!partialDeliveryJob.product_name?.includes("-") && partialDeliveryJob.po_number?.includes("-")) {
          const poSuffix = partialDeliveryJob.po_number.split('-').slice(-1)[0];
          partialDeliveryJob.product_name = `${partialDeliveryJob.product_name}-${poSuffix}`;
        }
        return partialDeliveryJob;
      }
      // If no partial delivery job exists (either full delivery or not delivered yet), use the first job in the list (original PO)
      return jobList[0];
    }
  )
  .sort((a, b) => {
      // จัดเรียงตาม product_name. localeCompare ใช้สำหรับสตริง (รองรับภาษาไทย)
      // ใส่ ?. เพื่อป้องกัน error ถ้า product_name เป็น undefined/null
      const productNameA = a.product_name || '';
      const productNameB = b.product_name || '';
      return productNameA.localeCompare(productNameB);
  }); // <<<< ✅ เพิ่มการเรียงลำดับตรงนี้!

  // ----------------------------------------------------------------------
  // ✅ สิ้นสุดส่วนตรรกะการรวมงาน
  // ----------------------------------------------------------------------


  // Filter jobs based on selected criteria (now uses processedJobs)
  const filteredJobs = processedJobs.filter((job) => {
    const jobYear = job.delivery_date ? new Date(job.delivery_date).getFullYear().toString() : "";
    const jobMonth = job.delivery_date ? (new Date(job.delivery_date).getMonth() + 1).toString() : "";
    const jobStatus = job.currentStep || "ยังไม่เริ่ม";

    const matchesYear = selectedYear === "ทั้งหมด" || jobYear === selectedYear;
    const matchesMonth = selectedMonth === "ทั้งหมด" || jobMonth === selectedMonth;
    const matchesStatus = statusFilter === "ทั้งหมด" || jobStatus === statusFilter;
    const matchesSearch =
      searchText === "" ||
      job.customer?.toLowerCase().includes(searchText.toLowerCase()) ||
      job.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      job.po_number?.toLowerCase().includes(searchText.toLowerCase());

    return matchesYear && matchesMonth && matchesStatus && matchesSearch;
  });

  // Prepare jobs specifically for the Progress Board (derived from filteredJobs)
  const progressJobsForProgressBoard = filteredJobs.filter(job => {
    const po = job.po_number || "";
    const hasKG = po.includes("KG");
    const delivered = (job.delivery_logs || []).reduce(
        (sum, d) => sum + Number(d.quantity || 0), 0
    );
    const volume = Number(job.volume || 0);

    // Filter logic for what to show on Progress Board:
    // 1. Show jobs with "-xxxKG" in their PO number (partial deliveries)
    if (hasKG) return true;
    // 2. OR show jobs that have not been delivered yet (delivered === 0)
    if (delivered === 0) return true;
    // 3. OR show jobs that have been fully delivered (delivered === volume)
    if (delivered === volume) return true;

    // หากคุณต้องการแสดงทุกงานใน ProgressBoard (ไม่ว่าจะมี -KG หรือยังไม่ส่ง/ส่งครบ)
    // สามารถ uncomment บรรทัดล่างนี้ และ comment 3 บรรทัดบน (if (hasKG)...)
    // return true;

    return false; // Default: do not display if none of the above conditions are met
  });


  // --- Pagination for the Main Table (filteredJobs) ---
  const indexOfLastItem = currentPage * Number(itemsPerPage);
  const indexOfFirstItem = indexOfLastItem - Number(itemsPerPage);
  // Sort main table jobs by the selected column and direction
  const sortedAndPaginatedMainJobs = [...filteredJobs].sort((a, b) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    // Handle undefined/null values for sorting
    if (aValue === undefined || aValue === null) return sortDirection === "asc" ? 1 : -1;
    if (bValue === undefined || bValue === null) return sortDirection === "asc" ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    // Handle numeric or other types if necessary
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  }).slice(indexOfFirstItem, indexOfLastItem);


  const paginate = (pageNumber) => setCurrentPage(pageNumber);


  // --- Pagination for the Progress Board (progressJobsForProgressBoard) ---
  const indexOfLastItemProgress = currentPageProgress * Number(itemsPerPageProgress);
  const indexOfFirstItemProgress = indexOfLastItemProgress - Number(itemsPerPageProgress);
  const currentItemsProgress = itemsPerPageProgress === "All"
    ? progressJobsForProgressBoard // If "All" is selected, show all items
    : progressJobsForProgressBoard.slice(indexOfFirstItemProgress, indexOfLastItemProgress); // Otherwise, slice for pagination


  // Calculate total pages for Progress Board pagination controls
  const totalPagesProgress =
    itemsPerPageProgress === "All"
      ? 1 // If showing all, there's only 1 "page"
      : Math.ceil(progressJobsForProgressBoard.length / Number(itemsPerPageProgress));

  // --- Export to Excel Function ---
  const exportToExcel = () => {
    const data = filteredJobs.map((job) => ({
      "ลำดับ": job.docId,
      "รหัส PO": job.po_number,
      "ชื่อลูกค้า": job.customer,
      "ชื่อสินค้า": job.product_name,
      "ปริมาณ": job.volume,
      "สถานะปัจจุบัน": job.currentStep,
      "Sales": job.status?.sales || "N/A",
      "Warehouse": job.status?.warehouse || "N/A",
      "Production": job.status?.production || "N/A",
      "QC": job.status?.qc_inspection || "N/A",
      "COA": job.status?.qc_coa || "N/A",
      "Logistics": (job.delivery_logs || []).reduce((sum, d) => sum + Number(d.quantity || 0), 0) + " / " + job.volume,
      "Account": job.status?.account || "N/A",
      "วันที่ส่ง": job.delivery_date,
      "อัปเดตล่าสุด": renderLastUpdate(job, false), // Pass false to avoid rendering spans
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Job_Data.xlsx");
  };

  // --- Helper functions for rendering status badges and last update ---
  const renderStatusBadge = (type, label, job) => {
    const status = job.status || {};
    let color = "";
    let displayText = "";

    switch (type) {
      case "SL": // Sales
        if (job.product_name && job.po_number && job.volume && job.customer) {
          color = "#4ade80"; // Green
          displayText = "ครบ";
        } else {
          color = "#e5e7eb"; // Grey
          displayText = "รอ";
        }
        break;
      case "WH": // Warehouse
        if (status.warehouse === "เบิกเสร็จ" || status.warehouse === "มีครบตามจำนวน") {
          color = "#4ade80";
          displayText = "ครบ";
        } else if (status.warehouse === "กำลังเบิก") {
          color = "#facc15"; // Yellow
          displayText = "เบิก";
        } else {
          color = "#e5e7eb";
          displayText = "รอ";
        }
        break;
      case "PR": // Production
        if (status.production === "ผลิตเสร็จ") {
          color = "#4ade80";
          displayText = "เสร็จ";
        } else if (["กำลังผลิต", "รอผลตรวจ", "กำลังบรรจุ"].includes(status.production)) {
          color = "#facc15";
          displayText = "ผลิต";
        } else {
          color = "#e5e7eb";
          displayText = "รอ";
        }
        break;
      case "QC": // QC Inspection
        if (status.qc_inspection === "ตรวจผ่านแล้ว") {
          color = "#4ade80";
          displayText = "ผ่าน";
        } else if (["กำลังตรวจ", "กำลังตรวจ (Hold)", "กำลังตรวจ (รอปรับ)"].includes(status.qc_inspection)) {
          color = "#facc15";
          displayText = "ตรวจ";
        } else {
          color = "#e5e7eb";
          displayText = "รอ";
        }
        break;
      case "COA": // COA Status
        if (status.qc_coa === "เตรียมพร้อมแล้ว") {
          color = "#4ade80";
          displayText = "พร้อม";
        } else if (status.qc_coa === "กำลังเตรียม") {
          color = "#facc15";
          displayText = "รอ";
        } else {
          color = "#e5e7eb";
          displayText = "รอ";
        }
        break;
      case "LO": // Logistics
        const deliveredQuantity = (job.delivery_logs || []).reduce(
          (sum, d) => sum + Number(d.quantity || 0), 0
        );
        const totalVolume = Number(job.volume || 0);

        if (deliveredQuantity === totalVolume && totalVolume > 0) {
          color = "#4ade80"; // Green - Fully delivered
          displayText = "ส่งครบ";
        } else if (deliveredQuantity > 0 && deliveredQuantity < totalVolume) {
          color = "#facc15"; // Yellow - Partially delivered
          displayText = "ส่งบางส่วน";
        } else {
          color = "#e5e7eb"; // Grey - Not delivered yet
          displayText = "ยังไม่ส่ง";
        }
        break;
      case "AC": // Account
        if (status.account === "Invoice ออกแล้ว") {
          color = "#4ade80";
          displayText = "ออกแล้ว";
        } else if (status.account === "Invoice ยังไม่ออก") {
          color = "#facc15";
          displayText = "รอออก";
        } else {
          color = "#e5e7eb";
          displayText = "รอ";
        }
        break;
      default:
        color = "#e5e7eb";
        displayText = "N/A";
    }

    return (
      <span
        style={{
          backgroundColor: color,
          padding: "2px 8px",
          borderRadius: "10px",
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
          display: "inline-block",
          minWidth: "60px",
          textAlign: "center",
        }}
      >
        {displayText}
      </span>
    );
  };

  const renderLastUpdate = (job, renderSpan = true) => {
    let lastUpdateText = "ไม่มีข้อมูล";
    let lastUpdateDate = null;

    if (job.status && typeof job.status === 'object') {
      Object.values(job.status).forEach(statusEntry => {
        if (statusEntry && typeof statusEntry === 'object' && statusEntry.timestamp) {
          const timestamp = statusEntry.timestamp;
          if (timestamp && timestamp.toDate) { // Firebase Timestamp
            const date = timestamp.toDate();
            if (!lastUpdateDate || date > lastUpdateDate) {
              lastUpdateDate = date;
            }
          } else if (typeof timestamp === 'string' && !isNaN(new Date(timestamp))) { // ISO string date
            const date = new Date(timestamp);
            if (!lastUpdateDate || date > lastUpdateDate) {
              lastUpdateDate = date;
            }
          }
        } else if (typeof statusEntry === 'string' && !isNaN(new Date(statusEntry))) { // Direct string date
          const date = new Date(statusEntry);
          if (!lastUpdateDate || date > lastUpdateDate) {
            lastUpdateDate = date;
          }
        }
      });
    }

    // Also check creation_date if available
    if (job.creation_date) {
      const creationDate = new Date(job.creation_date);
      if (!lastUpdateDate || creationDate > lastUpdateDate) {
        lastUpdateDate = creationDate;
      }
    }

    // Check delivery logs
    if (job.delivery_logs && Array.isArray(job.delivery_logs)) {
      job.delivery_logs.forEach(log => {
        if (log.timestamp && log.timestamp.toDate) {
          const date = log.timestamp.toDate();
          if (!lastUpdateDate || date > lastUpdateDate) {
            lastUpdateDate = date;
          }
        } else if (log.timestamp && typeof log.timestamp === 'string' && !isNaN(new Date(log.timestamp))) {
          const date = new Date(log.timestamp);
          if (!lastUpdateDate || date > lastUpdateDate) {
            lastUpdateDate = date;
          }
        }
      });
    }
     // Check for currentStep updates
    if (job.currentStepHistory && Array.isArray(job.currentStepHistory)) {
        job.currentStepHistory.forEach(entry => {
            if (entry.timestamp && entry.timestamp.toDate) {
                const date = entry.timestamp.toDate();
                if (!lastUpdateDate || date > lastUpdateDate) {
                    lastUpdateDate = date;
                }
            } else if (typeof entry.timestamp === 'string' && !isNaN(new Date(entry.timestamp))) {
                const date = new Date(entry.timestamp);
                if (!lastUpdateDate || date > lastUpdateDate) {
                    lastUpdateDate = date;
                }
            }
        });
    }


    if (lastUpdateDate) {
      const today = new Date();
      const diffTime = Math.abs(today - lastUpdateDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        lastUpdateText = "วันนี้";
      } else if (diffDays === 1) {
        lastUpdateText = "เมื่อวาน";
      } else if (diffDays <= 7) {
        lastUpdateText = `${diffDays} วันที่แล้ว`;
      } else {
        lastUpdateText = lastUpdateDate.toLocaleDateString("th-TH");
      }
    }

    return renderSpan ? (
      <span
        style={{
          backgroundColor: lastUpdateText === "วันนี้" ? "#dcfce7" : lastUpdateText === "เมื่อวาน" ? "#fffbeb" : lastUpdateText.includes("วันที่แล้ว") && parseInt(lastUpdateText) <= 7 ? "#fef2f2" : "transparent",
          color: lastUpdateText === "วันนี้" ? "#16a34a" : lastUpdateText === "เมื่อวาน" ? "#d97706" : lastUpdateText.includes("วันที่แล้ว") && parseInt(lastUpdateText) <= 7 ? "#dc2626" : "#6b7280",
          padding: "2px 8px",
          borderRadius: "10px",
          fontWeight: "bold",
          fontSize: "12px",
          display: "inline-block",
          minWidth: "80px",
          textAlign: "center",
        }}
      >
        {lastUpdateText}
      </span>
    ) : lastUpdateText;
  };


  const getJobStatus = (job) => {
    // This function seems to be primarily for charting or summary, not the badge colors
    return job.currentStep || "ยังไม่เริ่ม";
  };


  // Generate years for filter dropdown
  const allYears = Array.from(new Set(
    jobs.map((job) => new Date(job.delivery_date).getFullYear().toString())
  )).sort((a, b) => b - a);


  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">แดชบอร์ด</h1>

      {/* Bar Chart */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">สรุปงานตามสถานะ</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={Object.entries(
              filteredJobs.reduce((acc, job) => {
                const status = getJobStatus(job);
                acc[status] = (acc[status] || 0) + 1;
                return acc;
              }, {})
            ).map(([name, value]) => ({ name, value }))}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters for main table */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">ตัวกรองงาน</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="yearFilter" className="block text-sm font-medium text-gray-700">ปีที่จัดส่ง:</label>
            <select
              id="yearFilter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {allYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="monthFilter" className="block text-sm font-medium text-gray-700">เดือนที่จัดส่ง:</label>
            <select
              id="monthFilter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString()}>
                  {new Date(0, month - 1).toLocaleString("th-TH", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">สถานะงาน:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="Sales">Sales</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Production">Production</option>
              <option value="QC">QC</option>
              <option value="Logistics">Logistics</option>
              <option value="Account">Account</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">ค้นหา (ลูกค้า, สินค้า, PO):</label>
            <input
              type="text"
              id="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              placeholder="ค้นหา..."
            />
          </div>
        </div>
      </div>

      {/* Progress Board */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">ความคืบหน้าของงานแต่ละชุด</h2>
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            {[10, 25, 50, "All"].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setItemsPerPageProgress(num);
                  setCurrentPageProgress(1);
                }}
                className={`py-1 px-3 rounded-md text-sm font-medium ${
                  itemsPerPageProgress === num
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                แสดง: {num} รายการ
              </button>
            ))}
          </div>
          {/* Pagination for Progress Board */}
          {totalPagesProgress > 1 && itemsPerPageProgress !== "All" && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPageProgress(prev => Math.max(prev - 1, 1))}
                disabled={currentPageProgress === 1}
                className="py-1 px-3 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <span className="text-sm text-gray-700">
                หน้า {currentPageProgress} / {totalPagesProgress}
              </span>
              <button
                onClick={() => setCurrentPageProgress(prev => Math.min(prev + 1, totalPagesProgress))}
                disabled={currentPageProgress === totalPagesProgress}
                className="py-1 px-3 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
        {/* ProgressBoard component receives data that's already processed, sorted, and paginated */}
        <ProgressBoard jobs={currentItemsProgress} />
      </div>

      {/* Main Jobs Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">รายการงานทั้งหมด</h2>
        <div className="mb-4">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700"
          >
            Export to Excel
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar" ref={tableWrapperRef}
          onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}
        >
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th
                  className={`py-3 px-6 text-left cursor-pointer ${sortColumn === 'docId' ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSort("docId")}
                >
                  ลำดับ {getSortIndicator("docId")}
                </th>
                <th
                  className={`py-3 px-6 text-left cursor-pointer ${sortColumn === 'po_number' ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSort("po_number")}
                >
                  รหัส PO {getSortIndicator("po_number")}
                </th>
                <th
                  className={`py-3 px-6 text-left cursor-pointer ${sortColumn === 'customer' ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSort("customer")}
                >
                  ชื่อลูกค้า {getSortIndicator("customer")}
                </th>
                <th
                  className={`py-3 px-6 text-left cursor-pointer ${sortColumn === 'product_name' ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSort("product_name")}
                >
                  ชื่อสินค้า {getSortIndicator("product_name")}
                </th>
                <th className="py-3 px-6 text-left">สถานะแผนก</th>
                <th
                  className={`py-3 px-6 text-left cursor-pointer ${sortColumn === 'volume' ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSort("volume")}
                >
                  ปริมาณ {getSortIndicator("volume")}
                </th>
                <th
                  className={`py-3 px-6 text-left cursor-pointer ${sortColumn === 'delivery_date' ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSort("delivery_date")}
                >
                  วันที่จัดส่ง {getSortIndicator("delivery_date")}
                </th>
                <th
                  className={`py-3 px-6 text-left cursor-pointer ${sortColumn === 'last_update' ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSort("last_update")}
                >
                  อัปเดตล่าสุด {getSortIndicator("last_update")}
                </th>
                <th className="py-3 px-6 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {sortedAndPaginatedMainJobs.length > 0 ? (
                sortedAndPaginatedMainJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="border-b border-gray-200 hover:bg-gray-100"
                  >
                    <td className={`py-3 px-6 text-left whitespace-nowrap ${sortColumn === 'docId' ? 'bg-blue-50' : ''}`}>
                      {job.docId}
                    </td>
                    <td className={`py-3 px-6 text-left ${sortColumn === 'po_number' ? 'bg-blue-50' : ''}`}>
                      {job.po_number}
                    </td>
                    <td className={`py-3 px-6 text-left ${sortColumn === 'customer' ? 'bg-blue-50' : ''}`}>
                      {job.customer}
                    </td>
                    <td className={`py-3 px-6 text-left ${sortColumn === 'product_name' ? 'bg-blue-50' : ''}`}>
                      {job.product_name}
                    </td>
                    <td className="py-3 px-6 text-left flex flex-wrap gap-1">
                      {renderStatusBadge("SL", "Sales", job)} {' '}
                      {renderStatusBadge("WH", "Warehouse", job)} {' '}
                      {renderStatusBadge("PR", "Production", job)} {' '}
                      {renderStatusBadge("QC", "QC", job)} {' '}
                      {renderStatusBadge("COA", "COA", job)} {' '}
                      {renderStatusBadge("LO", "Logistics", job)} {' '}
                      {renderStatusBadge("AC", "Account", job)}
                    </td>
                    <td className={`py-3 px-6 text-left ${sortColumn === 'volume' ? 'bg-blue-50' : ''}`}>
                      {job.volume || "–"}
                    </td>
                    <td className={`py-3 px-6 text-left ${sortColumn === 'delivery_date' ? 'bg-blue-50' : ''}`}>
                      {job.delivery_date || "–"}
                    </td>
                    <td className={`py-3 px-6 text-left ${sortColumn === 'last_update' ? 'bg-blue-50' : ''}`}>
                      {renderLastUpdate(job)}
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      {(role === "Admin" || role === "Sales") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteJob(job.id);
                          }}
                          style={{
                            backgroundColor: "#ef4444",
                            color: "white", border: "none", borderRadius: "6px",
                            padding: "4px 12px", fontWeight: "bold", cursor: "pointer", fontSize: '12px'
                          }}
                          title="Delete Job"
                        >
                          ลบ
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                 <tr><td colSpan="13" style={{ textAlign: 'center', padding: '20px' }}>ไม่พบงานที่ตรงกับเงื่อนไข</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination for Main Table */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex space-x-2">
          {[10, 25, 50, "All"].map((num) => (
            <button
              key={num}
              onClick={() => {
                setItemsPerPage(num);
                setCurrentPage(1);
              }}
              className={`py-1 px-3 rounded-md text-sm font-medium ${
                itemsPerPage === num
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              แสดง: {num} รายการ
            </button>
          ))}
        </div>
        {itemsPerPage !== "All" && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="py-1 px-3 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <span className="text-sm text-gray-700">
              หน้า {currentPage} / {Math.ceil(filteredJobs.length / Number(itemsPerPage))}
            </span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === Math.ceil(filteredJobs.length / Number(itemsPerPage))}
              className="py-1 px-3 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
      </div>

      {/* --- Modal --- */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
