interface SyslogParsed {
  priority: number;
  version: number;
  timestamp: string;
  hostname: string;
  appname: string;
  procid: string;
  msgid: string;
  message: string;
}

export function parseSyslog(raw: string): SyslogParsed | null {
  const regex = /^<(\d+)>(?:(\d+)\s)?(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/;
  const match = raw.match(regex);
  if (!match) return null;
  return {
    priority: parseInt(match[1], 10),
    version: match[2] ? parseInt(match[2], 10) : 0,
    timestamp: match[3],
    hostname: match[4],
    appname: match[5],
    procid: match[6],
    msgid: match[7],
    message: match[8],
  };
}

export function parseSyslogToNormalized(raw: string): Record<string, unknown> {
  const parsed = parseSyslog(raw);
  if (!parsed) return { raw, source: "network", severity: 5 };
  const msg = parsed.message || raw;
  const keyValuePairs: Record<string, string> = {};
  const kvRegex = /(\w+)=("([^"]*)"|(\S+))/g;
  let m;
  while ((m = kvRegex.exec(msg)) !== null) {
    keyValuePairs[m[1]] = m[3] || m[4];
  }
  return {
    "@timestamp": parsed.timestamp || new Date().toISOString(),
    tenant: "demoA",
    source: "firewall",
    vendor: "firewall",
    product: "network",
    event_type: "network",
    event_subtype: "syslog",
    severity: 5,
    action: keyValuePairs["msg"] || "",
    src_ip: keyValuePairs["src"] || "",
    src_port: keyValuePairs["sport"] ? parseInt(keyValuePairs["sport"], 10) : 0,
    dst_ip: keyValuePairs["dst"] || "",
    dst_port: keyValuePairs["dport"] ? parseInt(keyValuePairs["dport"], 10) : 0,
    protocol: keyValuePairs["proto"] || "",
    host: parsed.hostname,
    raw,
    _tags: ["firewall", "syslog"],
  };
}
