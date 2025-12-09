const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json"); // มันจะไปอ่านไฟล์กุญแจที่เราวางไว้

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  console.log("🚀 กำลังเริ่มดันข้อมูลเก่า (Backfill)...");
  
  // ชื่อ Collection ต้องตรงกับที่ตั้งไว้
  const snapshot = await db.collection("production_workflow").get();
  
  if (snapshot.empty) {
    console.log("❌ ไม่พบข้อมูลใน Collection นี้");
    return;
  }

  console.log(`📦 เจอข้อมูลทั้งหมด ${snapshot.size} รายการ กำลังทยอยส่ง...`);

  let count = 0;
  const batchSize = 500;
  
  // วนลูปทำทีละ 500 รายการ
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);
    
    chunk.forEach(doc => {
      // เทคนิค: แกล้ง update field ชื่อ '_bq_sync' เพื่อกระตุ้นให้ Extension ทำงาน
      batch.update(doc.ref, { _bq_sync: new Date().getTime() });
    });

    await batch.commit();
    count += chunk.length;
    console.log(`✅ ส่งไปแล้ว ${count} / ${snapshot.size}`);
  }

  console.log("🎉 เสร็จสิ้น! รอประมาณ 10-15 นาที ข้อมูลจะไปโผล่ใน Looker Studio ครับ");
}

run();
