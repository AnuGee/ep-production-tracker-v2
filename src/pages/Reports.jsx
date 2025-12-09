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

  auditLogs: "audit_logs",
};

const monthNamesTH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// เปลี่ยนแนวคิดจาก "เลือกอย่างใดอย่างหนึ่ง"
// เป็น "สรุปตามอะไร" + กรองได้หลายตัวแปร
const VIEW = [
  { key: "department", label: "🏢 สรุปตามแผนก" },
  { key: "product", label: "📦 สรุปตามสินค้า" },
  { key: "wpq_product", label: "🚦 สินค้า × (WH/PD/QC)" },
  { key: "month", label: "🗓️ สรุปตามเดือน" },
  { key: "backlog", label: "🚧 งานค้างละเอียด" },
];

const STEPS = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"];

// helpers
const toDateSafe = (v) => (v && typeof v.toDate === "function" ? v.toDate() : null);
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

  // ✅ "สรุปตาม"
  const [view, setView] = useState("department");

  // ✅ ตัวกรองช่วงเวลา
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(null); // null = ทั้งปี

  // ✅ ตัวกรองข้อมูล
  const [onlyPending, setOnlyPending] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(""); // "" = ทั้งหมด
  const [selectedSteps, setSelectedSteps] = useState([]); // [] = ทั้งหมด

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const toggleSelection = (arr, value, setter) => {
    if (arr.includes(value)) setter(arr.filter((x) => x !== value));
    else setter([...arr, value]);
  };

  const clearFilters = () => {
    setSelectedProduct("");
    setSelectedSteps([]);
    setOnlyPending(false);
  };

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
  // ✅ Normalize + Fallback audit_logs
  // =========================
  const normalized = useMemo(() => {
    const getAuditStepTs = (j, step) => {
      const logs = Array.isArray(j?.[F.auditLogs]) ? j[F.auditLogs] : [];
      const matches = logs.filter((l) => l?.step === step);
      if (!matches.length) return null;

      const last = matches[matches.length - 1];
      const t = last?.timestamp;

      if (t && typeof t.toDate === "function") return t.toDate();
      if (typeof t === "string") {
        const d = new Date(t);
        return isNaN(d) ? null : d;
      }
      return null;
    };

    const getStepTs = (j, step) =>
      toDateSafe(j?.[F.ts[step]]) || getAuditStepTs(j, step);

    return jobs.map((j) => {
      const sales = getStepTs(j, "Sales");
      const wh = getStepTs(j, "Warehouse");
      const pd = getStepTs(j, "Production");
      const qc = getStepTs(j, "QC");
      const ac = getStepTs(j, "Account");
      const lg = getStepTs(j, "Logistics");

      const currentStep = j?.[F.currentStep] || "Sales";

      // lead time วัดจาก Sales → Account (ถ้ายังไม่ถึง Account ใช้ now)
      const leadStart = sales || now;
      const leadEnd = ac || now;
      const leadDays = sales ? msToDays(leadEnd - leadStart) : 0;

      // aging ของงานที่ค้างอยู่ ณ step ปัจจุบัน
      const currentTs = getStepTs(j, currentStep);
      const agingDays = currentTs ? msToDays(now - currentTs) : 0;

      // นิยามว่าจบงานเมื่อมี Logistics timestamp หรือ currentStep = Completed
      const isCompleted = Boolean(lg) || currentStep === "Completed";

      return {
        id: j.id,
        raw: j,

        product: j?.[F.product] || "-",
        customer: j?.[F.customer] || "-",
        volume: j?.[F.volume] || "",

        currentStep,

        ts: { sales, wh, pd, qc, ac, lg },

        leadDays,
        agingDays,
        isCompleted,
      };
    });
  }, [jobs, now]);

  // =========================
  // ✅ Options: สินค้า
  // =========================
  const productOptions = useMemo(() => {
    const set = new Set();
    normalized.forEach((j) => {
      if (j.product && j.product !== "-") set.add(j.product);
    });
    return Array.from(set).sort();
  }, [normalized]);

  // =========================
  // ✅ Base filtered (ตามตัวกรอง)
  // =========================
  const working = useMemo(() => {
    let arr = [...normalized];

    if (selectedProduct) {
      arr = arr.filter((j) => j.product === selectedProduct);
    }

    if (selectedSteps.length) {
      arr = arr.filter((j) => selectedSteps.includes(j.currentStep));
    }

    if (onlyPending) {
      arr = arr.filter((j) => !j.isCompleted);
    }

    return arr;
  }, [normalized, selectedProduct, selectedSteps, onlyPending]);

  // ใช้สำหรับ view คอขวด 3 แผนก (ไม่บังคับให้ติ๊ก step filter)
  const baseForWPQ = useMemo(() => {
    let arr = [...normalized];

    if (selectedProduct) {
      arr = arr.filter((j) => j.product === selectedProduct);
    }

    if (onlyPending) {
      arr = arr.filter((j) => !j.isCompleted);
    }

    return arr;
  }, [normalized, selectedProduct, onlyPending]);

  // =========================
  // ✅ Department aggregation (งานค้าง ณ ตอนนี้)
  // =========================
  const deptAgg = useMemo(() => {
    const map = new Map();
    working.forEach((j) => {
      const dept = j.currentStep || "Sales";
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept).push(j);
    });

    const out = [];
    map.forEach((rows, dept) => {
      const aging = rows.map((r) => r.agingDays);
      const avgAging = aging.length ? aging.reduce((a, b) => a + b, 0) / aging.length : 0;
      const maxAging = aging.length ? Math.max(...aging) : 0;
      const pendingCount = rows.filter((r) => !r.isCompleted).length;

      out.push({ dept, pendingCount, avgAging, maxAging });
    });

    out.sort((a, b) => b.pendingCount - a.pendingCount);
    return out;
  }, [working]);

  // =========================
  // ✅ Product aggregation
  // =========================
  const productAgg = useMemo(() => {
    const map = new Map();
    working.forEach((j) => {
      if (!map.has(j.product)) map.set(j.product, []);
      map.get(j.product).push(j);
    });

    const out = [];
    map.forEach((rows, product) => {
      const leads = rows.map((r) => r.leadDays);
      const avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0;
      const maxLead = leads.length ? Math.max(...leads) : 0;
      const pendingCount = rows.filter((r) => !r.isCompleted).length;

      out.push({ product, count: rows.length, avgLead, maxLead, pendingCount });
    });

    out.sort((a, b) => b.pendingCount - a.pendingCount);
    return out;
  }, [working]);

  // =========================
  // ✅ WH/PD/QC bottleneck by product
  // =========================
  const wpqByProduct = useMemo(() => {
    const interested = ["Warehouse", "Production", "QC"];
    const map = new Map();

    baseForWPQ.forEach((j) => {
      if (!map.has(j.product)) map.set(j.product, []);
      map.get(j.product).push(j);
    });

    const out = [];
    map.forEach((rows, product) => {
      const rowForStep = (step) => rows.filter((r) => r.currentStep === step);

      const makeStats = (step) => {
        const sRows = rowForStep(step);
        const aging = sRows.map((r) => r.agingDays);
        const avg = aging.length ? aging.reduce((a, b) => a + b, 0) / aging.length : 0;
        const max = aging.length ? Math.max(...aging) : 0;
        return { count: sRows.length, avg, max };
      };

      const wh = makeStats("Warehouse");
      const pd = makeStats("Production");
      const qc = makeStats("QC");

      const totalPendingIn3 = wh.count + pd.count + qc.count;

      // แสดงเฉพาะสินค้าที่มีงานค้างใน 3 แผนกนี้ เพื่ออ่านง่าย
      if (totalPendingIn3 > 0) {
        out.push({
          product,
          wh, pd, qc,
          totalPendingIn3,
        });
      }
    });

    out.sort((a, b) => b.totalPendingIn3 - a.totalPendingIn3);
    return out;
  }, [baseForWPQ]);

  // =========================
  // ✅ Month aggregation
  // =========================
  const monthAgg = useMemo(() => {
    const map = new Map();

    working.forEach((j) => {
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
  }, [working, now]);

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
          <label>สรุปตาม: </label>
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

        <div>
          <label>สินค้า: </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {productOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
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

        <button
          type="button"
          onClick={clearFilters}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ล้างตัวกรอง
        </button>
      </div>

      {/* Step filter row (multi) */}
      <div className="reports-controls" style={{ marginTop: -6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>กรองงานที่ค้างอยู่ในแผนก:</span>
          {STEPS.map((s) => (
            <label key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedSteps.includes(s)}
                onChange={() => toggleSelection(selectedSteps, s, setSelectedSteps)}
              />
              {s}
            </label>
          ))}
          <span style={{ fontSize: 11, opacity: 0.5 }}>
            (ไม่ติ๊ก = ทั้งหมด)
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="reports-table-wrap">
        {loading && <div>กำลังโหลดข้อมูลรายงาน...</div>}

        {!loading && (
          <>
            {/* Department */}
            {view === "department" && (
              <>
                <h3 style={{ margin: "18px 0 10px" }}>
                  🏢 รายแผนก (งานค้าง ณ ตอนนี้)
                </h3>
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

            {/* WPQ by product */}
            {view === "wpq_product" && (
              <>
                <h3 style={{ margin: "18px 0 10px" }}>
                  🚦 สินค้า × งานค้าง (Warehouse / Production / QC)
                </h3>
                <SmallTable
                  columns={[
                    "สินค้า",
                    "WH ค้าง(งาน)",
                    "WH เฉลี่ย(วัน)",
                    "WH นานสุด(วัน)",
                    "PD ค้าง(งาน)",
                    "PD เฉลี่ย(วัน)",
                    "PD นานสุด(วัน)",
                    "QC ค้าง(งาน)",
                    "QC เฉลี่ย(วัน)",
                    "QC นานสุด(วัน)",
                  ]}
                  rows={wpqByProduct.map((x) => [
                    x.product,
                    x.wh.count,
                    x.wh.avg.toFixed(1),
                    x.wh.max.toFixed(1),
                    x.pd.count,
                    x.pd.avg.toFixed(1),
                    x.pd.max.toFixed(1),
                    x.qc.count,
                    x.qc.avg.toFixed(1),
                    x.qc.max.toFixed(1),
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
                  rows={[...working]
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
