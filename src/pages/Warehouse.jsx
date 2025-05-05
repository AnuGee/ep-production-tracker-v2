import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Warehouse() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [stock, setStock] = useState("");
  const [step, setStep] = useState("");
  const [batch1, setBatch1] = useState("");
  const [batch2, setBatch2] = useState("");
  const [batch3, setBatch3] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const filtered = data.filter((job) => job.currentStep === "Warehouse");
    setJobs(filtered);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !stock) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (stock !== "มีครบตามจำนวน" && !step) {
      toast.error("❌ กรุณาเลือกสถานะเบิก");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    try {
      const jobRef = doc(db, "production_workflow", selectedJobId);

      let nextStep = "Warehouse";
      let statusUpdate = {
        warehouse: step || "",
      };

      if (stock === "มีครบตามจำนวน") {
        nextStep = "QC";
        statusUpdate = {
          warehouse: "",
          qc_inspection: "skip",
          qc_coa: "ยังไม่เตรียม",
        };
      } else if (step === "เบิกเสร็จ") {
        nextStep = "Production";
      }

      const batchNumbers = [batch1, batch2, batch3].filter((b) => b !== "");

      await updateDoc(jobRef, {
        currentStep: nextStep,
        stock,
        step,
        batch_no_warehouse: batchNumbers,
        [`remarks.warehouse`]: remark,
        [`status`]: {
          ...(statusUpdate || {}),
        },
        Timestamp_Warehouse: serverTimestamp(),
      });

      const job = jobs.find((job) => job.id === selectedJobId);
      const auditLogs = job?.audit_logs || [];

      await updateDoc(jobRef, {
        audit_logs: [
          ...auditLogs,
          {
            step: "Warehouse",
            field: "stock",
            value: stock,
            remark,
            timestamp: new Date().toISOString(),
          },
          ...(step
            ? [
                {
                  step: "Warehouse",
                  field: "step",
                  value: step,
                  remark,
                  timestamp: new Date().toISOString(),
                },
              ]
            : []),
        ],
      });

      toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      setSelectedJobId("");
      setStock("");
      setStep("");
      setBatch1("");
      setBatch2("");
      setBatch3("");
      setRemark("");
      setShowConfirm(false);
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="page-container">
      <h2>🏭 <strong>Warehouse - อัปเดตข้อมูลสต๊อกสินค้า</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.product_name} - {job.customer}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group full-span">
          <label>📦 <strong>สต๊อกสินค้า</strong></label>
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="input-box"
          >
            <option value="">-- สต๊อกสินค้า --</option>
            <option value="มีครบตามจำนวน">มีครบตามจำนวน</option>
            <option value="มีบางส่วน">มีบางส่วน</option>
            <option value="ไม่มี">ไม่มี</option>
          </select>
        </div>

        {stock !== "มีครบตามจำนวน" && (
          <div className="form-group full-span">
            <label>🔄 <strong>สถานะ</strong></label>
            <select
              value={step}
              onChange={(e) => setStep(e.target.value)}
              className="input-box"
            >
              <option value="">-- เลือกสถานะ --</option>
              <option value="ยังไม่เบิก">ยังไม่เบิก</option>
              <option value="กำลังเบิก">กำลังเบิก</option>
              <option value="เบิกเสร็จ">เบิกเสร็จ</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label>🔢 <strong>Batch No WH1</strong></label>
          <input
            type="text"
            value={batch1}
            onChange={(e) => setBatch1(e.target.value)}
            className="input-box"
          />
        </div>
        <div className="form-group">
          <label>🔢 <strong>Batch No WH2</strong></label>
          <input
            type="text"
            value={batch2}
            onChange={(e) => setBatch2(e.target.value)}
            className="input-box"
          />
        </div>
        <div className="form-group">
          <label>🔢 <strong>Batch No WH3</strong></label>
          <input
            type="text"
            value={batch3}
            onChange={(e) => setBatch3(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="form-group full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกข้อมูล Warehouse
          </button>
        </div>
      </form>

      {/* ✅ MODAL Confirm */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูลก่อนบันทึก</strong></h3>
            <ul style={{ textAlign: "left", marginTop: "1rem" }}>
              <li><strong>สต๊อกสินค้า:</strong> {stock}</li>
              {step && <li><strong>สถานะ:</strong> {step}</li>}
              {batch1 && <li><strong>WH1:</strong> {batch1}</li>}
              {batch2 && <li><strong>WH2:</strong> {batch2}</li>}
              {batch3 && <li><strong>WH3:</strong> {batch3}</li>}
              {remark && <li><strong>หมายเหตุ:</strong> {remark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalSubmit}>
                ✅ ยืนยันการบันทึก
              </button>
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
