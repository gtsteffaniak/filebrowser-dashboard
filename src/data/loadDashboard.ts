import type { DashboardV1 } from '../types/dashboard-v1';

export const DATA_URL = 'https://api.filebrowserquantum.com/v1/dashboard/latest.json';

export async function loadDashboard(): Promise<DashboardV1> {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error(`Failed to load dashboard data (HTTP ${res.status})`);
  }
  return res.json() as Promise<DashboardV1>;
}
