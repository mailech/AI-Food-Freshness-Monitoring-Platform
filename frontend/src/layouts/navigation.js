/**
 * Navigation model.
 *
 * Each item declares the permission(s) or role(s) it needs. The sidebar hides
 * what the user cannot use, and `RequirePermission` blocks the route itself —
 * but the backend is the real gate.
 */
import {
  Boxes,
  ClipboardCheck,
  Flag,
  LayoutDashboard,
  PieChart,
  Package,
  RefreshCw,
  ScanLine,
  ScrollText,
  Settings,
  Snowflake,
  Table2,
  Users,
} from 'lucide-react';

export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: true },
      {
        to: '/analyze',
        label: 'Analyse Food',
        Icon: ScanLine,
        permissions: ['analysis:create'],
        highlight: true,
      },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/inventory', label: 'Inventory', Icon: Table2, permissions: ['inventory:read'] },
      { to: '/batches', label: 'Batches', Icon: Boxes, permissions: ['batch:read'] },
      { to: '/products', label: 'Products', Icon: Package, permissions: ['product:read'] },
      { to: '/rotation', label: 'Rotation', Icon: RefreshCw, permissions: ['inventory:read'] },
    ],
  },
  {
    label: 'Quality & Storage',
    items: [
      { to: '/storage', label: 'Storage', Icon: Snowflake, permissions: ['storage:read'] },
      {
        to: '/inspections',
        label: 'Inspections',
        Icon: ClipboardCheck,
        permissions: ['inspection:manage'],
      },
      { to: '/alerts', label: 'Alerts', Icon: Flag, permissions: ['alert:read'] },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/analytics', label: 'Analytics', Icon: PieChart, permissions: ['analytics:read'] },
      { to: '/reports', label: 'Reports', Icon: ScrollText, permissions: ['report:generate'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/users', label: 'Users', Icon: Users, permissions: ['user:manage'] },
      { to: '/admin/system', label: 'System', Icon: Settings, permissions: ['system:manage'] },
      { to: '/admin/audit', label: 'Audit Log', Icon: ScrollText, permissions: ['audit:read'] },
    ],
  },
];

/** Filter the nav tree down to what this user may see. */
export function visibleSections({ hasPermission, hasRole }) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.permissions && !item.permissions.every((p) => hasPermission(p))) return false;
      if (item.roles && !hasRole(...item.roles)) return false;
      return true;
    }),
  })).filter((section) => section.items.length > 0);
}
