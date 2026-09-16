import { Client } from "@opensearch-project/opensearch";

const client = new Client({
  node: process.env.OPENSEARCH_URL || "http://localhost:9200",
  auth: {
    username: process.env.OPENSEARCH_USER || "admin",
    password: process.env.OPENSEARCH_PASSWORD || "admin",
  },
});

const LOG_MAPPINGS = {
  properties: {
    "@timestamp": { type: "date" },
    tenant: { type: "keyword" },
    source: { type: "keyword" },
    vendor: { type: "keyword" },
    product: { type: "keyword" },
    event_type: { type: "keyword" },
    event_subtype: { type: "keyword" },
    severity: { type: "integer" },
    action: { type: "keyword" },
    src_ip: { type: "ip", fields: { keyword: { type: "keyword" } } },
    src_port: { type: "integer" },
    dst_ip: { type: "ip", fields: { keyword: { type: "keyword" } } },
    dst_port: { type: "integer" },
    protocol: { type: "keyword" },
    user: { type: "keyword" },
    host: { type: "keyword" },
    process: { type: "keyword" },
    url: { type: "text", fields: { keyword: { type: "keyword", ignore_above: 512 } } },
    http_method: { type: "keyword" },
    status_code: { type: "integer" },
    rule_name: { type: "keyword" },
    rule_id: { type: "keyword" },
    cloud: {
      properties: {
        account_id: { type: "keyword" },
        region: { type: "keyword" },
        service: { type: "keyword" },
      },
    },
    raw: { type: "text" },
    _tags: { type: "keyword" },
    src_ip_geo: {
      properties: {
        country: { type: "keyword" },
        city: { type: "keyword" },
        latitude: { type: "float" },
        longitude: { type: "float" },
        timezone: { type: "keyword" },
      },
    },
    dst_ip_geo: {
      properties: {
        country: { type: "keyword" },
        city: { type: "keyword" },
        latitude: { type: "float" },
        longitude: { type: "float" },
        timezone: { type: "keyword" },
      },
    },
    src_ip_hostname: {
      properties: {
        hostname: { type: "keyword" },
        provider: { type: "keyword" },
      },
    },
    dst_ip_hostname: {
      properties: {
        hostname: { type: "keyword" },
        provider: { type: "keyword" },
      },
    },
    enriched_at: { type: "date" },
  },
};

export async function initIndexTemplate(): Promise<void> {
  const templateExists = await client.indices.existsIndexTemplate({ name: "logs-template" }).catch(() => ({ body: false }));
  if (templateExists.body) return;
  
  await client.indices.putIndexTemplate({
    name: "logs-template",
    body: {
      index_patterns: ["logs-*"],
      template: {
        mappings: LOG_MAPPINGS,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      },
    },
  });
}

export async function ensureTenantIndex(tenant: string): Promise<void> {
  await initIndexTemplate();
  const indexName = `logs-${tenant.toLowerCase()}`;
  const exists = await client.indices.exists({ index: indexName });
  if (exists.body) return;
  
  await client.indices.create({
    index: indexName,
    body: {
      mappings: LOG_MAPPINGS,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    },
  });
}

export async function indexLog(log: Record<string, unknown>): Promise<void> {
  const tenant = (log.tenant as string) || "demoA";
  await ensureTenantIndex(tenant);
  const indexName = `logs-${tenant.toLowerCase()}`;
  const body: Record<string, unknown> = {
    ...log,
    "@timestamp": log["@timestamp"] || new Date().toISOString(),
    tenant,
  };
  if (body.src_ip === "") delete body.src_ip;
  if (body.dst_ip === "") delete body.dst_ip;
  await client.index({
    index: indexName,
    body,
  });
}

type SearchClause = Record<string, unknown>;

export async function searchLogs(params: {
  query: string;
  tenant: string;
  from?: string;
  to?: string;
  source?: string;
  user?: string;
  src_ip?: string;
  severity_min?: number;
  size?: number;
  from_offset?: number;
}) {
  const indexName = `logs-${params.tenant.toLowerCase()}`;
  const mustClause: SearchClause[] = [{ term: { tenant: params.tenant } }];
  if (params.query) {
    mustClause.push({
      multi_match: {
        query: params.query,
        fields: ["raw", "user", "host", "action", "rule_name", "url"],
      },
    });
  }
  if (params.source) {
    mustClause.push({ term: { source: params.source } });
  }
  if (params.user) {
    mustClause.push({ wildcard: { user: { value: `*${params.user}*`, case_insensitive: true } } });
  }
  if (params.src_ip) {
    mustClause.push({ wildcard: { "src_ip.keyword": { value: `*${params.src_ip}*` } } });
  }
  if (params.severity_min !== undefined && !Number.isNaN(params.severity_min)) {
    mustClause.push({ range: { severity: { gte: params.severity_min } } });
  }
  const range: Record<string, Record<string, string>> = {};
  if (params.from || params.to) {
    range["@timestamp"] = {};
    if (params.from) range["@timestamp"]["gte"] = params.from;
    if (params.to) range["@timestamp"]["lte"] = params.to;
  }
  if (Object.keys(range).length > 0) mustClause.push({ range });

  const body = {
    query: { bool: { must: mustClause } },
    size: params.size ?? 20,
    from: params.from_offset ?? 0,
    sort: [{ "@timestamp": { order: "desc" } }],
  };
  return client.search({ index: indexName, body, ignore_unavailable: true });
}

export async function deleteOldLogs(days: number = 7): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  await client.deleteByQuery({
    index: "logs-*",
    body: {
      query: {
        range: {
          "@timestamp": {
            lt: cutoff.toISOString(),
          },
        },
      },
    },
  });
}

export interface UnenrichedLog {
  index: string;
  id: string;
  source: Record<string, unknown>;
}

export async function findUnenrichedLogs(size: number = 100): Promise<UnenrichedLog[]> {
  const result = await client.search({
    index: "logs-*",
    body: {
      size,
      query: {
        bool: {
          must_not: [{ exists: { field: "enriched_at" } }],
          should: [{ exists: { field: "src_ip" } }, { exists: { field: "dst_ip" } }],
          minimum_should_match: 1,
        },
      },
      sort: [{ "@timestamp": { order: "asc" } }],
    },
  });

  const hits = (result.body as { hits?: { hits?: Array<{ _index: string; _id: string; _source: Record<string, unknown> }> } })
    .hits?.hits;
  if (!Array.isArray(hits)) return [];

  return hits.map((hit) => ({ index: hit._index, id: hit._id, source: hit._source }));
}

export async function updateLogById(index: string, id: string, doc: Record<string, unknown>): Promise<void> {
  await client.update({
    index,
    id,
    body: { doc },
  });
}

export async function deleteAllLogsAndAlerts(): Promise<{ logsDeleted: number; alertsDeleted: number }> {
  const deleteAll = async (index: string): Promise<number> => {
    const exists = await client.indices.exists({ index });
    if (!exists.body) return 0;
    const result = await client.deleteByQuery({
      index,
      body: { query: { match_all: {} } },
      refresh: true,
    });
    return (result.body as { deleted?: number }).deleted ?? 0;
  };

  const [logsDeleted, alertsDeleted] = await Promise.all([
    deleteAll("logs-*"),
    deleteAll("alerts-*"),
  ]);
  return { logsDeleted, alertsDeleted };
}

export { client };
