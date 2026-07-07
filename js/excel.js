import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const INDUSTRIAL_RATE = 0.008;
const EMPLOYMENT_RATE = 0.0088;
const TAX_RATE = 0.033;

const excelMsg = document.getElementById("excelMsg");
const dailyExcelBtn = document.getElementById("dailyExcelBtn");
const weeklyExcelBtn = document.getElementById("weeklyExcelBtn");

if (dailyExcelBtn) {
  dailyExcelBtn.onclick = () => handleExcelUpload("nextDay");
}

if (weeklyExcelBtn) {
  weeklyExcelBtn.onclick = () => handleExcelUpload("weekly");
}

async function handleExcelUpload(type) {
  const fileInput =
    type === "nextDay"
      ? document.getElementById("dailyExcelFile")
      : document.getElementById("weeklyExcelFile");

  const workDate =
    type === "nextDay"
      ? document.getElementById("dailyExcelWorkDate").value
      : document.getElementById("weeklyExcelWorkDate").value;

  const file = fileInput.files[0];

  if (!file || !workDate) {
    alert("날짜와 엑셀 파일을 선택해주세요.");
    return;
  }

  excelMsg.innerText =
    type === "nextDay"
      ? "익일 엑셀 업로드 중..."
      : "주정산 엑셀 업로드 중...";

  try {
    const rows = await readExcel(file);
    const riders = await getRiders();

    let success = 0;
    let fail = 0;
    const failList = [];

    for (const row of rows) {
      const name = row.name;
      const deliveryCount = Number(cleanNumber(row.deliveryCount));
      const coupangPay = Number(cleanNumber(row.coupangPay));

      if (!name || !coupangPay) {
        fail++;
        failList.push(name || "이름/금액 없음");
        continue;
      }

      const rider = findRider(riders, name);

      if (!rider) {
        fail++;
        failList.push(`${name} (기사 없음)`);
        continue;
      }

      const exists = await isDuplicate(rider.uid, workDate, type);

      if (exists) {
        fail++;
        failList.push(`${name} (이미 등록됨)`);
        continue;
      }

      const deductPay = 0;
      const feePay = 0;
      const transferFee = 300;
      const missionPay = 0;
      const promotionPay = 0;

      let industrialPay = 0;
      let employmentPay = 0;

      if (type === "nextDay") {
        industrialPay = Math.round(coupangPay * INDUSTRIAL_RATE);
        employmentPay = Math.round(coupangPay * EMPLOYMENT_RATE);
      }

      if (type === "weekly") {
        industrialPay = Number(cleanNumber(row.industrialPay));
        employmentPay = Number(cleanNumber(row.employmentPay));
      }

  
let taxPay = 0;

if (type === "nextDay") {

  taxPay = Math.round(coupangPay * TAX_RATE);

} else {

  taxPay = Math.round(
    (
      coupangPay
      - Math.abs(industrialPay)
      - Math.abs(employmentPay)
      + missionPay
      + promotionPay
    ) * TAX_RATE
  );

}
let totalPay = 0;

if (type === "nextDay") {
  totalPay =
    coupangPay
    - deductPay
    - feePay
    - Math.abs(industrialPay)
    - Math.abs(employmentPay)
    + missionPay
    + promotionPay
    - transferFee
    - taxPay;
} else {
  totalPay =
    coupangPay
    - feePay
    - Math.abs(industrialPay)
    - Math.abs(employmentPay)
    + missionPay
    + promotionPay
    - transferFee
    - taxPay;
}
      const payDate = getNextDate(workDate);

      await addDoc(collection(db, "settlements"), {
        uid: rider.uid,
        name: rider.name,
        excelName: name,

        workDate,
        payDate,

        settlementType: type,
        deliveryCount,

        coupangPay,
        deductPay,
        feePay,
        industrialPay,
        employmentPay,
        taxPay,
        missionPay,
        promotionPay,
        transferFee,
        totalPay,

        wrongDeliveryCount: 0,
        wrongDeliveryPay: 0,
        wrongDeliveryMemo: "",

        status: "pending",
        createdAt: serverTimestamp()
      });

      success++;
    }

if (success > 0) {
  await addDoc(collection(db, "uploadHistory"), {
    workDate,
    settlementType: type,
    uploadCount: success,
    failCount: fail,
    uploadedAt: serverTimestamp()
  });
}

    excelMsg.innerHTML = `
      업로드 완료<br>
      성공: ${success}건 / 실패: ${fail}건
      ${
        failList.length
          ? `<br><br>실패 목록:<br>${failList.join("<br>")}`
          : ""
      }
    `;
  } catch (error) {
    console.error(error);
    excelMsg.innerText = "엑셀 업로드 오류: " + error.message;
  }
}

function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const raw = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false
        });

        const headerIndex = raw.findIndex((row) =>
          row.some((cell) => normalize(cell).includes("성함"))
        );

        if (headerIndex === -1) {
          throw new Error("성함 컬럼을 찾지 못했습니다.");
        }

        const dataRows = raw.slice(headerIndex + 2);

        const rows = dataRows
          .map((row) => ({
            name: row[2] || "",
            deliveryCount: row[5] || "",

            // 주정산 기준
            // AE = 산재, AG = 고용, AK = 쿠팡 지급액
            industrialPay: row[30] || "",
            employmentPay: row[32] || "",
            coupangPay: row[28] || ""
          }))
          .filter((row) => row.name && row.coupangPay);

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

async function getRiders() {
  const snap = await getDocs(collection(db, "users"));
  const riders = [];

  snap.forEach((docSnap) => {
    riders.push({
      uid: docSnap.id,
      ...docSnap.data()
    });
  });

  return riders;
}

async function isDuplicate(uid, workDate, type) {
  const q = query(
    collection(db, "settlements"),
    where("uid", "==", uid),
    where("workDate", "==", workDate),
    where("settlementType", "==", type)
  );

  const snap = await getDocs(q);
  return !snap.empty;
}

function findRider(riders, excelName) {
  const target = normalize(excelName);

  return riders.find((rider) => {
    const name = normalize(rider.name || "");
    const phone = normalize(rider.phone || "");
    const last4 = phone.slice(-4);
    const compare = name + last4;

    return (
      target === compare ||
      target.includes(compare) ||
      target.includes(name)
    );
  });
}

function getNextDate(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function cleanNumber(value) {
  return String(value || "")
    .replace(/,/g, "")
    .replace(/원/g, "")
    .replace(/\s/g, "")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .replace(/원/g, "")
    .trim();
}