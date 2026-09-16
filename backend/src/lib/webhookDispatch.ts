export async function dispatchWebhook(
  alert: object,
  ruleWebhookUrl?: string,
): Promise<void> {
  const url =
    ruleWebhookUrl && ruleWebhookUrl.trim() !== ""
      ? ruleWebhookUrl.trim()
      : process.env.WEBHOOK_URL;

  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    });
  } catch {
  }
}
