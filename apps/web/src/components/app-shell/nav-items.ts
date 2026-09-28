import { Role } from '@doksabahay/shared';
import {
  AlertTriangle,
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
    { label: 'My profile', icon: UserRound, href: '/patient/profile' },
    { label: 'Find a doctor', icon: Search, href: '/patient/doctors' },
    { label: 'Symptom checker', icon: Stethoscope, href: '/patient/find-care' },
    { label: 'Appointments', icon: CalendarDays, href: '/patient/appointments' },
    { label: 'Records', icon: FileText, href: '/patient/records' },
  ],
  [Role.DOCTOR]: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/doctor' },
    { label: 'My profile', icon: UserRound, href: '/doctor/profile' },
    { label: 'Schedule', icon: CalendarDays, href: '/doctor/schedule' },
    { label: 'Consultations', icon: Stethoscope, href: '/doctor/appointments' },
    { label: 'Patients', icon: Users, href: '/doctor/patients' },
  ],
  [Role.ADMIN]: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Doctor reviews', icon: ShieldCheck, href: '/admin/doctors' },
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Appointments', icon: CalendarDays, href: '/admin/appointments' },
    { label: 'Issues', icon: AlertTriangle, href: '/admin/appointments/issues' },
    { label: 'Catalog', icon: ClipboardList, href: '/admin/specializations' },
    { label: 'Audit log', icon: ScrollText, href: '/admin/audit' },
  ],
};
