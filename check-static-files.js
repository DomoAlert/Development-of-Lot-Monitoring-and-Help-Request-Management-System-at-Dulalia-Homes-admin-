// This script checks if all required static files exist
// Run with `node check-static-files.js`

const fs = require('fs');
const path = require('path');

// List of required static files
const requiredFiles = [
  'favicon.ico',
  'logo192.png',
  'logo512.png',
  'manifest.json',
  'robots.txt',
  'index.html'
];

// Check the public folder
const publicDir = path.join(__dirname, 'public');
console.log(`Checking static files in ${publicDir}...`);

let allFilesExist = true;

// Check each file
requiredFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const fileSizeInKB = stats.size / 1024;
    console.log(`✅ ${file} (${fileSizeInKB.toFixed(2)} KB)`);
  } else {
    console.error(`❌ ${file} is missing!`);
    allFilesExist = false;
  }
});

// Print result
if (allFilesExist) {
  console.log('✅ All static files are present');
} else {
  console.error('❌ Some static files are missing!');
  process.exit(1);
}

// Verify manifest.json content
try {
  const manifestPath = path.join(publicDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Check important manifest properties
  const requiredProps = ['name', 'short_name', 'icons'];
  const missingProps = requiredProps.filter(prop => !manifest[prop]);
  
  if (missingProps.length === 0) {
    console.log('✅ manifest.json contains all required properties');
  } else {
    console.error(`❌ manifest.json is missing properties: ${missingProps.join(', ')}`);
  }
} catch (err) {
  console.error('❌ Error reading or parsing manifest.json:', err.message);
}

// Check icons referenced in manifest
try {
  const manifestPath = path.join(publicDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  if (manifest.icons && Array.isArray(manifest.icons)) {
    console.log('Checking icon files referenced in manifest.json...');
    
    manifest.icons.forEach(icon => {
      if (icon.src) {
        // Remove leading slash if present
        const iconPath = icon.src.startsWith('/') ? icon.src.substring(1) : icon.src;
        const fullPath = path.join(publicDir, iconPath);
        
        if (fs.existsSync(fullPath)) {
          console.log(`✅ Icon exists: ${icon.src}`);
        } else {
          console.error(`❌ Icon missing: ${icon.src}`);
        }
      }
    });
  }
} catch (err) {
  // Already logged error above
}