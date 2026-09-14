export function formatBytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const sign = n < 0 ? '-' : '';
  let v = Math.abs(n);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const digits = i === 0 || v >= 10 ? 0 : 1;
  return `${sign}${v.toFixed(digits)} ${units[i]}`;
}

export function formatInteger(n: number): string {
  return Math.round(n).toLocaleString();
}
