import type { CurrentUser } from '../auth/auth-api';
import type { IconName } from '../../shared/components/icon/icon';

type Role = CurrentUser['role'];

export interface NavItem {
  labelKey: string;
  icon: IconName;
  path: string;
  roles: Role[];
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    labelKey: 'shell.nav.registry',
    items: [
      {
        labelKey: 'shell.nav.vehicles',
        icon: 'truck',
        path: '/vehicles',
        roles: ['BackOffice', 'Admin'],
      },
    ],
  },
  {
    labelKey: 'shell.nav.system',
    items: [{ labelKey: 'shell.nav.users', icon: 'user', path: '/users', roles: ['Admin'] }],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
