// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Dashboard.css";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedYears, setSelectedYears] = useState(["2025"]);
  const [selectedMonths, setSelectedMonths] = useState(["เม.ย."]);

  const allYears = ["2025", "2026", "2027", "2028", "2029", "2030"];
  const allMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data);
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const countToday = jobs.filter(
    (job) => job.Timestamp_Sales?.toDate?.().toISOString().split("T")[0] === todayStr
  ).length;

  const countThisWeek = jobs.filter((job) => {
    const ts = job.Timestamp_Sales?.toDate?.();
    return ts && ts >= startOfWeek && ts <= today;
  }).length;

  const countFinished = jobs.filter((job) => job.currentStep === "Completed").length;
  const countNotFinished = jobs.filter((job) => job.currentStep !== "Completed").length;

  const monthlyCountsByYear = {};
  for (let year of allYears) {
    monthlyCountsByYear[year] = new Array(12).fill(0);
  }
  jobs.forEach((job) => {
    const ts = job.Timestamp_Sales?.toDate?.();
    if (ts) {
      const y = ts.getFullYear().toString();
      const m = ts.getMonth();
      if (monthlyCountsByYear[y]) {
        monthlyCountsByYear[y][m] += 1;
      }
    }
  });

  const departmentSteps = ["Sales", "Warehouse", "Production", "QC", "Account"];
  const pendingPerDept = departmentSteps.map((step) => ({
    name: step,
    count: jobs.filter((job) => job.currentStep === step).length,
  }));

  const customerCounts = {};
  jobs.forEach((job) => {
    const name = job.customer || "ไม่ระบุ";
    customerCounts[name] = (customerCounts[name] || 0) + 1;
  });
  const topCustomers = Object.entries(customerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const upcomingDue = jobs
    .filter((job) => {
      const due = new Date(job.delivery_date);
      const now = new Date();
      const diff = (due - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7 && job.currentStep !== "Completed";
    })
    .sort((a, b) => new Date(a.delivery_date) - new Date(b.delivery_date));

  const comparisonData = allMonths.map((month, mIdx) => {
    const entry = { month };
    for (let y of selectedYears) {
      if (selectedMonths.includes(month)) {
        entry[y] = monthlyCountsByYear[y][mIdx];
      }
    }
    return entry;
  }).filter((d) => Object.values(d).some((v, i) => i > 0));

  const toggleSelection = (list, value, setList) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="dashboard-container">
      <h2>📊 Dashboard – ภาพรวมการผลิต</h2>

      <div className="summary-cards-grid">
        <div className="summary-card">📅 วันนี้: <strong>{countToday}</strong> งาน</div>
        <div className="summary-card">🗓 สัปดาห์นี้: <strong>{countThisWeek}</strong> งาน</div>
        <div className="summary-card">🕑 ยังไม่เสร็จ: <strong>{countNotFinished}</strong> งาน</div>
        <div className="summary-card">✅ เสร็จแล้ว: <strong>{countFinished}</strong> งาน</div>
      </div>

      <h3>📌 เลือกเดือนและปีที่ต้องการเปรียบเทียบ</h3>
      <div className="filter-bar">
        <div>
          <label>📅 เดือน: </label>
          {allMonths.map((m) => (
            <label key={m} style={{ marginRight: 10 }}>
              <input
                type="checkbox"
                checked={selectedMonths.includes(m)}
                onChange={() => toggleSelection(selectedMonths, m, setSelectedMonths)}
              />{" "}
              {m}
            </label>
          ))}
        </div>
        <div>
          <label>📆 ปี: </label>
          {allYears.map((y) => (
            <label key={y} style={{ marginRight: 10 }}>
              <input
                type="checkbox"
                checked={selectedYears.includes(y)}
                onChange={() => toggleSelection(selectedYears, y, setSelectedYears)}
              />{" "}
              {y}
            </label>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={comparisonData}>
          <XAxis dataKey="month" />
          <YAxis tick={false} axisLine={false} />
          <Tooltip />
          <Legend />
          {selectedYears.map((y, i) => (
            <Bar key={y} dataKey={y} fill={["#3b82f6", "#f59e0b", "#10b981", "#ef4444"][i % 4]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <h3>⏳ งานที่ค้างในแต่ละแผนก</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={pendingPerDept}>
          <XAxis dataKey="name" />
          <YAxis tick={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>

      <h3>🏆 ลูกค้าที่มีงานเยอะที่สุด</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={topCustomers}>
          <XAxis dataKey="name" />
          <YAxis tick={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>

      <h3>⏰ งานที่ใกล้วันส่ง (7 วัน)</h3>
      <table className="job-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Customer</th>
            <th>Delivery Date</th>
            <th>Current Step</th>
          </tr>
        </thead>
        <tbody>
          {upcomingDue.map((job) => (
            <tr key={job.id}>
              <td>{job.product_name}</td>
              <td>{job.customer}</td>
              <td>{job.delivery_date}</td>
              <td>{job.currentStep}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
