import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const riderList = document.getElementById("riderList");
const recentRiders = document.getElementById("recentRiders");
const dashboardRiderList = document.getElementById("dashboardRiderList");

const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");
const totalCount = document.getElementById("totalCount");
const nextDayCount = document.getElementById("nextDayCount");

const logoutBtn = document.getElementById("adminLogoutBtn");
const searchInput = document.getElementById("riderSearch");

const settlementList = document.getElementById("settlementList");
const settlementSummary = document.getElementById("settlementSummary");
const settlementFilterDate = document.getElementById("settlementFilterDate");
const settlementFilterType = document.getElementById("settlementFilterType");
const settlementSearch = document.getElementById("settlementSearch");
const riderEditModal = document.getElementById("riderEditModal");
const saveRiderEditBtn = document.getElementById("saveRiderEditBtn");
const closeRiderEditBtn = document.getElementById("closeRiderEditBtn");

let editingRiderUid = null;
let allRiders = [];
let allSettlements = [];

onAuthStateChanged(auth, (user) => {
  if (!user) location.href = "auth.html";
});

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await signOut(auth);
    location.href = "auth.html";
  };
}

document.querySelectorAll(".side-btn").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".side-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

/* 기사 불러오기 */
onSnapshot(collection(db, "users"), (snapshot) => {
  allRiders = [];

  let pending = 0;
  let approved = 0;
  let nextDay = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    allRiders.push({
      uid: docSnap.id,
      ...data
    });

    if (data.status === "pending") pending++;
    if (data.status === "approved") approved++;
    if (data.settlementType === "nextDay") nextDay++;
  });

  if (pendingCount) pendingCount.innerText = pending;
  if (approvedCount) approvedCount.innerText = approved;
  if (totalCount) totalCount.innerText = allRiders.length;
  if (nextDayCount) nextDayCount.innerText = nextDay;

  renderRecent(allRiders.slice(0, 5));
  renderDashboardRiders(allRiders);
  renderRiders(allRiders);
});

function renderRecent(riders) {
  if (!recentRiders) return;

  recentRiders.innerHTML = "";

  if (riders.length === 0) {
    recentRiders.innerText = "가입자가 없습니다.";
    return;
  }

  riders.forEach((rider) => {
    const div = document.createElement("div");
    div.className = "admin-card";

    div.innerHTML = `
      <p><b>${rider.name || "-"}</b></p>
      <p>아이디: ${rider.id || "-"}</p>
      <p>상태: ${statusText(rider.status)}</p>
    `;

    recentRiders.appendChild(div);
  });
}

function renderDashboardRiders(riders) {
  if (!dashboardRiderList) return;

  dashboardRiderList.innerHTML = "";

  if (riders.length === 0) {
    dashboardRiderList.innerText = "등록된 기사가 없습니다.";
    return;
  }

  dashboardRiderList.innerHTML = `
    <table class="settlement-table">
      <thead>
        <tr>
          <th>이름</th>
          <th>연락처</th>
          <th>정산방식</th>
          <th>은행</th>
          <th>계좌번호</th>
          <th>예금주</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody id="dashboardRiderTableBody"></tbody>
    </table>
  `;

  const tbody = document.getElementById("dashboardRiderTableBody");

  riders.forEach((rider) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${rider.name || "-"}</td>
      <td>${rider.phone || "-"}</td>
      <td>${rider.settlementType === "nextDay" ? "익일정산" : "주정산"}</td>
      <td>${rider.bank || "-"}</td>
      <td>${rider.account || "-"}</td>
      <td>${rider.owner || "-"}</td>
      <td>${statusText(rider.status)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function renderRiders(riders) {
  if (!riderList) return;

  riderList.innerHTML = "";

  if (riders.length === 0) {
    riderList.innerText = "기사 정보가 없습니다.";
    return;
  }

  riders.forEach((rider) => {
    const card = document.createElement("div");
    card.className = "admin-card";

    card.innerHTML = `
      <p><b>이름:</b> ${rider.name || "-"}</p>
      <p><b>아이디:</b> ${rider.id || "-"}</p>
      <p><b>연락처:</b> ${rider.phone || "-"}</p>
      <p><b>정산방식:</b> ${rider.settlementType === "nextDay" ? "익일정산" : "주정산"}</p>
      <p><b>은행:</b> ${rider.bank || "-"}</p>
      <p><b>계좌:</b> ${rider.account || "-"}</p>
      <p><b>예금주:</b> ${rider.owner || "-"}</p>
      <p><b>상태:</b> ${statusText(rider.status)}</p>

    <div class="admin-actions">
  <button class="approve-btn">승인</button>
  <button class="reject-btn">거절</button>
  <button class="edit-rider-btn">정보수정</button>
  <button class="rider-delete-btn">삭제</button>
</div>
    `;

    card.querySelector(".approve-btn").onclick = async () => {
      await updateDoc(doc(db, "users", rider.uid), {
        status: "approved"
      });

      alert("승인 완료");
    };

    card.querySelector(".reject-btn").onclick = async () => {
      await updateDoc(doc(db, "users", rider.uid), {
        status: "rejected"
      });

      alert("거절 완료");
    };

    card.querySelector(".rider-delete-btn").onclick = async () => {
      const ok = confirm(`${rider.name} 기사님을 삭제할까요?\n삭제하면 기사 목록에서 사라집니다.`);

      if (!ok) return;

      await deleteDoc(doc(db, "users", rider.uid));

      alert("기사 삭제 완료");
    };

card.querySelector(".edit-rider-btn").onclick = () => {
  editingRiderUid = rider.uid;

  document.getElementById("editRiderName").value = rider.name || "";
  document.getElementById("editRiderPhone").value = rider.phone || "";
  document.getElementById("editRiderBank").value = rider.bank || "";
  document.getElementById("editRiderAccount").value = rider.account || "";
  document.getElementById("editRiderOwner").value = rider.owner || "";
  document.getElementById("editRiderSettlementType").value =
    rider.settlementType || "weekly";

  riderEditModal.style.display = "block";
};

    riderList.appendChild(card);
  });
}

if (searchInput) {
  searchInput.oninput = () => {
    const keyword = searchInput.value.trim();

    const filtered = allRiders.filter((rider) =>
      (rider.name || "").includes(keyword) ||
      (rider.id || "").includes(keyword) ||
      (rider.phone || "").includes(keyword)
    );

    renderRiders(filtered);
  };
}

function statusText(status) {
  if (status === "approved") return "승인완료";
  if (status === "pending") return "승인대기";
  if (status === "rejected") return "거절";
  return status || "확인필요";
}

/* 정산관리 */
if (settlementList) {
  onSnapshot(collection(db, "settlements"), (snapshot) => {
    allSettlements = [];

    snapshot.forEach((docSnap) => {
      allSettlements.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    renderSettlementList();
  });
}

if (settlementFilterDate) settlementFilterDate.onchange = renderSettlementList;
if (settlementFilterType) settlementFilterType.onchange = renderSettlementList;
if (settlementSearch) settlementSearch.oninput = renderSettlementList;

function renderSettlementList() {
  if (!settlementList) return;

  const date = settlementFilterDate?.value || "";
  const type = settlementFilterType?.value || "nextDay";
  const keyword = settlementSearch?.value.trim() || "";

  const list = allSettlements
    .filter((item) => {
      const matchDate = !date || item.workDate === date;
      const matchType = item.settlementType === type;
      const matchKeyword = !keyword || (item.name || "").includes(keyword);

      return matchDate && matchType && matchKeyword;
    })
    .sort((a, b) => (b.workDate || "").localeCompare(a.workDate || ""));

  const totalCount = list.length;
  const totalDelivery = list.reduce((sum, item) => sum + Number(item.deliveryCount || 0), 0);
  const totalPay = list.reduce((sum, item) => sum + Number(item.totalPay || 0), 0);
  const paidCount = list.filter((item) => item.status === "paid").length;
  const pendingPayCount = totalCount - paidCount;

  if (settlementSummary) {
    settlementSummary.innerHTML = `
      <b>${type === "nextDay" ? "익일정산" : "주정산"}</b><br>
      기사 ${totalCount}명 · 배송 ${totalDelivery.toLocaleString()}건 · 총 지급 ${totalPay.toLocaleString()}원<br>
      입금완료 ${paidCount}명 · 입금대기 ${pendingPayCount}명
    `;
  }

  if (list.length === 0) {
    settlementList.innerText = "해당 정산이 없습니다.";
    return;
  }

  settlementList.innerHTML = `
    <table class="settlement-table">
      <thead>
        <tr>
          <th>기사명</th>
          <th>운행일</th>
          <th>배송건수</th>
          <th>오배달</th>
          <th>오배달 차감</th>
          <th>지급액</th>
          <th>상태</th>
          <th>보기</th>
          <th>수정</th>
          <th>처리</th>
          <th>삭제</th>
        </tr>
      </thead>
      <tbody id="settlementTableBody"></tbody>
    </table>
  `;

  const tbody = document.getElementById("settlementTableBody");

  list.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.name || "-"}</td>
      <td>${item.workDate || "-"}</td>
      <td>${Number(item.deliveryCount || 0).toLocaleString()}건</td>
      <td>${Number(item.wrongDeliveryCount || 0).toLocaleString()}건</td>
      <td>-${Number(item.wrongDeliveryPay || 0).toLocaleString()}원</td>
      <td><b>${Number(item.totalPay || 0).toLocaleString()}원</b></td>

      <td class="${item.status === "paid" ? "paid" : "pending"}">
        ${item.status === "paid" ? "입금완료" : "입금대기"}
      </td>

      <td><button class="view-btn">보기</button></td>
      <td><button class="edit-btn">수정</button></td>

      <td>
        ${
          item.status === "paid"
            ? `<span style="color:#22c55e;font-weight:bold;">🟢 입금완료</span>`
            : `<button class="pay-btn">입금완료</button>`
        }
      </td>

      <td><button class="delete-btn">삭제</button></td>
    `;

    tr.querySelector(".view-btn").onclick = () => {
      alert(`원마인드 정산서

기사명: ${item.name}
운행일: ${item.workDate}
지급일: ${item.payDate}

배송건수: ${Number(item.deliveryCount || 0).toLocaleString()}건
쿠팡 지급액: ${Number(item.coupangPay || 0).toLocaleString()}원
공제/수수료: ${Number(item.deductPay || 0).toLocaleString()}원
산재: ${Number(item.industrialPay || 0).toLocaleString()}원
고용: ${Number(item.employmentPay || 0).toLocaleString()}원
원천세: ${Number(item.taxPay || 0).toLocaleString()}원
미션비: ${Number(item.missionPay || 0).toLocaleString()}원
프로모션: ${Number(item.promotionPay || 0).toLocaleString()}원

오배달 건수: ${Number(item.wrongDeliveryCount || 0).toLocaleString()}건
오배달 차감: -${Number(item.wrongDeliveryPay || 0).toLocaleString()}원
오배달 메모: ${item.wrongDeliveryMemo || "-"}

최종 지급액: ${Number(item.totalPay || 0).toLocaleString()}원`);
    };

    tr.querySelector(".edit-btn").onclick = async () => {
  const wrongDeliveryCount = Number(
    prompt("오배달 건수", item.wrongDeliveryCount || 0) || 0
  );

  const wrongDeliveryPay = Number(
    prompt("오배달 차감금액", item.wrongDeliveryPay || 0) || 0
  );

  const wrongDeliveryMemo =
    prompt("오배달 메모", item.wrongDeliveryMemo || "") || "";

  await updateDoc(doc(db, "settlements", item.id), {
    wrongDeliveryCount,
    wrongDeliveryPay,
    wrongDeliveryMemo
  });

  allSettlements = allSettlements.map((s) => {
    if (s.id === item.id) {
      return {
        ...s,
        wrongDeliveryCount,
        wrongDeliveryPay,
        wrongDeliveryMemo
      };
    }
    return s;
  });

  renderSettlementList();

  alert("오배달 정보 저장 완료");
};

    const payBtn = tr.querySelector(".pay-btn");

    if (payBtn) {
      payBtn.onclick = async () => {
        const ok = confirm(`${item.name} 기사님을 입금완료 처리할까요?`);

        if (!ok) return;

        await updateDoc(doc(db, "settlements", item.id), {
          status: "paid"
        });

        alert("입금완료 처리되었습니다.");
      };
    }

    tr.querySelector(".delete-btn").onclick = async () => {
      const ok = confirm(`${item.name}님의 정산을 삭제할까요?`);

      if (!ok) return;

      await deleteDoc(doc(db, "settlements", item.id));

      allSettlements = allSettlements.filter((s) => s.id !== item.id);
      renderSettlementList();

      alert("삭제되었습니다.");
    };

    tbody.appendChild(tr);
  });
}

const savePromoBtn = document.getElementById("savePromoBtn");
const promoTitle = document.getElementById("promoTitle");
const promoContent = document.getElementById("promoContent");
const promoAdminList = document.getElementById("promoAdminList");

if (savePromoBtn) {
  savePromoBtn.onclick = async () => {
    const title = promoTitle.value.trim();
    const content = promoContent.value.trim();

    if (!title || !content) {
      alert("프로모션 제목과 내용을 입력해주세요.");
      return;
    }

    await addDoc(collection(db, "promotions"), {
      title: title,
      content: content,
      createdAt: serverTimestamp()
    });

    promoTitle.value = "";
    promoContent.value = "";

    alert("프로모션 등록 완료");
  };
}

if (promoAdminList) {
  onSnapshot(collection(db, "promotions"), (snapshot) => {
    promoAdminList.innerHTML = "";

    if (snapshot.empty) {
      promoAdminList.innerText = "등록된 프로모션이 없습니다.";
      return;
    }

    const promos = [];

    snapshot.forEach((docSnap) => {
      promos.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    promos.sort((a, b) => {
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    promos.forEach((promo) => {
      const div = document.createElement("div");
      div.className = "admin-card";

      div.innerHTML = `
        <h3>${promo.title || "-"}</h3>
        <p style="color:#aaa;">등록일: ${formatDateTime(promo.createdAt)}</p>
        <p>${promo.content || ""}</p>
        <button class="delete-btn promo-delete-btn">삭제</button>
      `;

      div.querySelector(".promo-delete-btn").onclick = async () => {
        const ok = confirm("이 프로모션을 삭제할까요?");
        if (!ok) return;

        await deleteDoc(doc(db, "promotions", promo.id));
        alert("삭제되었습니다.");
      };

      promoAdminList.appendChild(div);
    });
  });
}

function formatDateTime(timestamp) {
  if (!timestamp) return "-";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
if (closeRiderEditBtn) {
  closeRiderEditBtn.onclick = () => {
    riderEditModal.style.display = "none";
  };
}

if (saveRiderEditBtn) {
  saveRiderEditBtn.onclick = async () => {
    if (!editingRiderUid) return;

    const name = document.getElementById("editRiderName").value.trim();
    const phone = document.getElementById("editRiderPhone").value.trim();
    const bank = document.getElementById("editRiderBank").value.trim();
    const account = document.getElementById("editRiderAccount").value.trim();
    const owner = document.getElementById("editRiderOwner").value.trim();
    const settlementType = document.getElementById("editRiderSettlementType").value;

    await updateDoc(doc(db, "users", editingRiderUid), {
      name,
      phone,
      bank,
      account,
      owner,
      settlementType
    });

    alert("기사 정보가 수정되었습니다.");
    riderEditModal.style.display = "none";
    editingRiderUid = null;
  };
}