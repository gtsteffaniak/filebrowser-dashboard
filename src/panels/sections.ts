export const SECTION_ORDER = [
  'how-it-runs',
  'versions',
  'features',
  'users-sharing',
  'sources',
] as const;

export type DashboardSection = (typeof SECTION_ORDER)[number];

export const SECTION_TITLES: Record<DashboardSection, string> = {
  'how-it-runs': 'How FileBrowser Quantum runs',
  versions: 'Versions',
  features: 'Features',
  'users-sharing': 'Users, Access, and Sharing',
  sources: 'Sources',
};
