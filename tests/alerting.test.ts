import { getAlertHistory } from "@/lib/alerting";
import { indexLog } from "@/lib/opensearch";

describe("Alerting", () => {
  test("alerting returns empty history initially", () => {
    const history = getAlertHistory();
    expect(history).toEqual([]);
  });

  test("alert rule exists", () => {
    const { getAlertRules } = require("@/lib/alerting");
    const rules = getAlertRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].name).toBe("Login Failures");
  });
});
