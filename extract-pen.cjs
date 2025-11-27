const fs = require('fs');

const svgPath = 'icon.svg';
const svgContent = fs.readFileSync(svgPath, 'utf8');

const dMatch = svgContent.match(/d="([^"]+)"/);
if (!dMatch) {
    console.log("No d attribute found");
    process.exit(1);
}

const d = dMatch[1];
// Split by 'M' but keep the delimiter. 
// The regex splits and captures the delimiter, so we need to rejoin.
// Actually, splitting by 'M' (case sensitive) is safer if we assume standard output.
// The previous file showed "M ...".
const parts = d.split('M');
const subPaths = [];

// Reconstruct paths starting with M
for (let i = 1; i < parts.length; i++) {
    subPaths.push('M' + parts[i]);
}

console.log(`Total sub-paths: ${subPaths.length}`);

const leftPaths = [];
const rightPaths = [];

subPaths.forEach((sp, index) => {
    const numbers = sp.match(/-?\d+(\.\d+)?/g);
    if (!numbers) return;

    const coords = numbers.map(Number);
    let minX = Infinity, maxX = -Infinity;

    for (let i = 0; i < coords.length; i += 2) {
        const x = coords[i];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
    }

    // Heuristic: If the path is mostly on the left side (e.g., X < 300), it's likely the icon.
    // The total width is 1387.
    // Let's try a threshold of 400.
    if (maxX < 400) {
        leftPaths.push(sp);
    } else {
        rightPaths.push(sp);
    }
});

console.log(`Left paths: ${leftPaths.length}`);
console.log(`Right paths: ${rightPaths.length}`);

// Create a new SVG with only left paths
const newSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 756">
<path fill="currentColor" d="${leftPaths.join(' ')}" />
</svg>`;

fs.writeFileSync('public/pen-icon.svg', newSvgContent);
console.log('Generated public/pen-icon.svg');
