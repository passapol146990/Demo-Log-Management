const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  (global as any).fetch = mockFetch;
});

afterEach(() => {
  delete process.env.WEBHOOK_URL;
});

import { dispatchWebhook } from "@/lib/webhookDispatch";

const alert = { rule_name: "test", severity: 5 };

describe("dispatchWebhook", () => {
  test("rule url wins over env", async () => {
    process.env.WEBHOOK_URL = "https://env.example.com";
    await dispatchWebhook(alert, "https://rule.example.com");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://rule.example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    });
  });

  test("env is used when rule url is empty", async () => {
    process.env.WEBHOOK_URL = "https://env.example.com";
    await dispatchWebhook(alert, "");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://env.example.com", expect.anything());
  });

  test("env is used when rule url is undefined", async () => {
    process.env.WEBHOOK_URL = "https://env.example.com";
    await dispatchWebhook(alert, undefined);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://env.example.com", expect.anything());
  });

  test("fetch is not called when no url", async () => {
    await dispatchWebhook(alert);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("rejected fetch is swallowed", async () => {
    process.env.WEBHOOK_URL = "https://env.example.com";
    mockFetch.mockRejectedValueOnce(new Error("network failure"));
    await expect(dispatchWebhook(alert, undefined)).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
