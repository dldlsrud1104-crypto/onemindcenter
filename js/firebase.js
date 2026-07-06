import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAExcCycw8IFX8CXm1NA0VV-tqXcI8cO5U",
  authDomain: "onemind-bef18.firebaseapp.com",
  projectId: "onemind-bef18",
  storageBucket: "onemind-bef18.firebasestorage.app",
  messagingSenderId: "1023900489401",
  appId: "1:1023900489401:web:9e0bf68b6c89e00784ed68",
  measurementId: "G-1DCDSJMGY4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };