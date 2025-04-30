// src/pages/Warehouse.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Warehouse() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [form, setForm] = useState({
    stock: "",
    step: "",
    batch_no_wh1: "",
    batch_no_wh2: "",
    batch_no_wh3: "",
    remark: "",
  });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Warehouse"));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectJob = (e) => {
    setSelectedJobId(e.target.value);
    setForm({ stock: "", step: "", batch_no_wh1: "", batch_no_wh2: "", batch_no_wh3: "", remark: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !form.stock) {
      toast.error("❌ กรุณาเลือกงานและกรอกข้อมูลให้ครบ");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedJobId);

    // ✅ Logic: currentStep ไป Production เฉพาะ “มีครบ + เบิกเสร็จ”
let nextStep = "Warehouse";
if (
  form.stock === "มีครบตามจำนวน" || // กรณีที่กรอก Batch No ได้ทันที
  (form.step === "เบิกเสร็จ")         // กรณีที่สถานะเลือกเบิกเสร็จ
) {
  nextStep = "Production";
}

    const updates = {
      status: { warehouse: form.step || "ยังไม่เบิก" },
      currentStep: nextStep,
      batch_no_warehouse: [form.batch_no_wh1, form.batch_no_wh2, form.batch_no_wh3].filter(Boolean),
      remarks: {
        warehouse: form.remark || "",
      },
      Timestamp_Warehouse: new Date().toISOString(),
    };

    try {
      await updateDoc(jobRef, updates);
      toast.success("✅ อัปเดตสำเร็จ และส่งงานต่อเรียบร้อย");
      fetchJobs();
      setSelectedJobId("");
      setForm({ stock: "", step: "", batch_no_wh1: "", batch_no_wh2: "", batch_no_wh3: "", remark: "" });
      setShowConfirm(false);
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการอัปเดต");
      setShowConfirm(false);
    }
  };

  return (
    <div className="page-container">
      <h2>🏭 <strong>Warehouse - อัปเดตข้อมูลสต๊อกสินค้า</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="full-span">
          <label>📋 เลือกรายการ</label>
          <select value={selectedJobId} onChange={handleSelectJob} className="input-box">
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.po_number || "-"} - {job.customer || "-"} - {job.product_name || "-"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>📦 สต๊อกสินค้า</label>
          <select name="stock" value={form.stock} onChange={handleChange} className="input-box">
            <option value="">-- เลือกสต๊อกสินค้า --</option>
            <option value="มีครบตามจำนวน">มีครบตามจำนวน</option>
            <option value="มีบางส่วน">มีบางส่วน</option>
            <option value="ไม่มี">ไม่มี</option>
          </select>
        </div>

        {(form.stock === "มีครบตามจำนวน" || form.stock === "มีบางส่วน") && (
          <>
            <div>
              <label>🔢 Batch No WH1</label>
              <input type="text" name="batch_no_wh1" value={form.batch_no_wh1} onChange={handleChange} className="input-box" />
            </div>
            <div>
              <label>🔢 Batch No WH2</label>
              <input type="text" name="batch_no_wh2" value={form.batch_no_wh2} onChange={handleChange} className="input-box" />
            </div>
            <div>
              <label>🔢 Batch No WH3</label>
              <input type="text" name="batch_no_wh3" value={form.batch_no_wh3} onChange={handleChange} className="input-box" />
            </div>
          </>
        )}

        {form.stock !== "มีครบตามจำนวน" && (
          <div>
            <label>🔄 สถานะ</label>
            <select name="step" value={form.step} onChange={handleChange} className="input-box">
              <option value="">-- เลือกสถานะ --</option>
              <option value="ยังไม่เบิก">ยังไม่เบิก</option>
              <option value="กำลังเบิก">กำลังเบิก</option>
              <option value="เบิกเสร็จ">เบิกเสร็จ</option>
            </select>
          </div>
        )}

        <div className="full-span">
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input type="text" name="remark" value={form.remark} onChange={handleChange} className="input-box" placeholder="ระบุหมายเหตุหากมี" />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกข้อมูล Warehouse
        </button>
      </form>

      {showConfirm && (
        <div className="overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul>
              <li><strong>สต๊อกสินค้า:</strong> {form.stock}</li>
              {form.stock !== "มีครบตามจำนวน" && (
                <li><strong>สถานะ:</strong> {form.step || "–"}</li>
              )}
              {(form.batch_no_wh1 || form.batch_no_wh2 || form.batch_no_wh3) && (
                <>
                  {form.batch_no_wh1 && <li><strong>Batch No WH1:</strong> {form.batch_no_wh1}</li>}
                  {form.batch_no_wh2 && <li><strong>Batch No WH2:</strong> {form.batch_no_wh2}</li>}
                  {form.batch_no_wh3 && <li><strong>Batch No WH3:</strong> {form.batch_no_wh3}</li>}
                </>
              )}
              {form.remark && <li><strong>หมายเหตุ:</strong> {form.remark}</li>}
            </ul>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button className="submit-btn" onClick={handleFinalSubmit}>✅ ยืนยันการบันทึก</button>
              <button className="clear-button" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
