import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const ADMIN_ID = "admin";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const formTitle = document.getElementById("formTitle");

document.getElementById("showRegister").onclick = () => {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  formTitle.innerText = "기사 회원가입";
};

document.getElementById("showLogin").onclick = () => {
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  formTitle.innerText = "기사 로그인";
};

// 로그인
document.getElementById("loginBtn").onclick = async () => {
  const id = document.getElementById("loginId").value.trim();
  const pw = document.getElementById("loginPw").value.trim();
  const msg = document.getElementById("loginMsg");

  if (!id || !pw) {
    msg.innerText = "아이디와 비밀번호를 입력해주세요.";
    return;
  }

  try {
    const email = id + "@wonmind.com";
    const userCred = await signInWithEmailAndPassword(auth, email, pw);

    if (id === ADMIN_ID) {
      location.href = "admin.html";
      return;
    }

    const snap = await getDoc(doc(db, "users", userCred.user.uid));

    if (!snap.exists()) {
      msg.innerText = "회원정보가 없습니다.";
      return;
    }

    const user = snap.data();

    if (user.status === "pending") {
      msg.innerText = "관리자 승인 대기중입니다.";
      return;
    }

    if (user.status === "rejected") {
      msg.innerText = "가입이 거절되었습니다.";
      return;
    }

    if (user.status === "approved") {
      location.href = "rider.html";
      return;
    }

    msg.innerText = "계정 상태를 확인할 수 없습니다.";

  } catch (error) {
    console.error(error);
    msg.innerText = "로그인 실패: " + error.code;
  }
};

// 회원가입
document.getElementById("signupBtn").onclick = async () => {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const id = document.getElementById("regId").value.trim();
  const pw = document.getElementById("regPw").value.trim();
  const pw2 = document.getElementById("regPw2").value.trim();
  const settlementType = document.getElementById("settlementType").value;
  const bank = document.getElementById("bank").value;
  const account = document.getElementById("account").value.trim();
  const owner = document.getElementById("owner").value.trim();
  const recommender = document.getElementById("recommender").value.trim();
  const agree = document.getElementById("agree").checked;
  const msg = document.getElementById("signupMsg");

  if (!name || !phone || !id || !pw || !pw2 || !bank || !account || !owner) {
    msg.innerText = "필수 항목을 모두 입력해주세요.";
    return;
  }

  if (pw !== pw2) {
    msg.innerText = "비밀번호가 일치하지 않습니다.";
    return;
  }

  if (!agree) {
    msg.innerText = "개인정보 이용 동의가 필요합니다.";
    return;
  }

  try {
    msg.innerText = "가입 처리중...";

    const checkId = query(
      collection(db, "users"),
      where("id", "==", id)
    );

    const checkSnap = await getDocs(checkId);

    if (!checkSnap.empty) {
      msg.innerText = "이미 사용중인 아이디입니다.";
      return;
    }

    const email = id + "@wonmind.com";

    const userCred = await createUserWithEmailAndPassword(auth, email, pw);

    await setDoc(doc(db, "users", userCred.user.uid), {
      name,
      phone,
      id,
      settlementType,
      bank,
      account,
      owner,
      recommender,
      role: "rider",
      status: "pending",
      createdAt: serverTimestamp()
    });

    alert("회원가입 완료! 관리자 승인 후 로그인 가능합니다.");
    location.href = "auth.html";

  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      msg.innerText = "이미 가입된 아이디입니다.";
    } else if (error.code === "auth/weak-password") {
      msg.innerText = "비밀번호는 6자리 이상 입력해주세요.";
    } else {
      msg.innerText = "회원가입 오류: " + error.code;
    }
  }
};