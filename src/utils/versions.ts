const VERSION_TRAIN_RE = /^v?[0-9]+\.[0-9]+\.[0-9]+-(stable|beta)$/;

/** Match a version label against a train key like `v2.0.x-stable` or `all`. */
export function matchesVersionTrain(version: string, trainKey: string): boolean {
  if (trainKey === 'all') return true;
  if (trainKey === 'other') return !VERSION_TRAIN_RE.test(version);

  const channelMatch = trainKey.match(/^(.+)-(stable|beta)$/);
  if (!channelMatch) {
    const prefix = trainKey.replace(/\.x$/, '');
    return version === prefix || version.startsWith(`${prefix}.`);
  }

  const [, prefix, channel] = channelMatch;
  const base = prefix.replace(/\.x$/, '');
  return version.endsWith(`-${channel}`) && version.startsWith(`${base}.`);
}

export function filterVersionSeries(
  labels: string[],
  series: number[][],
  trainKey: string,
): { labels: string[]; series: number[][] } {
  if (trainKey === 'all') return { labels, series };
  const idx = labels
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => matchesVersionTrain(v, trainKey))
    .map(({ i }) => i);
  return {
    labels: idx.map((i) => labels[i]),
    series: idx.map((i) => series[i]),
  };
}

export function mostCommonVersion(labels: string[], series: number[][]): string {
  if (!labels.length) return '—';
  const totals = labels.map((_, i) => series[i]?.reduce((a, b) => a + b, 0) ?? 0);
  const idx = totals.reduce((best, t, i) => (t > totals[best] ? i : best), 0);
  return labels[idx] ?? '—';
}
