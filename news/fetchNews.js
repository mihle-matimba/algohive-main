import fs from "fs";
import path from "path";
import axios from "axios";
import "dotenv/config";

const OUT_DIR = path.join(process.cwd(), "news", "data");

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join("news", "config.json"), "utf8"));
  const { RAPIDAPI_KEY, RAPIDAPI_HOST } = process.env;

  if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    console.error("Missing RAPIDAPI_KEY or RAPIDAPI_HOST in .env");
    process.exit(1);
  }

  const url = `https://${RAPIDAPI_HOST}${cfg.endpoint || "/news/list"}`;

  const res = await axios.get(url, {
    headers: {
      // match RapidAPI’s sample exactly (lowercase works fine)
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST
    },
    params: cfg.params || {},
    timeout: 30000,
    validateStatus: () => true
  });

  if (res.status < 200 || res.status >= 300) {
    console.error(`❌ ${res.status}`, res.data);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUT_DIR, `tv-news-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(res.data, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "latest.json"), JSON.stringify(res.data, null, 2));
  console.log(`✅ Saved ${file}`);
}

main().catch((e) => {
  console.error("Unhandled error:", e.message);
  process.exit(1);
});
