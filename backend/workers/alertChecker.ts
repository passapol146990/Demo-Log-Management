import { evaluateAllRules } from "@/lib/alerting";
import { listTenants } from "@/lib/tenants";
import { getWorkerConfig, watchWorkerConfig } from "@/lib/workerConfig";

let currentIntervalMs = 60000;
let currentTimeout: NodeJS.Timeout | null = null;

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

function scheduleNext() {
  if (currentTimeout) clearTimeout(currentTimeout);
  currentTimeout = setTimeout(() => {
    runAlertCheck().then(scheduleNext);
  }, currentIntervalMs);
}

if (typeof setInterval !== "undefined") {
  const cfg = getWorkerConfig();
  currentIntervalMs = cfg.alertCheckIntervalMs;
  console.log(`Alert checker started (interval=${currentIntervalMs}ms)`);
  watchWorkerConfig((cfg) => {
    currentIntervalMs = cfg.alertCheckIntervalMs;
    console.log(`Alert check interval updated to ${currentIntervalMs}ms`);
    scheduleNext();
  });
  scheduleNext();
}

runAlertCheck();
