// src/pages/Reports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./Reports.css";

/**
 * =========================
 * ✅ CONFIG: ถ้าชื่อ field ไม่ตรง ให้แก้ตรงนี้จุดเดียว
 * =========================
 */
const F = {
  collection: "production_workflow",

  product: "product_name",
  customer: "customer",
  volume: "volume",
  currentStep: "currentStep",

  // ใช้ timestamp ของ Sales เป็นฐานกรองช่วงเวลา
  createdAt: "Timestamp_Sales",

  ts: {
    Sales: "Timestamp_Sales",
    Warehouse: "Timestamp_Warehouse",
    Production: "Timestamp_Production",
    QC: "Timestamp_QC",
    Account: "Timestamp_Account",
    Logistics: "Timestamp_Logistics",
  },
};

const monthNamesTH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const VIEW = [
  { key: "department", label: "🏢 รายแผนก" },
  { key: "product", label: "📦 รายสินค้า" },
  { key: "month", label: "🗓️ รายเดือน" },
  { key: "backlog", label: "🚧 งานค้างละเอียด" },
];

// helpers
const toDateSafe = (v) => (v && v.toDate ? v.toDate() : null);
const msToDays = (ms) => ms / (1000 * 60 * 60 * 24);

function SmallTable({ columns, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th
              key={i}
              style={{
                textAlign: "left",
                padding: "8px 6px",
                background: "#f7f7f7",
                borderBottom: "1px solid #ddd",
              }}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} style={{ padding: 10, opacity: 0.6 }}>
              ไม่มีข้อมูลในช่วงที่เลือก
            </td>
          </tr>
        )}

        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td
                key={j}
                style={{
                  padding: "6px 6px",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Reports() {
  const now = useMemo(() => new Date(), []);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("department");
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(null); // null = ทั้งปี
  const [onlyPending, setOnlyPending] = useState(false);

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  // =========================
  // ✅ Fetch by year/month using Sales timestamp
  // =========================
  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const start = new Date(year, month ?? 0, 1, 0, 0, 0);
      const end =
        month === null
          ? new Date(year + 1, 0, 1, 0, 0, 0)
          : new Date(year, month + 1, 1, 0, 0, 0);

      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);

      try {
        const qy = query(
          collection(db, F.collection),
          where(F.createdAt, ">=", startTs),
          where(F.createdAt, "<", endTs)
        );

        const snap = await getDocs(qy);
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setJobs(arr);
      } catch (err) {
        console.error("Reports fetch error:", err);
        setJobs([]);
      }

      setLoading(false);
    };

    run();
  }, [year, month]);

  // =========================
  // ✅ Normalize
  // =========================
  const normalized = useMemo(() => {
    const getTs = (j, step) => toDateSafe(j?.[F.ts[step]]);
    const getAuditTs = (j, step) => {
  const logs = Array.isArray(j?.audit_logs) ? j.audit_logs : [];

  const dates = logs
    .filter(l => l?.step === step && typeof l?.timestamp === "string")
    .map(l => new Date(l.timestamp))
    .filter(d => !isNaN(d.getTime()));

  if (!dates.length) return null;

  dates.sort((a, b) => b - a); // เอาอันล่าสุด
  return dates[0];
};


    return jobs
      .map((j) => {
        const sales = getTs(j, "Sales");
        const wh = getTs(j, "Warehouse");
        const pd = getTs(j, "Production");
        const qc = getTs(j, "QC");
        const ac = getTs(j, "Account");
        const lg = getTs(j, "Logistics");

        const currentStep = j?.[F.currentStep] || "Sales";

        // lead time วัดจาก Sales → Account (ถ้ายังไม่ถึง Account ใช้ now)
        const leadStart = sales || now;
        const leadEnd = ac || now;
        const leadDays = sales ? msToDays(leadEnd - leadStart) : 0;

        // aging ของงานที่ค้างอยู่ ณ step ปัจจุบัน
        const currentTs = getTs(j, currentStep) || getAuditTs(j, currentStep);
        const agingDays = currentTs ? msToDays(now - currentTs) : 0;

        // นิยามว่าจบงานเมื่อมี Logistics timestamp
        const isCompleted = Boolean(lg);

        return {
          id: j.id,
          product: j?.[F.product] || "-",
          customer: j?.[F.customer] || "-",
          volume: j?.[F.volume] ?? "",
          currentStep,
          leadDays,
          agingDays,
          isCompleted,
          ts: { sales, wh, pd, qc, ac, lg },
        };
      })
      .filter((x) => (onlyPending ? !x.isCompleted : true));
  }, [jobs, onlyPending, now]);

  // =========================
  // ✅ Department aggregation (งานค้าง ณ step ปัจจุบัน)
  // =========================
  const deptAgg = useMemo(() => {
    const depts = ["Sales", "Warehouse", "Production", "QC", "Account", "Logistics"];
    const map = {};
    depts.forEach((d) => (map[d] = []));

    normalized.forEach((j) => {
      if (map[j.currentStep]) map[j.currentStep].push(j);
    });

    return depts.map((d) => {
      const rows = map[d] || [];
      const ages = rows.map((r) => r.agingDays);
      const avgAging = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
      const maxAging = ages.length ? Math.max(...ages) : 0;

      return {
        dept: d,
        pendingCount: rows.length,
        avgAging,
        maxAging,
      };
    });
  }, [normalized]);

  // =========================
  // ✅ Product aggregation
  // =========================
  const productAgg = useMemo(() => {
    const map = new Map();

    normalized.forEach((j) => {
      const key = j.product;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(j);
    });

    const out = [];
    map.forEach((rows, product) => {
      const leads = rows.map((r) => r.leadDays);
      const avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0;
      const maxLead = leads.length ? Math.max(...leads) : 0;
      const pendingCount = rows.filter((r) => !r.isCompleted).length;

      out.push({
        product,
        count: rows.length,
        avgLead,
        maxLead,
        pendingCount,
      });
    });

    out.sort((a, b) => b.avgLead - a.avgLead);
    return out;
  }, [normalized]);

  // =========================
  // ✅ Month aggregation
  // =========================
  const monthAgg = useMemo(() => {
    const map = new Map();

    normalized.forEach((j) => {
      const d = j.ts.sales || now;
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(j);
    });

    const out = [];
    map.forEach((rows, key) => {
      const [yStr, mStr] = key.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);

      const leads = rows.map((r) => r.leadDays);
      const avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0;
      const pendingCount = rows.filter((r) => !r.isCompleted).length;

      out.push({ year: y, month: m, count: rows.length, avgLead, pendingCount });
    });

    out.sort((a, b) => (a.year - b.year) || (a.month - b.month));
    return out;
  }, [normalized, now]);

  // =========================
  // ✅ UI
  // =========================
  return (
    <div className="reports-container">
      <h2>📈 Report Center</h2>

      <div className="reports-subtitle">
        หน้านี้อ่านข้อมูลจาก Firebase เพื่อสรุปงานค้าง/ความเร็วในแต่ละมุมมอง
        โดยไม่กระทบระบบเดิมของแต่ละแผนก
      </div>

      {/* Controls */}
      <div className="reports-controls">
        <div>
          <label>มุมมอง: </label>
          <select value={view} onChange={(e) => setView(e.target.value)}>
            {VIEW.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>ปี: </label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label>เดือน: </label>
          <select
            value={month === null ? "" : month}
            onChange={(e) =>
              setMonth(e.target.value === "" ? null : parseInt(e.target.value, 10))
            }
          >
            <option value="">ทั้งปี</option>
            {monthNamesTH.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
          />
          เฉพาะงานค้าง
        </label>
      </div>

      {/* Content */}
      <div className="reports-table-wrap">
        {loading && <div>กำลังโหลดข้อมูลรายงาน...</div>}

        {!loading && (
          <>
            {/* Department */}
            {view === "department" && (
              <>
                <h3 style={{ margin: "18px 0 10px" }}>🏢 รายแผนก (งานค้าง ณ ตอนนี้)</h3>
                <SmallTable
                  columns={["แผนก", "งานค้าง", "ค้างเฉลี่ย(วัน)", "ค้างนานสุด(วัน)"]}
                  rows={deptAgg.map((d) => [
                    d.dept,
                    d.pendingCount,
                    d.avgAging.toFixed(1),
                    d.maxAging.toFixed(1),
                  ])}
                />
              </>
            )}

            {/* Product */}
            {view === "product" && (
              <>
                <h3 style={{ margin: "18px 0 10px" }}>📦 รายสินค้า</h3>
                <SmallTable
                  columns={["สินค้า", "จำนวนงาน", "Lead เฉลี่ย(วัน)", "Lead นานสุด(วัน)", "งานค้าง"]}
                  rows={productAgg.map((p) => [
                    p.product,
                    p.count,
                    p.avgLead.toFixed(1),
                    p.maxLead.toFixed(1),
                    p.pendingCount,
                  ])}
                />
              </>
            )}

            {/* Month */}
            {view === "month" && (
              <>
                <h3 style={{ margin: "18px 0 10px" }}>🗓️ รายเดือน</h3>
                <SmallTable
                  columns={["เดือน", "จำนวนงาน", "Lead เฉลี่ย(วัน)", "งานค้าง"]}
                  rows={monthAgg.map((m) => [
                    `${m.year} ${monthNamesTH[m.month]}`,
                    m.count,
                    m.avgLead.toFixed(1),
                    m.pendingCount,
                  ])}
                />
              </>
            )}

            {/* Backlog */}
            {view === "backlog" && (
              <>
                <h3 style={{ margin: "18px 0 10px" }}>
                  🚧 งานค้างละเอียด (เรียงจากค้างนานสุด)
                </h3>
                <SmallTable
                  columns={["สินค้า", "ลูกค้า", "Step ปัจจุบัน", "Lead Time (วัน)", "ค้างมาแล้ว(วัน)"]}
                  rows={[...normalized]
                    .filter((j) => !j.isCompleted)
                    .sort((a, b) => b.agingDays - a.agingDays)
                    .slice(0, 200)
                    .map((j) => [
                      j.product,
                      j.customer,
                      j.currentStep,
                      j.leadDays.toFixed(1),
                      j.agingDays.toFixed(1),
                    ])}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  * แสดงสูงสุด 200 รายการเพื่อความลื่นไหล
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
