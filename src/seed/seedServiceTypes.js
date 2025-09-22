// seedServiceTypes.js
import { initializeApp } from "firebase/app";
import { db } from "./firebaseConfig.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";


async function seedServiceTypes() {
  try {
    console.log("Starting service types seeding process...");

    // Hardcoded service types
    const hardcodedServiceTypes = [
      "Repair Request",
      "Plumbing Repair",
      "Electrical Repair",
      "Cleaning Request",
    ];

    // Get existing service_types
    const serviceTypesSnapshot = await getDocs(collection(db, "service_types"));
    const existingServiceTypeNames = serviceTypesSnapshot.docs.map((doc) =>
      doc.data().name.toLowerCase()
    );
    console.log("Existing service types:", existingServiceTypeNames);

    // Get categories from available_services
    const availableServicesSnapshot = await getDocs(collection(db, "available_services"));
    const serviceCategories = availableServicesSnapshot.docs
      .map((doc) => {
        const category = doc.data().category;
        return category
          ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
          : null;
      })
      .filter((category) => category !== null);

    console.log("Service categories found in available_services:", serviceCategories);

    // Merge and remove duplicates
    const allServiceTypes = [
      ...new Set([...hardcodedServiceTypes, ...serviceCategories]),
    ].filter(Boolean);

    // Add new service types
    let addedCount = 0;
    for (const serviceTypeName of allServiceTypes) {
      if (existingServiceTypeNames.includes(serviceTypeName.toLowerCase())) {
        console.log(`Service type "${serviceTypeName}" already exists. Skipping.`);
        continue;
      }

      await addDoc(collection(db, "service_types"), {
        name: serviceTypeName,
        description: `${serviceTypeName} service`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Added service type: ${serviceTypeName}`);
      addedCount++;
    }

    console.log(`🎉 Seeding completed! Added ${addedCount} new service types.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding service types:", error);
    process.exit(1);
  }
}

// Run immediately
seedServiceTypes();
