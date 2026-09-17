const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "assets", "fonts");
const regular = fs.readFileSync(path.join(dir, "ScoreboardSans.ttf")).toString("base64");
const bold = fs.readFileSync(path.join(dir, "ScoreboardSans-Bold.ttf")).toString("base64");

const out = [
  "/** Auto-generated — Liberation Sans embedded for sharp/SVG on Vercel. */",
  `export const SCOREBOARD_SANS_REGULAR_B64 = "${regular}";`,
  `export const SCOREBOARD_SANS_BOLD_B64 = "${bold}";`,
  "",
].join("\n");

const dest = path.join(__dirname, "..", "src", "lib", "discord", "scoreboardFonts.ts");
fs.writeFileSync(dest, out);
console.log(`wrote ${dest} (${out.length} chars)`);
