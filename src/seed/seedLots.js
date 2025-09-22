// src/seed/seedLots.js
import { db } from "./firebaseConfig.js";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";

const blockConfig = {
  1: 20,
  2: 25,
  3: 15,
  4: 22,
  5: 18,
};

async function seedLots() {
  const batch = writeBatch(db);
  const lotsRef = collection(db, "lots");

  Object.keys(blockConfig).forEach((blockNum) => {
    for (let i = 1; i <= blockConfig[blockNum]; i++) {
      const lotId = `B${blockNum}-L${i.toString().padStart(2, "0")}`;
      const houseNo = parseInt(blockNum) * 100 + i;

      batch.set(doc(lotsRef, lotId), {
        house_no: houseNo,
        block: parseInt(blockNum),
        lot: i,
        status: "Vacant",
        house_owner: null,
        owner_id: null,
        houseModel: "Standard",
        created_at: serverTimestamp(),
      });
    }
  });

  try {
    await batch.commit();
    console.log("✅ Lots seeded successfully!");
  } catch (err) {
    console.error("❌ Error seeding lots:", err);
  }
}

seedLots();
