import { checkLoginFailures, triggerWebhook } from "@/lib/alerting";
import { searchLogs } from "@/lib/opensearch";

async function runAlertCheck() {
  try {
    const result = await searchLogs({ query: "", tenant: "demoA", size: 100 });
    const alert = await checkLoginFailures(result);
    if (alert) {
      const rule = { webhook_url: process.env.WEBHOOK_URL || "" };
      await triggerWebhook(alert, rule.webhook_url);
      console.log("Alert triggered:", alert.rule_name);
    }
  } catch (error) {
    console.error("Alert check failed:", error);
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(runAlertCheck, 60000);
}

runAlertCheck();
