import fs from "fs";
import path from "path";
import axios from "axios";
import "dotenv/config";

const NEWS_DIR = path.join(process.cwd(), "news", "data");

async function fetchNews() {
  // Load config
  const cfg = JSON.parse(fs.readFileSync(path.join("news", "config.json"), "utf8"));
  const { RAPIDAPI_KEY, RAPIDAPI_HOST } = process.env;

  if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    console.error("Missing RAPIDAPI_KEY or RAPIDAPI_HOST in .env");
    process.exit(1);
  }

  const url = `https://${RAPIDAPI_HOST}${cfg.endpoint}`;

  try {
    const res = await axios.get(url, {
      params: cfg.params,
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
      },
      timeout: 30000
    });

    // Ensure folder exists
    fs.mkdirSync(NEWS_DIR, { recursive: true });

    // Save as timestamped file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(NEWS_DIR, `news-${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2));

    // Also overwrite latest.json
    fs.writeFileSync(path.join(NEWS_DIR, "latest.json"), JSON.stringify(res.data, null, 2));

    console.log(`✅ News saved: ${filePath}`);
  } catch (err) {
    if (err.response) {
      console.error("❌ API Error:", err.response.status, err.response.data);
    } else {
      console.error("❌ Network Error:", err.message);
    }
  }
}

fetchNews();
