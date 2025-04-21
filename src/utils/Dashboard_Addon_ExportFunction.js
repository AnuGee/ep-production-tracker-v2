// Export function for full report (Admin only)
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportFullReport = async () => {
  const snapshot = await getDocs(collection(db, "production_workflow"));
  const allData = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      "Batch No": d.batch_no || "-",
      "Product": d.product_name || "-",
      "Customer": d.customer || "-",
      "Current Step": d.currentStep || "-",
      "Status - Sales": d.status?.sales || "-",
      "Status - WH": d.status?.warehouse || "-",
      "Status - PD": d.status?.production || "-",
      "Status - QC": d.status?.qc_inspection || "-",
      "Status - COA": d.status?.qc_coa || "-",
      "Status - AC": d.status?.account || "-",
      "Last Update": d.audit_logs?.at(-1)?.timestamp || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "EP Full Report");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer]), "EP_Full_Report_Admin.xlsx");
};
