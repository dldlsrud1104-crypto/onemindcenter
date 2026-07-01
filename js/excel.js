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
  const fileInput = type === "nextDay"
    ? document.getElementById("dailyExcelFile")
    : document.getElementById("weeklyExcelFile");

  const workDate = type === "nextDay"
    ? document.getElementById("dailyExcelWorkDate").value
    : document.getElementById("weeklyExcelWorkDate").value;

  const file = fileInput.files[0];

  if (!file || !workDate) {
    alert("날짜와 엑셀 파일을 선택해주세요.");
    return;
  }
  const existsQuery = query(
  collection(db, "settlements"),
  where("workDate", "==", workDate),
  where("settlementType", "==", type)
);

const existsSnap = await getDocs(existsQuery);

if (!existsSnap.empty) {
  const ok = confirm(
    `${workDate} ${type === "nextDay" ? "익일정산" : "주정산"}이 이미 등록되어 있습니다.\n\n기존 정산은 유지하고, 중복된 기사만 건너뛰며 업로드할까요?`
  );

  if (!ok) return;
}

  excelMsg.innerText = type === "nextDay"
    ? "익일 엑셀 업로드 중..."
    : "주정산 엑셀 업로드 중...";

  try {
    const rows = await readDailyExcel(file);
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

      let industrialPay = 0;
      let employmentPay = 0;
      const taxPay = Math.round(coupangPay * TAX_RATE);

      if (type === "nextDay") {
        industrialPay = Math.round(coupangPay * INDUSTRIAL_RATE);
        employmentPay = Math.round(coupangPay * EMPLOYMENT_RATE);
      }

      if (type === "weekly") {
        industrialPay = Number(cleanNumber(row.industrialPay));
        employmentPay = Number(cleanNumber(row.employmentPay));
      }

      const deductPay = 0;
      const missionPay = 0;
      const promotionPay = 0;

      let totalPay = 0;

      if (type === "nextDay") {
        totalPay =
          coupangPay
          - deductPay
          - industrialPay
          - employmentPay
          - taxPay
          + missionPay
          + promotionPay;
      } else {
        totalPay =
          coupangPay
          - deductPay
          - taxPay
          + missionPay
          + promotionPay;
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
        industrialPay,
        employmentPay,
        taxPay,
        missionPay,
        promotionPay,
        totalPay,

        status: "pending",
        createdAt: serverTimestamp()
      });

      success++;
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

function readDailyExcel(file) {
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
            coupangPay: row[35] || "",
            industrialPay: row[0] || "",
            employmentPay: row[0] || ""
          }))
          .filter((row) => row.name && row.coupangPay);

        console.log("정리된 엑셀 데이터:", rows);

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