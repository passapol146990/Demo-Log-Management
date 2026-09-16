import { evaluateAllRules, ALERT_CHECK_INTERVAL_MS } from "@/lib/alerting";
import { listTenants } from "@/lib/tenants";

async function runAlertCheck() {
  try {
    const tenants = await listTenants();
    for (const tenant of tenants) {
      const triggered = await evaluateAllRules(tenant);
      for (const alert of triggered) {
        console.log(`Alert triggered [${tenant}]:`, alert.rule_name);
      }
    }
  } catch (error) {
    console.error("Alert check failed:", error);
  }
}

if (typeof setInterval !== "undefined") {
  console.log(`Alert checker started (interval=${ALERT_CHECK_INTERVAL_MS}ms)`);
  setInterval(runAlertCheck, ALERT_CHECK_INTERVAL_MS);
}

runAlertCheck();
