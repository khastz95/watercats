const fs = require("fs");
const path = require("path");

const boldPath = path.join(__dirname, "..", "assets", "fonts", "ScoreboardSans-Bold.ttf");
const bold = fs.readFileSync(boldPath).toString("base64");

const out = [
  "/** Auto-generated — Roboto Bold embedded for scoreboard rendering on Vercel. */",
  `export const SCOREBOARD_SANS_BOLD_B64 = "${bold}";`,
  "",
].join("\n");

const dest = path.join(__dirname, "..", "src", "lib", "discord", "scoreboardFonts.ts");
fs.writeFileSync(dest, out);
console.log(`wrote ${dest} (${out.length} chars)`);
