import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const getStatusColor = (step, currentStep) => {
    if (step === "Sales") return "#4ade80"; // ✅ Sales = เขียวทันที

    const flow = ["Sales", "Warehouse", "Production", "QC", "Account", "Completed"];
    const currentIndex = flow.indexOf(currentStep);
    const stepIndex = flow.indexOf(step);

    if (stepIndex < currentIndex) return "#facc15"; // ผ่านแล้ว = เหลือง
    if (stepIndex === currentIndex) return "#4ade80"; // current step = เขียว
    return "#e5e7eb"; // ยังไม่ถึง = เทา
  };

  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

  return (
    <div className="progress-table-wrapper">
      <table className="progress-table">
        <thead>
          <tr>
            <th>Product</th>
            {steps.map((step) => (
              <th key={step}>{step}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td><span role="img" aria-label="doc">📄</span> {job.product_name}</td>
              {steps.map((step) => (
                <td key={step}>
                  <div
                    style={{
                      backgroundColor: getStatusColor(step, job.currentStep),
                      height: "20px",
                      width: "100px",
                      maxWidth: "100px",
                      borderRadius: "6px",
                      margin: "auto"
                    }}
                  ></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
