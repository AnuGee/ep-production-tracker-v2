// src/utils/Dashboard_Addon_ExportFunction.js
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * สร้างไฟล์ Excel ที่รวมข้อมูลการผลิตทั้งหมด
 * @param {Array} jobs - ข้อมูลงานทั้งหมด
 */
export const exportDashboardExcel = (jobs) => {
  const allData = jobs.map((job, index) => ({
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
  }));

  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard Export");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, `EP_Dashboard_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
