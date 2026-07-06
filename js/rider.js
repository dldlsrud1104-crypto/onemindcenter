import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const riderName = document.getElementById("riderName");
const settlementTypeText = document.getElementById("settlementTypeText");
const todayAmount = document.getElementById("todayAmount");
const paymentStatus = document.getElementById("paymentStatus");

const settlementList = document.getElementById("settlementList");
const noticeBox = document.getElementById("noticeList");
const promoList = document.getElementById("promoList");
const logoutBtn = document.getElementById("logoutBtn");

const modal = document.getElementById("settlementModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");

const noticeNew = document.getElementById("noticeNew");
const promoNew = document.getElementById("promoNew");

const settlementBtn = document.getElementById("settlementBtn");
const noticeBtn = document.getElementById("noticeBtn");
const promoBtn = document.getElementById("promoBtn");
const contactBtn = document.getElementById("contactBtn");

const settlementSection = document.getElementById("settlementSection");
const noticeSection = document.getElementById("noticeSection");
const promoSection = document.getElementById("promoSection");


const profileBtn = document.getElementById("profileBtn");
const profileSection = document.getElementById("profileSection");
const profileInfo = document.getElementById("profileInfo");
const settlementDateFilter = document.getElementById("settlementDateFilter");

let currentUid = null;
let currentRider = null;

/* 모달 닫기 */
if (closeModal) {
  closeModal.onclick = () => {
    modal.style.display = "none";
  };
}

if (modal) {
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  };
}

/* 로그인 확인 */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    alert("기사 정보를 찾을 수 없습니다.");
    location.href = "login.html";
    return;
  }
currentUid = user.uid;
  currentRider = userSnap.data();
  renderProfile();

  if (riderName) {
    riderName.innerText = `${currentRider.name || ""} 기사님 👋`;
  }

  if (settlementTypeText) {
    settlementTypeText.innerText =
      currentRider.settlementType === "nextDay"
        ? "정산방식 : 익일정산"
        : "정산방식 : 주정산";
  }

  loadMySettlements(user.uid);
});

/* 내 정산 불러오기 */
function loadMySettlements(uid) {
  const q = query(
    collection(db, "settlements"),
    where("uid", "==", uid)
  );

  onSnapshot(q, (snapshot) => {
    const settlements = [];

    snapshot.forEach((docSnap) => {
      settlements.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    settlements.sort((a, b) =>
      (b.workDate || "").localeCompare(a.workDate || "")
    );

    renderSummary(settlements);
    renderSettlementList(settlements);
  });
}

/* 메인 요약 */
function renderSummary(settlements) {
  if (settlements.length === 0) {
    if (todayAmount) todayAmount.innerText = "0원";

    if (paymentStatus) {
      paymentStatus.innerText = "정산없음";
      paymentStatus.style.color = "#9ca3af";
    }

    return;
  }

  const latest = settlements[0];

  if (todayAmount) {
    todayAmount.innerText =
      `${Number(latest.totalPay || 0).toLocaleString()}원`;
  }

  if (paymentStatus) {
    if (latest.status === "paid") {
      paymentStatus.innerText = "입금완료";
      paymentStatus.style.color = "#22c55e";
    } else {
      paymentStatus.innerText = "입금대기";
      paymentStatus.style.color = "#facc15";
    }
  }
}

/* 정산 목록 */
let mySettlements = [];

function renderSettlementList(settlements) {
  if (!settlementList) return;

  mySettlements = [...settlements].sort((a, b) =>
    (b.workDate || "").localeCompare(a.workDate || "")
  );

  renderDateFilter(mySettlements);
  renderFilteredSettlements();
}

function renderDateFilter(settlements) {
  if (!settlementDateFilter) return;

  const currentValue = settlementDateFilter.value || "all";
  const dates = [...new Set(settlements.map((s) => s.workDate).filter(Boolean))];

  settlementDateFilter.innerHTML = `<option value="all">전체 날짜</option>`;

  dates.forEach((date) => {
    settlementDateFilter.innerHTML += `
      <option value="${date}">${date}</option>
    `;
  });

  settlementDateFilter.value = dates.includes(currentValue) ? currentValue : "all";
}

function renderFilteredSettlements() {
  if (!settlementList) return;

  const selectedDate = settlementDateFilter?.value || "all";

  const list =
    selectedDate === "all"
      ? mySettlements
      : mySettlements.filter((s) => s.workDate === selectedDate);

  settlementList.innerHTML = "";

  if (list.length === 0) {
    settlementList.innerText = "해당 날짜 정산내역이 없습니다.";
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "list-item settlement-item";
    div.style.cursor = "pointer";

    div.innerHTML = `
      <div class="settlement-card-top">
        <div>
          <p class="settlement-date">📅 ${item.workDate || "-"} 운행</p>
          <p class="settlement-pay">${Number(item.totalPay || 0).toLocaleString()}원</p>
        </div>

        <span class="${item.status === "paid" ? "paid-badge" : "wait-badge"}">
          ${item.status === "paid" ? "입금완료" : "입금대기"}
        </span>
      </div>

      <div class="settlement-card-info">
        지급일 ${item.payDate || "-"}<br>
        배송 ${Number(item.deliveryCount || 0).toLocaleString()}건
        ${
          Number(item.wrongDeliveryCount || 0) > 0
            ? `<br>오배송 ${Number(item.wrongDeliveryCount || 0).toLocaleString()}건 / -${Number(item.wrongDeliveryPay || 0).toLocaleString()}원`
            : ""
        }
        <br><br>
        <span style="font-weight:800;">터치하면 정산서 보기 ›</span>
      </div>
    `;

    div.onclick = () => {
      openSettlementModal(item);
    };

    settlementList.appendChild(div);
  });
}

if (settlementDateFilter) {
  settlementDateFilter.onchange = renderFilteredSettlements;
}

/* 정산서 팝업 */
function openSettlementModal(item) {
  if (!modal || !modalBody) return;

  if (modalTitle) {
    modalTitle.innerText = "원마인드 정산서";
  }

  modalBody.innerHTML = `
    <table class="modal-table">
      <tr><td>기사명</td><td>${currentRider?.name || "-"}</td></tr>
<tr><td>운행일</td><td>${item.workDate || "-"}</td></tr>
<tr><td>지급일</td><td>${item.payDate || "-"}</td></tr>
<tr><td>배송건수</td><td>${Number(item.deliveryCount || 0).toLocaleString()}건</td></tr>
<tr><td>오배송</td><td>${Number(item.wrongDeliveryCount || 0).toLocaleString()}건</td></tr>
<tr><td>오배송 차감금액</td><td>-${Number(item.wrongDeliveryPay || 0).toLocaleString()}원</td></tr>
<tr><td>쿠팡 지급액</td><td>${Number(item.coupangPay || 0).toLocaleString()}원</td></tr>



<tr><td>산재</td><td>-${Number(item.industrialPay || 0).toLocaleString()}원</td></tr>
<tr><td>고용</td><td>-${Number(item.employmentPay || 0).toLocaleString()}원</td></tr>
<tr><td>원천세</td><td>-${Number(item.taxPay || 0).toLocaleString()}원</td></tr>

<tr><td>미션비</td><td>${Number(item.missionPay || 0).toLocaleString()}원</td></tr>
<tr><td>프로모션</td><td>${Number(item.promotionPay || 0).toLocaleString()}원</td></tr>

<tr><td>오배송 내역</td><td>${item.wrongDeliveryMemo || "-"}</td></tr>
    </table>

    <div class="modal-total">
      최종 지급액<br>
      ${Number(item.totalPay || 0).toLocaleString()}원
    </div>

    <div class="modal-status">
      ${item.status === "paid" ? "🟢 입금완료" : "🟡 입금대기"}
    </div>
  `;

  modal.style.display = "block";
}

/* 공지사항 */
if (noticeBox) {
  onSnapshot(collection(db, "notice"), (snapshot) => {
    noticeBox.innerHTML = "";

    if (snapshot.empty) {
      noticeBox.innerHTML = "등록된 공지가 없습니다.";
      return;
    }

    const notices = [];

    snapshot.forEach((docSnap) => {
      notices.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    notices.sort((a, b) => {
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    notices.forEach((notice) => {
      const div = document.createElement("div");
      div.className = "list-item notice-item";

      div.innerHTML = `
        <strong>📢 ${notice.title || "-"}</strong>
        <div class="list-sub">
          ${formatDateTime(notice.createdAt)}<br>
          ${(notice.content || "").slice(0, 50)}
        </div>
      `;

      div.onclick = () => {
        openNoticeModal(notice);
      };

      noticeBox.appendChild(div);
    });
  });
}

function openNoticeModal(notice) {
  if (!modal || !modalBody) return;

  if (modalTitle) {
    modalTitle.innerText = "공지사항";
  }

  modalBody.innerHTML = `
    <table class="modal-table">
      <tr><td>제목</td><td>${notice.title || "-"}</td></tr>
      <tr><td>등록일</td><td>${formatDateTime(notice.createdAt)}</td></tr>
      <tr><td>내용</td><td>${(notice.content || "").replace(/\n/g, "<br>")}</td></tr>
    </table>
  `;

  modal.style.display = "block";
}

/* 프로모션 */
if (promoList) {
  onSnapshot(collection(db, "promotions"), (snapshot) => {
    promoList.innerHTML = "";

    if (snapshot.empty) {
      promoList.innerHTML = "진행중인 프로모션이 없습니다.";
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
      div.className = "list-item promo-item";

      div.innerHTML = `
        <strong>🎁 ${promo.title || "-"}</strong>

        ${
          promo.imageUrl
            ? `<img src="${promo.imageUrl}" class="post-image">`
            : ""
        }

        <div class="list-sub">
          ${formatDateTime(promo.createdAt)}<br>
          ${(promo.content || "").slice(0, 50)}
        </div>
      `;

      div.onclick = () => {
        openPromoModal(promo);
      };

      promoList.appendChild(div);
    });
  });
}
function openProfileModal() {
  if (!modal || !modalBody || !currentRider) return;

  if (modalTitle) modalTitle.innerText = "내 정보";

  modalBody.innerHTML = `
    <div class="profile-edit-box">
      <label>이름</label>
      <input id="editName" class="admin-input" value="${currentRider.name || ""}">

      <label>연락처</label>
      <input id="editPhone" class="admin-input" value="${currentRider.phone || ""}">

      <label>은행</label>
      <input id="editBank" class="admin-input" value="${currentRider.bank || ""}">

      <label>계좌번호</label>
      <input id="editAccount" class="admin-input" value="${currentRider.account || ""}">

      <label>예금주</label>
      <input id="editOwner" class="admin-input" value="${currentRider.owner || ""}">

      <button id="saveProfileBtn" class="admin-red-btn">저장하기</button>
    </div>
  `;

  modal.style.display = "block";

  document.getElementById("saveProfileBtn").onclick = async () => {
    const name = document.getElementById("editName").value.trim();
    const phone = document.getElementById("editPhone").value.trim();
    const bank = document.getElementById("editBank").value.trim();
    const account = document.getElementById("editAccount").value.trim();
    const owner = document.getElementById("editOwner").value.trim();

    await updateDoc(doc(db, "users", currentUid), {
      name,
      phone,
      bank,
      account,
      owner
    });

    currentRider = {
      ...currentRider,
      name,
      phone,
      bank,
      account,
      owner
    };

    if (riderName) riderName.innerText = `${name} 기사님 👋`;

    alert("내 정보가 수정되었습니다.");
    modal.style.display = "none";
  };
}
function openPromoModal(promo) {
  if (!modal || !modalBody) return;

  if (modalTitle) {
    modalTitle.innerText = "프로모션 상세";
  }

  modalBody.innerHTML = `
    <table class="modal-table">
      <tr><td>제목</td><td>${promo.title || "-"}</td></tr>
      <tr><td>등록일</td><td>${formatDateTime(promo.createdAt)}</td></tr>
    </table>

    ${
      promo.imageUrl
        ? `<img src="${promo.imageUrl}" class="post-image">`
        : ""
    }

    <div class="modal-content-text">
      ${(promo.content || "").replace(/\n/g, "<br>")}
    </div>
  `;

  modal.style.display = "block";
}
function renderProfile() {
  if (!profileInfo || !currentRider) return;

  profileInfo.innerHTML = `
    <div class="list-item">
      <strong>이름</strong>
      <div class="list-sub">${currentRider.name || "-"}</div>
    </div>

    <div class="list-item">
      <strong>연락처</strong>
      <div class="list-sub">${currentRider.phone || "-"}</div>
    </div>

    <div class="list-item">
      <strong>정산방식</strong>
      <div class="list-sub">
        ${currentRider.settlementType === "nextDay" ? "익일정산" : "주정산"}
      </div>
    </div>

    <div class="list-item">
      <strong>은행</strong>
      <div class="list-sub">${currentRider.bank || "-"}</div>
    </div>

    <div class="list-item">
      <strong>계좌번호</strong>
      <div class="list-sub">${currentRider.account || "-"}</div>
    </div>

    <div class="list-item">
      <strong>예금주</strong>
      <div class="list-sub">${currentRider.owner || "-"}</div>
    </div>
  `;
}


/* 날짜 포맷 */
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

/* 로그아웃 */
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await signOut(auth);
    location.href = "login.html";
  };
}

/* 메뉴 화면 전환 */
function showRiderSection(section) {
  [settlementSection, noticeSection, promoSection, profileSection].forEach((s) => {
    if (s) {
      s.classList.remove("active");
      s.style.display = "none";
    }
  });

  if (section) {
    section.classList.add("active");
    section.style.display = "block";
    section.scrollIntoView({ behavior: "smooth" });
  }
}
if (settlementBtn) {
  settlementBtn.onclick = () => {
    showRiderSection(settlementSection);
  };
}

if (noticeBtn) {
  noticeBtn.onclick = () => {
    if (noticeNew) noticeNew.style.display = "none";
    showRiderSection(noticeSection);
  };
}

if (promoBtn) {
  promoBtn.onclick = () => {
    if (promoNew) promoNew.style.display = "none";
    showRiderSection(promoSection);
  };
}

if (contactBtn) {
  contactBtn.onclick = () => {
     if (confirm("원마인드 운영팀으로 전화하시겠습니까?")) {
    location.href = "tel:010-2277-8961";
     }
  };
}
if (profileBtn) {
  profileBtn.onclick = () => {
    showRiderSection(profileSection);
  };
}
if (profileBtn) {
  profileBtn.onclick = () => {
    openProfileModal();
  };
}