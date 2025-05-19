// src/pages/Sales.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Sales() {
  const [form, setForm] = useState({
    id: "",
    po_date: new Date().toISOString().slice(0, 10),
    po_number: "",
    product_name: "",
    volume: "",
    customer: "",
    delivery_date: "",
    remark: "",
  });

  const [jobs, setJobs] = useState([]);
  const [allWorkflows, setAllWorkflows] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "production_workflow"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // เก็บข้อมูลทั้งหมดเพื่อใช้ในการตรวจสอบรายการซ้ำ
      setAllWorkflows(data);
      
      // กรองเฉพาะข้อมูลที่ยังไม่ "Completed" และข้อมูลยังไม่ครบ
      setJobs(
        data.filter(
          (job) =>
            job.currentStep !== "Completed" &&
            (!job.po_number || !job.product_name || !job.volume || !job.customer || !job.delivery_date)
        )
      );
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูล");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectJob = (id) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    setForm({
      id: job.id,
      po_date: job.po_date || new Date().toISOString().slice(0, 10),
      po_number: job.po_number || "",
      product_name: job.product_name || "",
      volume: job.volume || "",
      customer: job.customer || "",
      delivery_date: job.delivery_date || "",
      remark: job.remarks?.sales || "",
    });
    setEditMode(true);
  };

  // ฟังก์ชันตรวจสอบรายการซ้ำ
  const checkDuplicate = () => {
    // ถ้าอยู่ในโหมดแก้ไข ไม่ต้องตรวจสอบซ้ำกับข้อมูลปัจจุบัน
    const dataToCheck = editMode 
      ? allWorkflows.filter(item => item.id !== form.id) 
      : allWorkflows;
    
    // ค้นหารายการที่มีข้อมูลเหมือนกันทั้งหมด (ยกเว้น id, po_date, remark และ po_number)
    const duplicate = dataToCheck.find(
      (item) =>
        item.product_name === form.product_name &&
        item.volume === form.volume &&
        item.customer === form.customer &&
        item.delivery_date === form.delivery_date
    );

    return duplicate;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { product_name, volume, customer, delivery_date } = form;

    if (!product_name || !volume || !customer || !delivery_date) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    // ตรวจสอบข้อมูลซ้ำก่อนแสดงหน้าต่างยืนยัน
    const duplicate = checkDuplicate();
    
    if (duplicate) {
      const confirmDuplicate = window.confirm(
        `⚠️ ข้อมูลนี้ซ้ำกับรายการที่มีอยู่แล้ว:\n\n` +
        `Product: ${duplicate.product_name}\n` +
        `Volume: ${duplicate.volume}\n` +
        `Customer: ${duplicate.customer}\n` +
        `Delivery Date: ${duplicate.delivery_date}\n\n` +
        `ต้องการบันทึกข้อมูลซ้ำหรือไม่?`
      );
      
      if (!confirmDuplicate) {
        return;
      }
      
      // แจ้งเตือนว่ากำลังบันทึกข้อมูลซ้ำ แต่ให้ดำเนินการต่อ
      toast.success("⚠️ กำลังดำเนินการบันทึกข้อมูลซ้ำ");
    }

    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    const { id, po_date, po_number, product_name, volume, customer, delivery_date, remark } = form;

    try {
      if (editMode && id) {
        const jobRef = doc(db, "production_workflow", id);
        await updateDoc(jobRef, {
          po_date,
          po_number,
          product_name,
          volume,
          customer,
          delivery_date,
          "remarks.sales": remark || "",
        });
        toast.success("✅ อัปเดตข้อมูลสำเร็จ");
      } else {
        await addDoc(collection(db, "production_workflow"), {
          po_date,
          po_number,
          product_name,
          volume,
          customer,
          delivery_date,
          batch_no: "",
          currentStep: "Warehouse",
          status: {
            warehouse: "",
            production: "",
            qc_inspection: "",
            qc_coa: "",
            account: "",
          },
          remarks: {
            sales: remark || "",
            warehouse: "",
            production: "",
            qc: "",
            account: "",
          },
          Timestamp_Sales: serverTimestamp(),
          audit_logs: [
            {
              step: "Sales",
              field: "currentStep",
              value: "Warehouse",
              remark: remark || "",
              timestamp: new Date().toISOString(),
            },
          ],
        });
        toast.success("✅ บันทึกเรียบร้อย และส่งต่อไปยัง Warehouse");
      }

      setForm({
        id: "",
        po_date: new Date().toISOString().slice(0, 10),
        po_number: "",
        product_name: "",
        volume: "",
        customer: "",
        delivery_date: "",
        remark: "",
      });
      setEditMode(false);
      fetchData(); // รีเฟรชข้อมูลทั้งหมด
      setShowConfirm(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("❌ เกิดข้อผิดพลาดในการบันทึก");
      setShowConfirm(false);
    }
  };

  return (
    <div className="page-container">
      <h2>📝 <strong>Sales - กรอกข้อมูลเริ่มต้น</strong></h2>

      {jobs.length > 0 && (
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการเพื่อแก้ไขข้อมูล (หากยังไม่ครบ)</strong></label>
          <select onChange={(e) => handleSelectJob(e.target.value)} className="input-box">
            <option value="">-- เลือกรายการ --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {`PO: ${job.po_number || "-"} | CU: ${job.customer || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || "-"}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>📅 <strong>PO Date</strong></label>
          <input type="date" name="po_date" value={form.po_date} onChange={handleChange} className="input-box" disabled />
        </div>

        <div className="form-group">
          <label>📄 <strong>PO Number</strong></label>
          <input type="text" name="po_number" value={form.po_number} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>📦 <strong>Product Name</strong></label>
          <input type="text" name="product_name" value={form.product_name} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>⚖️ <strong>Volume (KG.)</strong></label>
          <input type="number" name="volume" value={form.volume} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>🧑‍💼 <strong>Customer Name</strong></label>
          <input type="text" name="customer" value={form.customer} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>🚚 <strong>Delivery Date</strong></label>
          <input type="date" name="delivery_date" value={form.delivery_date} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input type="text" name="remark" value={form.remark} onChange={handleChange} className="input-box" placeholder="ระบุหมายเหตุหากมี" />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ {editMode ? "อัปเดตข้อมูล" : "บันทึกข้อมูล และส่งต่อไปยัง Warehouse"}
          </button>
        </div>
      </form>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📋 ยืนยันข้อมูลก่อน{editMode ? "อัปเดต" : "บันทึก"}</h3>
            <ul>
              <li><strong>PO Number:</strong> {form.po_number || "–"}</li>
              <li><strong>Product Name:</strong> {form.product_name}</li>
              <li><strong>Volume (KG.):</strong> {form.volume}</li>
              <li><strong>Customer:</strong> {form.customer}</li>
              <li><strong>Delivery Date:</strong> {form.delivery_date}</li>
              {form.remark && <li><strong>หมายเหตุ:</strong> {form.remark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalSubmit}>✅ ยืนยัน</button>
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
