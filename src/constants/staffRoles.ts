export type StaffRoleLabel = 'Super Admin' | 'Admin' | 'Staff' | 'Blog User';

export const STAFF_ROLE_OPTIONS: {
  value: StaffRoleLabel;
  label: string;
  description: string;
}[] = [
  {
    value: 'Super Admin',
    label: 'Super Admin',
    description: 'Full CRM access including staff management',
  },
  {
    value: 'Admin',
    label: 'Admin',
    description: 'Full operational CRM access (no staff management)',
  },
  {
    value: 'Staff',
    label: 'Staff',
    description: 'Bookings, clients, inquiries, and daily operations',
  },
  {
    value: 'Blog User',
    label: 'Blog User',
    description: 'Blog CMS only — no bookings or CRM data',
  },
];

export function roleBadgeClass(roleDisplay: string): string {
  switch (roleDisplay) {
    case 'Super Admin':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Admin':
      return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'Blog User':
      return 'bg-[#f0faf0] text-[#2d8a2f] border-[#c8e6c9]';
    default:
      return 'bg-blue-50 text-blue-800 border-blue-200';
  }
}
