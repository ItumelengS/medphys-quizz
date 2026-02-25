const fs = require('fs');
const path = require('path');

function generateSVGIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#060a14"/>
  <text x="50%" y="42%" dominant-baseline="middle" text-anchor="middle" font-size="${size * 0.3}" font-family="sans-serif" fill="#00e5a0" font-weight="900">MP</text>
  <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-size="${size * 0.12}" font-family="sans-serif" fill="#7a8599">QUIZ</text>
</svg>`;
}

// Write SVG icons (browsers support SVG in manifest nowadays, and we can convert to PNG later)
// For now write simple placeholder PNGs using SVG data URIs won't work directly,
// so let's just use SVG files
fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon-192.svg'), generateSVGIcon(192));
fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon-512.svg'), generateSVGIcon(512));
console.log('Icons generated');
