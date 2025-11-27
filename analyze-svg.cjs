const fs = require('fs');
const path = require('path');

const svgPath = '/Users/jenkinschen5/Desktop/ManyThings/Soul比赛/narrative-ai-paths/icon.svg';
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Extract the d attribute
const dMatch = svgContent.match(/d="([^"]+)"/);
if (!dMatch) {
    console.log("No d attribute found");
    process.exit(1);
}

const d = dMatch[1];

// Split into sub-paths. 
// Commands start with M or m. 
// We'll assume absolute M for simplicity as per the file snippet (M 767.62 ...).
// The snippet shows "ZM" which means Close Path then Move.
// We can split by 'M'.
const subPaths = d.split('M').filter(s => s.trim().length > 0).map(s => 'M' + s);

console.log(`Found ${subPaths.length} sub-paths.`);

subPaths.forEach((sp, index) => {
    // Extract all numbers to find bounding box
    const numbers = sp.match(/-?\d+(\.\d+)?/g).map(Number);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // This is a rough approximation. 
    // In SVG paths, numbers alternate X, Y usually, but commands vary.
    // However, for bounding box estimation, checking all numbers might be "good enough" 
    // if we assume the path is mostly absolute coordinates or we just want a heuristic.
    // BUT, strictly speaking, we should parse commands. 
    // Given the snippet "M 767.62 754.46 C768.06,755.59 ...", it uses absolute coordinates.
    // So taking all numbers and treating them as potential coordinates might work for range.
    // Actually, let's try to be slightly smarter: usually pairs.

    // Let's just grab all numbers and find min/max. 
    // It's a heuristic to find position.

    // Note: C command params are also coordinates.

    for (let i = 0; i < numbers.length; i += 2) {
        if (i + 1 < numbers.length) {
            const x = numbers[i];
            const y = numbers[i + 1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    console.log(`Path ${index}: X[${minX.toFixed(0)} - ${maxX.toFixed(0)}], Y[${minY.toFixed(0)} - ${maxY.toFixed(0)}]`);
});
