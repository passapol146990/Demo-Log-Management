const EVENT_ID_SUBTYPE: Record<number, string> = {
  4624: "login_success",
  4625: "login_failure",
  4634: "logoff",
};

export function normalizeAD(data: Record<string, unknown>): Record<string, unknown> {
  const tags = (data.tags as string[]) || [];
  const eventId = data.event_id as number | undefined;
  return {
    "@timestamp": (data["@timestamp"] as string) || new Date().toISOString(),
    tenant: (data.tenant as string) || "demoB",
    source: "ad",
    vendor: (data.vendor as string) || "Microsoft",
    product: (data.product as string) || "Active Directory",
    event_type: (data.event_type as string) || "authentication",
    event_subtype:
      (data.event_subtype as string) ||
      (eventId !== undefined ? EVENT_ID_SUBTYPE[eventId] : undefined) ||
      "login_failure",
    severity: (data.severity as number) ?? 6,
    action: (data.action as string) || "",
    src_ip: (data.src_ip as string) || "",
    src_port: (data.src_port as number) || 0,
    dst_ip: (data.dst_ip as string) || "",
    dst_port: (data.dst_port as number) || 0,
    protocol: (data.protocol as string) || "",
    user: (data.user as string) || "",
    host: (data.host as string) || "",
    process: (data.process as string) || "",
    url: (data.url as string) || "",
    http_method: "",
    status_code: 0,
    rule_name: (data.rule_name as string) || "",
    rule_id: (data.rule_id as string) || "",
    cloud: { account_id: "", region: "", service: "" },
    raw: JSON.stringify(data),
    _tags: ["ad", "auth", ...tags],
  };
}
