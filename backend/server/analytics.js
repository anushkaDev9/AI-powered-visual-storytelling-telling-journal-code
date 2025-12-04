import axios from "axios";

const MEASUREMENT_ID = "G-4T4JT5XFMY";
const API_SECRET = "_gGTPsyKT6-5yXwC1rdaWg";

export async function logServerEvent(eventName, params = {}) {
    try {
        await axios.post(
            `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
            {
                client_id: "server-event",
                events: [
                    {
                        name: eventName,
                        params: params,
                    },
                ],
            }
        );
    } catch (error) {
        console.error("GA4 Server Event Error:", error.response?.data || error);
    }
}
