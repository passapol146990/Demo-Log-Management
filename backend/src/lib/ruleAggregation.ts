import { client } from "@/lib/opensearch";

export interface RuleGroupCount {
  group: string;
  count: number;
}

export async function findRuleGroups(params: {
  tenant: string;
  matchField: string;
  matchValue: string;
  groupBy: string;
  windowMinutes: number;
  threshold: number;
}): Promise<RuleGroupCount[]> {
  const { tenant, matchField, matchValue, groupBy, windowMinutes, threshold } = params;
  const gte = new Date(Date.now() - windowMinutes * 60000).toISOString();
  const indexName = `logs-${tenant.toLowerCase()}`;

  const result = await client.search({
    index: indexName,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [matchField]: matchValue } },
            { range: { "@timestamp": { gte } } },
          ],
        },
      },
      aggs: {
        groups: {
          terms: {
            field: groupBy,
            size: 100,
            min_doc_count: threshold,
          },
        },
      },
    },
  });

  const buckets = result.body?.aggregations?.groups?.buckets;
  if (!Array.isArray(buckets)) return [];

  return buckets.map((bucket: { key: string; doc_count: number }) => ({
    group: bucket.key,
    count: bucket.doc_count,
  }));
}
