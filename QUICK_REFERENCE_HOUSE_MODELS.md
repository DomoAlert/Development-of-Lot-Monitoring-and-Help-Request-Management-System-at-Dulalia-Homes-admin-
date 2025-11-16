# Quick Reference: Dulalia Homes Viente Reales House Models

## 🏠 Official Lineup (November 2025)

### 1. Kate - Premium Flagship
- **Lot**: 128 sqm | **Floor**: 154 sqm
- **Layout**: 4 bed, 3 bath
- **Target**: Luxury family homes
- **Images**: 
  - Unit: `KATE-UNIT.jpg`
  - Plans: `KATE-1ST-FLOOR.jpg`, `KATE-2ND-FLOOR.jpg`

### 2. Ivory - Spacious & Flexible
- **Lot**: 100 sqm | **Floor**: 123 sqm
- **Layout**: 3 bed, 4 bath
- **Features**: Terrace, carport, optional 4th room
- **Images**: 
  - Unit: `IVORY-UNIT.jpg`
  - Plans: `IVORY-1ST-FLOOR.jpg`, `IVORY-2ND-FLOOR.jpg`

### 3. Flora - Efficient Family Home
- **Lot**: 125 sqm | **Floor**: 87 sqm
- **Layout**: 4 bed, 2 bath
- **Target**: Modern families
- **Images**: 
  - Unit: `FLORA-UNIT.jpg`
  - Plans: `FLORA-1ST-FLOOR.jpg`, `FLORA-2ND-FLOOR.jpg`

### 4. Edelweiss - Compact Townhouse
- **Lot**: 64 sqm | **Floor**: 64 sqm
- **Layout**: 3 bed, 2 bath
- **Target**: Young families, first-time buyers
- **Images**: 
  - Unit: `EDELWEISS-UNIT.jpg`
  - Plans: `EDELWEISS-1ST-FLOOR.jpg`, `EDELWEISS-2ND-FLOOR.jpg`

### 5. Daffodil - Budget-Friendly
- **Lot**: 75 sqm | **Floor**: 73 sqm
- **Layout**: 3 bed, 2 bath
- **Target**: Entry-level homeowners
- **Images**: 
  - Unit: `DAFFODIL-UNIT.jpg`
  - Plans: `DAFFODIL-1ST-FLOOR.jpg`, `DAFFODIL-2ND-FLOOR.jpg`

### 6. Bellis - Cozy End-Unit
- **Lot**: 119 sqm | **Floor**: 56 sqm
- **Layout**: 2 bed, 1 bath
- **Features**: 1-car garage, end unit
- **Target**: Small families, couples
- **Images**: 
  - Unit: `BELLIS-UNIT.jpg`
  - Plan: `BELLIS-END-UNIT-COLORED-FLOORPLAN-scaled.jpg` (single combined)

---

## 📊 Comparison Chart

| Model | Price Range* | Lot Size | Floor Area | Beds | Baths | Best For |
|-------|-------------|----------|------------|------|-------|----------|
| Kate | Premium | 128 sqm | 154 sqm | 4 | 3 | Large families |
| Ivory | Mid-High | 100 sqm | 123 sqm | 3 | 4 | Growing families |
| Flora | Mid | 125 sqm | 87 sqm | 4 | 2 | Modern families |
| Edelweiss | Mid-Low | 64 sqm | 64 sqm | 3 | 2 | Young couples |
| Daffodil | Budget | 75 sqm | 73 sqm | 3 | 2 | First-time buyers |
| Bellis | Budget | 119 sqm | 56 sqm | 2 | 1 | Small families |

*Contact Dulalia Homes for current pricing

---

## 🔧 Technical Implementation

### Firebase Document Structure:
```javascript
{
  name: "Kate",
  lotArea: "128 sqm",
  floorArea: "154 sqm",
  bedrooms: 4,
  bathrooms: 3,
  notes: "Premium 2-storey flagship...",
  subdivision: "Viente Reales Executive Village",
  developer: "Dulalia Homes",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Image URL Pattern:
```
Base: https://dulaliahomes.com/wp-content/uploads/2024/11/
Unit: {MODEL}-UNIT.jpg
Floor 1: {MODEL}-1ST-FLOOR.jpg
Floor 2: {MODEL}-2ND-FLOOR.jpg

Exception:
Bellis: BELLIS-END-UNIT-COLORED-FLOORPLAN-scaled.jpg (combined)
```

### Code Access:
```javascript
// Get house model images
const images = getHouseModelImages('Kate');
// Returns: { unit: "https://...", floorPlans: ["https://..."] }

// Get all house models
const models = houseModels; // From state
// Returns: Array of 6 model objects
```

---

## 📱 User Interface

### Display Format:
```
Kate - 4 bed, 3 bath (154 sqm FA)
```

### Modal Features:
- ✅ Unit image with overlay
- ✅ Specifications (lot, floor, beds, baths)
- ✅ Description text
- ✅ Floor plan viewer
- ✅ Smooth scroll to plans
- ✅ Image fallback handling

---

## 🚀 Quick Actions

### To Reset House Models:
1. Open Firebase Console
2. Delete `houseModels` collection
3. Refresh admin page
4. System auto-seeds 6 official models

### To Add New Model:
1. Add entry to Firebase `houseModels`
2. Update `getHouseModelImages()` with CDN URLs
3. Upload images to Dulalia CDN
4. Test in admin panel

### To Update Specs:
1. Edit Firebase document directly
2. Or delete collection to reseed with code updates
3. Changes reflect immediately (no cache)

---

## 📞 Support

**Dulalia Homes Contact:**
- Website: https://dulaliahomes.com
- Property Listings: OnePropertee, Lamudi, DotProperty

**Developer:**
- Component: `src/pages/Admin/LotMonitoring.js`
- Collection: `houseModels` (Firebase)
- Images: Dulalia Homes CDN

---

*Last Updated: November 17, 2025*
