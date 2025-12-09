import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * =========================
 * ✅ CONFIG: แก้ชื่อ field ให้ตรงฐานข้อมูลจริงของคุณที่จุดนี้จุดเดียว
 * =========================
 */
const F = {
  collection: "production_workflow",

  product: "product_name",
  customer: "customer",
  volume: "volume",
  currentStep: "currentStep",

  // ใช้ Sales timestamp เป็นจุดเริ่มงาน/ตัวกรองตามเดือน
  createdAt: "Timestamp_Sales",

  ts: {
    Sales: "Timestamp_Sales",
    Warehouse: "Timestamp_Warehouse",
    Production: "Timestamp_Production",
    QC: "Timestamp_QC",
    Account: "Timestamp_Account",
    Logistics: "Timestamp_Logistics",
  },

  // ถ้าคุณมี field สถานะงานสำเร็จจริง ให้ใส่ตรงนี้
  // completedFlag: "isCompleted",
};

const STEPS = ["Sales", "Warehouse", "Production", "QC", "Account", "Logistics"];

const monthNamesTH = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
];

const viewOptions = [
  { key: "product", label: "📦 รายสินค้า" },
  { key: "department", label: "🏢 รายแผนก" },
  { key: "month", label: "🗓️ รายเดือน" },
  { key: "quarter", label: "📆 ราย 3 เดือน" },
  { key: "fastslow", label: "⚡ งานเร็ว/ช้า" },
  { key: "backlog", label: "🚧 งานค้างละเอียด" },
];

// helpers
const toDateSafe = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return null;
};
const msToDays = (ms) => ms / (1000 * 60 * 60 * 24);

function SectionTitle({ text }) {
  return <h2 style={{ fontSize: 20, margin: "18px 0 10px" }}>{text}</h2>;
}

function SimpleCards({ items }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
        marginBottom: 14,
      }}
    >
      {items.map((it, idx) => (
        <div
          key={idx}
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 14,
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{it.title}</div>
          {it.lines.map((l, i) => (
            <div key={i} style={{ fontSize: 14 }}>
              {l}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SmallTable({ columns, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr>
          {columns.map((c, idx) => (
            <th
              key={idx}
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

function JobTable({ rows }) {
  return (
    <SmallTable
      columns={["สินค้า", "ลูกค้า", "Step ปัจจุบัน", "Lead Time (วัน)", "ค้าง ณ ตอนนี้ (วัน)"]}
      rows={rows.map((j) => [
        j.product,
        j.customer,
        j.currentStep,
        j.leadDays.toFixed(1),
        j.agingDays.toFixed(1),
      ])}
    />
  );
}

export default function Reports() {
  const now = useMemo(() => new Date(), []);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("department");
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(null); // 0-11 หรือ null = ทั้งปี
  const [onlyPending, setOnlyPending] = useState(false);

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  /**
   * ================
   * ✅ FETCH ข้อมูลจาก Firestore ตามปี/เดือน
   * ใช้ Timestamp_Sales เป็นฐาน filter
   * ================
   */
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
        // ถ้าเอกสารเก่าบางตัวไม่มี Timestamp_Sales
        // query นี้จะไม่ดึงเอกสารพวกนั้นมา
        const qy = query(
          collection(db, F.collection),
          where(F.createdAt, ">=", startTs),
          where(F.createdAt, "<", endTs)
        );

        const snap = await getDocs(qy);
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setJobs(arr);
      } catch (e) {
        console.error("Reports fetch error:", e);
        setJobs([]);
      }

      setLoading(false);
    };

    run();
  }, [year, month]);

  /**
   * ================
   * ✅ Normalize ให้พร้อมคำนวณ
   * ================
   */
  const normalized = useMemo(() => {
    return jobs
      .map((j) => {
        const getTs = (step) => toDateSafe(j?.[F.ts[step]]);

        const sales = getTs("Sales");
        const wh = getTs("Warehouse");
        const pd = getTs("Production");
        const qc = getTs("QC");
        const ac = getTs("Account");
        const lg = getTs("Logistics");

        const currentStep = j?.[F.currentStep] || "Sales";

        // lead time ทั้งงาน (ถ้ายังไม่ถึง Account ให้เทียบ now)
        const leadStart = sales || now;
        const leadEnd = ac || now;
        const leadDays = leadStart ? msToDays(leadEnd - leadStart) : 0;

        // duration ต่อแผนก (วัดเฉพาะตอนมี step ต่อไปแล้ว)
        const stepDuration = {
          Sales: sales && wh ? msToDays(wh - sales) : null,
          Warehouse: wh && pd ? msToDays(pd - wh) : null,
          Production: pd && qc ? msToDays(qc - pd) : null,
          QC: qc && ac ? msToDays(ac - qc) : null,
          Account: ac && lg ? msToDays(lg - ac) : null,
        };

        // aging ของงานที่ค้างอยู่ ณ step ปัจจุบัน
        const currentTs = getTs(currentStep);
        const agingDays = currentTs ? msToDays(now - currentTs) : 0;

        // นิยามงานจบ (แบบไม่ไปยุ่งระบบเดิม)
        // ถ้ามี Logistics timestamp ถือว่าจบแนว ๆ
        const isCompleted = Boolean(lg);

        return {
          raw: j,
          id: j.id,
          product: j?.[F.product] || "-",
          customer: j?.[F.customer] || "-",
          volume: j?.[F.volume] ?? "",
          currentStep,
          ts: { sales, wh, pd, qc, ac, lg },
          leadDays,
          stepDuration,
          agingDays,
          isCompleted,
        };
      })
      .filter((x) => (onlyPending ? !x.isCompleted : true));
  }, [jobs, onlyPending, now]);

  /**
   * ================
   * ✅ Aggregations
   * ================
   */

  // 1) รายแผนก (งานค้าง ณ ตอนนี้)
  const deptAgg = useMemo(() => {
    const map = {};
    ["Sales", "Warehouse", "Production", "QC", "Account"].forEach((d) => {
      map[d] = { dept: d, pendingCount: 0, avgAging: 0, maxAging: 0, rows: [] };
    });

    normalized.forEach((j) => {
      const d = j.currentStep;
      if (!map[d]) return;
      map[d].rows.push(j);
    });

    Object.values(map).forEach((v) => {
      v.pendingCount = v.rows.length;
      if (v.rows.length) {
        const ages = v.rows.map((r) => r.agingDays);
        v.avgAging = ages.reduce((a, b) => a + b, 0) / ages.length;
        v.maxAging = Math.max(...ages);
      }
    });

    return Object.values(map);
  }, [normalized]);

  // 2) รายสินค้า
  const productAgg = useMemo(() => {
    const map = new Map();

    normalized.forEach((j) => {
      const key = j.product;
      if (!map.has(key)) {
        map.set(key, {
          product: key,
          count: 0,
          avgLead: 0,
          maxLead: 0,
          pendingCount: 0,
          slowestDept: "-",
          rows: [],
        });
      }
      map.get(key).rows.push(j);
    });

    const out = [];
    map.forEach((v) => {
      v.count = v.rows.length;

      const leads = v.rows.map((r) => r.leadDays);
      v.avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0;
      v.maxLead = leads.length ? Math.max(...leads) : 0;

      v.pendingCount = v.rows.filter((r) => !r.isCompleted).length;

      // หาแผนกที่ช้าที่สุดของสินค้านี้
      const deptDur = { Sales: [], Warehouse: [], Production: [], QC: [], Account: [] };
      v.rows.forEach((r) => {
        Object.entries(r.stepDuration).forEach(([k, val]) => {
          if (val != null && deptDur[k]) deptDur[k].push(val);
        });
      });

      let slowDept = "-";
      let slowAvg = -1;
      Object.entries(deptDur).forEach(([k, arr]) => {
        if (!arr.length) return;
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        if (avg > slowAvg) {
          slowAvg = avg;
          slowDept = k;
        }
      });
      v.slowestDept = slowDept;

      out.push(v);
    });

    out.sort((a, b) => b.avgLead - a.avgLead);
    return out;
  }, [normalized]);

  // 3) รายเดือน
  const monthAgg = useMemo(() => {
    const map = new Map();

    normalized.forEach((j) => {
      const d = j.ts.sales || now;
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;

      if (!map.has(key)) {
        map.set(key, { key, year: y, month: m, count: 0, avgLead: 0, pendingCount: 0, rows: [] });
      }
      map.get(key).rows.push(j);
    });

    const out = [];
    map.forEach((v) => {
      v.count = v.rows.length;
      const leads = v.rows.map((r) => r.leadDays);
      v.avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0;
      v.pendingCount = v.rows.filter((r) => !r.isCompleted).length;
      out.push(v);
    });

    out.sort((a, b) => (a.year - b.year) || (a.month - b.month));
    return out;
  }, [normalized, now]);

  // 4) ราย 3 เดือน (จับกลุ่มจาก monthAgg)
  const quarterAgg = useMemo(() => {
    const out = [];
    const arr = monthAgg;

    for (let i = 0; i < arr.length; i += 3) {
      const slice = arr.slice(i, i + 3);
      if (!slice.length) continue;

      const label = `${slice[0].year} ${monthNamesTH[slice[0].month]} - ${monthNamesTH[slice[slice.length - 1].month]}`;
      const rows = slice.flatMap((s) => s.rows);

      const leads = rows.map((r) => r.leadDays);
      const avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0;
      const pendingCount = rows.filter((r) => !r.isCompleted).length;

      out.push({ label, count: rows.length, avgLead, pendingCount });
    }

    return out;
  }, [monthAgg]);

  // 5) งานเร็ว/ช้า
  const fastSlow = useMemo(() => {
    const sorted = [...normalized].sort((a, b) => a.leadDays - b.leadDays);
    return {
      fastest: sorted.slice(0, 10),
      slowest: sorted.slice(-10).reverse(),
    };
  }, [normalized]);

  /**
   * ================
   * ✅ Render
   * ================
   */
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>📈 Report Center</h1>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 14 }}>
        รายงานนี้อ่านข้อมูลจาก Firebase โดยไม่กระทบระบบเดิมของแต่ละแผนก
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <label>มุมมอง: </label>
          <select value={view} onChange={(e) => setView(e.target.value)}>
            {viewOptions.map((v) => (
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

      {loading && <div>กำลังโหลดข้อมูลรายงาน...</div>}

      {!loadi
