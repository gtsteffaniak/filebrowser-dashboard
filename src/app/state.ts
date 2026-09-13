import type { DashboardV1, WindowKey } from '../types/dashboard-v1';
import type { Theme } from '../theme/theme';

export interface AppState {
  data: DashboardV1 | null;
  window: WindowKey;
  theme: Theme;
  versionFilter: string;
  expandedPanelId: string | null;
  loading: boolean;
  error: string | null;
}

export function createInitialState(theme: Theme): AppState {
  return {
    data: null,
    window: '90d',
    theme,
    versionFilter: 'all',
    expandedPanelId: null,
    loading: true,
    error: null,
  };
}
