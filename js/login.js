import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");
const msg = document.getElementById("msg");

const ADMIN_ID = "admin";

loginBtn.onclick = async () => {
  const id = document.getElementById("id").value.trim();
  const pw = document.getElementById("pw").value.trim();

  if (!id || !pw) {
    msg.innerText = "아이디와 비밀번호를 입력해주세요.";
    return;
  }

  const email = id + "@wonmind.com";

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, pw);

    if (id === ADMIN_ID) {
      msg.innerText = "관리자 로그인 성공";

      setTimeout(() => {
        location.href = "admin.html";
      }, 800);

      return;
    }

    const userSnap = await getDoc(doc(db, "users", userCred.user.uid));

    if (!userSnap.exists()) {
      msg.innerText = "회원정보를 찾을 수 없습니다.";
      return;
    }

    const userData = userSnap.data();

    if (userData.status === "pending") {
      msg.innerText = "관리자 승인 대기중입니다.";
      return;
    }

    if (userData.status === "rejected") {
      msg.innerText = "가입이 거절되었습니다.";
      return;
    }

    if (userData.status === "approved") {
      msg.innerText = "로그인 성공";

      setTimeout(() => {
        location.href = "rider.html";
      }, 800);

      return;
    }

    msg.innerText = "계정 상태를 확인할 수 없습니다.";

  } catch (error) {
    console.error(error);

    if (error.code === "auth/invalid-credential") {
      msg.innerText = "아이디 또는 비밀번호가 올바르지 않습니다.";
    } else {
      msg.innerText = "로그인 실패: " + error.code;
    }
  }
};