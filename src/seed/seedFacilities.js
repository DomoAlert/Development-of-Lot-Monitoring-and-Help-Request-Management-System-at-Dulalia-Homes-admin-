import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./dulalia-fb-firebase-adminsdk-fbsvc-e5c7d95c00.json", "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const facilityPurposes = {
  "Basketball Court": ["Practice", "Tournament", "Recreational Play"],
  "Clubhouse": ["Birthday Party", "Meeting/Event", "Community Gathering"],
  "Swimming Pool": ["Lap Swimming", "Swimming Lessons", "Recreational Swim"],
};

async function seedPurposes() {
  const facilitiesSnapshot = await db.collection("facilities").get();

  for (const facilityDoc of facilitiesSnapshot.docs) {
    const facilityData = facilityDoc.data();
    const facilityName = facilityData.name;

    if (facilityPurposes[facilityName]) {
      console.log(`\n✅ Adding purposes for ${facilityName}`);
      const purposes = facilityPurposes[facilityName];

      for (const p of purposes) {
        await db
          .collection("facilities")
          .doc(facilityDoc.id)
          .collection("purpose")
          .add({ name: p });
        console.log(`   └─➤ ${p}`);
      }
    } else {
      console.log(`⚠️ No purposes defined for: ${facilityName}`);
    }
  }

  console.log("\n🎉 Purposes added successfully!");
}

seedPurposes().catch(console.error);
