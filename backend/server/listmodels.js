// listModels.js
import dotenv from "dotenv";
import fetch from "node-fetch"; // if Node v22, fetch is global; otherwise, npm install node-fetch

dotenv.config();

const { GEMINI_API_KEY } = process.env;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not set in .env");
  process.exit(1);
}

async function listModels() {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: {
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Available models:");
    data.models.forEach((model) => {
      console.log(`- ${model.name} (displayName: ${model.displayName})`);
    });

  } catch (err) {
    console.error("❌ Error listing models:", err);
  }
}

listModels();
