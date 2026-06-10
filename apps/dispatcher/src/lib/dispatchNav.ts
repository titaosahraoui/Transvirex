export type NavItem =
  | string
  | { key: string; icon: string; label: string; path?: string; tag?: string };

export const dispatchNav: NavItem[] = [
  'OPÉRATIONS',
  { key: 'miss',  icon: '📋', label: 'Missions',          path: '/board' },
  { key: 'plan',  icon: '📅', label: 'Planning',           path: '/planning' },
  { key: 'alert', icon: '⚠',  label: 'Alertes',            path: '/alerts' },
  'RÉSEAU',
  { key: 'drv',   icon: '🚐', label: 'Chauffeurs',         path: '/drivers' },
  { key: 'chat',  icon: '💬', label: 'Messagerie',          path: '/chat'    },
  'ACTIONS',
  { key: 'new',   icon: '＋', label: 'Nouvelle mission',   path: '/missions/new' },
];
