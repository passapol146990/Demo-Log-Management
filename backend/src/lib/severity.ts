export function severityBadgeClass(severity: number): string {
  if (severity >= 8) return "bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30";
  if (severity >= 4) return "bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30";
  return "bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30";
}

export function severityDotClass(severity: number): string {
  if (severity >= 8) return "bg-red-500";
  if (severity >= 4) return "bg-amber-500";
  return "bg-emerald-500";
}

export function severityLabel(severity: number): string {
  if (severity >= 8) return "Critical";
  if (severity >= 4) return "Warning";
  return "Info";
}
