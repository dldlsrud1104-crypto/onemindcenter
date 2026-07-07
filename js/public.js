import { db } from "./firebase.js";

import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const publicPromoList = document.getElementById("publicPromoList");

if (publicPromoList) {
  onSnapshot(collection(db, "promotions"), (snapshot) => {
    publicPromoList.innerHTML = "";

    if (snapshot.empty) {
      publicPromoList.innerHTML = "진행중인 프로모션이 없습니다.";
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

    promos.slice(0, 3).forEach((promo) => {
      const div = document.createElement("div");
      div.className = "public-promo-card";

      div.innerHTML = `
        <h3>${promo.title || "-"}</h3>

        ${
          promo.imageUrl
            ? `<img src="${promo.imageUrl}" class="public-promo-image">`
            : ""
        }

        <p>${(promo.content || "").replace(/\n/g, "<br>")}</p>
      `;

      publicPromoList.appendChild(div);
    });
  });
}