// Seed House Models to Firebase
// Run this script once to populate the houseModels collection

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig.js';

const houseModelsData = [
  { name: 'Standard', lotArea: 'N/A', floorArea: 'N/A', bedrooms: 'N/A', bathrooms: 'N/A', notes: 'Default model for backward compatibility.' },
  { name: 'Kate', lotArea: '~128 sqm', floorArea: '~154 sqm', bedrooms: '4', bathrooms: '3', notes: 'One of the larger models; likely more premium.' },
  { name: 'Ivory', lotArea: '~100 sqm', floorArea: '~123 sqm', bedrooms: '3–4', bathrooms: '3', notes: 'Includes terrace and carport.' },
  { name: 'Flora', lotArea: '~125 sqm', floorArea: '~87 sqm', bedrooms: '4', bathrooms: '2', notes: 'Spacious but compact floor area.' },
  { name: 'Edelweiss', lotArea: '60–64 sqm', floorArea: '~64 sqm', bedrooms: '3', bathrooms: '2', notes: 'Efficient layout.' },
  { name: 'Daffodil', lotArea: '~72.5–75 sqm', floorArea: '~70–73 sqm', bedrooms: '3', bathrooms: '1–2', notes: 'Budget-friendly.' },
  { name: 'Bellis', lotArea: '~119 sqm', floorArea: '~56 sqm', bedrooms: '2', bathrooms: '1', notes: 'Good for small families; includes 1 car garage.' }
];

async function seedHouseModels() {
  try {
    console.log('Seeding house models to Firebase...');

    for (const model of houseModelsData) {
      await addDoc(collection(db, 'houseModels'), {
        ...model,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`Added house model: ${model.name}`);
    }

    console.log('Successfully seeded all house models!');
  } catch (error) {
    console.error('Error seeding house models:', error);
  }
}

// Run the seeding function
seedHouseModels();