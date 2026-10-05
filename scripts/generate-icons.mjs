import fs from "fs";
import { execSync } from "child_process";
import path from "path";

const LOGO_PATH =
  "M4.5 4C3.11929 4 2 5.11929 2 6.5V16C2 17.3807 3.11929 18.5 4.5 18.5H6V21.25C6 21.8488 6.70274 22.1738 7.15806 21.7853L10.978 18.5H19.5C20.8807 18.5 22 17.3807 22 16V6.5C22 5.11929 20.8807 4 19.5 4H4.5ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13H16.5C17.3284 13 18 12.3284 18 11.5C18 10.6716 17.3284 10 16.5 10H7.5ZM9 8C9 7.44772 9.44772 7 10 7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H10C9.44772 9 9 8.55228 9 8Z";

// 1. Classic Dark Brand Icon
const svgClassic = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 2000 2000">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#1f1f23"/>
      <stop offset="100%" stop-color="#121214"/>
    </radialGradient>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="2000" height="2000" fill="url(#bgGrad)"/>
  <svg x="375" y="375" width="1250" height="1250" viewBox="0 0 24 24" filter="url(#subtleShadow)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${LOGO_PATH}" fill="#FFFFFF"/>
  </svg>
</svg>`;

// 2. Vibrant Gradient / Modern SaaS Icon
const svgGradient = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 2000 2000">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1a1429"/>
      <stop offset="60%" stop-color="#0f0c18"/>
      <stop offset="100%" stop-color="#08060c"/>
    </radialGradient>
    <linearGradient id="glyphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9333EA"/>
      <stop offset="50%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="36" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="2000" height="2000" fill="url(#bgGlow)"/>
  <!-- Ambient backdrop soft radial ring -->
  <circle cx="1000" cy="1000" r="600" fill="#9333EA" opacity="0.12" filter="blur(80px)"/>
  <svg x="375" y="375" width="1250" height="1250" viewBox="0 0 24 24" filter="url(#glow)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${LOGO_PATH}" fill="url(#glyphGrad)"/>
  </svg>
</svg>`;

// 3. Minimalist Solid Ink Icon (#171717 brand primary)
const svgMinimal = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 2000 2000">
  <rect width="2000" height="2000" fill="#171717"/>
  <svg x="375" y="375" width="1250" height="1250" viewBox="0 0 24 24">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${LOGO_PATH}" fill="#FFFFFF"/>
  </svg>
</svg>`;

const publicDir = path.resolve("public");

fs.writeFileSync(path.join(publicDir, "connectme-slack-icon-dark.svg"), svgClassic);
fs.writeFileSync(path.join(publicDir, "connectme-slack-icon-gradient.svg"), svgGradient);
fs.writeFileSync(path.join(publicDir, "connectme-slack-icon-minimal.svg"), svgMinimal);

console.log("SVGs written to public/");
