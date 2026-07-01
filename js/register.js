import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const signupBtn = document.getElementById("signupBtn");
const msg = document.getElementById("msg");

signupBtn.onclick = async () => {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const id = document.getElementById("id").value.trim();
  const pw = document.getElementById("pw").value.trim();
  const pw2 = document.getElementById("pw2").value.trim();
  const settlementType = document.getElementById("settlementType").value;
  const bank = document.getElementById("bank").value;
  const account = document.getElementById("account").value.trim();
  const owner = document.getElementById("owner").value.trim();
  const recommender = document.getElementById("recommender").value.trim();
  const agree = document.getElementById("agree").checked;

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

    const idQuery = query(
      collection(db, "users"),
      where("id", "==", id)
    );

    const idSnap = await getDocs(idQuery);

    if (!idSnap.empty) {
      msg.innerText = "이미 사용중인 아이디입니다.";
      return;
    }

    const email = id + "@wonmind.com";

    const userCred = await createUserWithEmailAndPassword(
      auth,
      email,
      pw
    );

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
    location.href = "login.html";

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