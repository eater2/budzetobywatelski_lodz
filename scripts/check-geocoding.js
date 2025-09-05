const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/data/projekty.json'));
const withCoords = data.projects.filter(p => p.lat && p.lng);
const withoutCoords = data.projects.filter(p => !p.lat || !p.lng);

console.log('Geocoding status:');
console.log('Projects with coordinates:', withCoords.length);
console.log('Projects without coordinates:', withoutCoords.length);
console.log('Total projects:', data.projects.length);

// Show L068 specifically
const l068 = data.projects.find(p => p.id === 'L068');
if (l068) {
  console.log('\nL068 geocoding status:');
  console.log('  Has coordinates:', !!(l068.lat && l068.lng));
  console.log('  lat:', l068.lat);
  console.log('  lng:', l068.lng);
}