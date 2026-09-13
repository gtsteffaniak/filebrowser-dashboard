import type { DashboardV1 } from '../types/dashboard-v1';

export async function loadDashboard(): Promise<DashboardV1> {
  if (import.meta.env.VITE_USE_LOCAL_DATA === 'true') {
    const res = await fetch(`${import.meta.env.BASE_URL}dashboard.json`);
    if (!res.ok) {
      throw new Error('Missing public/dashboard.json');
    }
    return res.json() as Promise<DashboardV1>;
  }

  const configRes = await fetch(`${import.meta.env.BASE_URL}config.json`);
  if (!configRes.ok) throw new Error('Failed to load config.json');
  const { dataUrl } = (await configRes.json()) as { dataUrl: string };
  const dataRes = await fetch(dataUrl);
  if (!dataRes.ok) throw new Error(`Failed to load dashboard data from ${dataUrl}`);
  return dataRes.json() as Promise<DashboardV1>;
}
