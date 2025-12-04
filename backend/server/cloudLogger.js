// cloudLogger.js
import { Logging } from "@google-cloud/logging";

const logging = new Logging();
const log = logging.log("ai-vision-story-api");

export async function writeLog(data) {
    try {
        const metadata = {
            resource: {
                type: "global",
            },
            severity: data.severity || "INFO",
        };

        const entry = log.entry(metadata, data);
        await log.write(entry);
    } catch (err) {
        console.error("Error writing to Cloud Logging:", err);
    }
}
