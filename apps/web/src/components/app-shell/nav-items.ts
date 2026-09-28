import { Role } from '@doksabahay/shared';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ScrollText,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Omitted for features that do not exist yet; shown as "Soon". */
  href?: string;
}

/** Sidebar entries per role. Later features fill in the missing `href`s. */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  [Role.PATIENT]: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/patient' },
    { label: 'My profile', icon: UserRound, href: '/patient/onboarding' },
    { label: 'Find a doctor', icon: Search },
    { label: 'Appointments', icon: CalendarDays },
    { label: 'Records', icon: FileText },
  ],
  [Role.DOCTOR]: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/doctor' },
    { label: 'Schedule', icon: CalendarDays },
    { label: 'Consultations', icon: Stethoscope },
    { label: 'Patients', icon: Users },
  ],
  [Role.ADMIN]: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Doctor reviews', icon: ShieldCheck },
    { label: 'Users', icon: Users },
    { label: 'Catalog', icon: ClipboardList },
    { label: 'Audit log', icon: ScrollText },
  ],
};
