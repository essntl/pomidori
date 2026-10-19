import {
  CalendarDays,
  ChartColumn,
  Flame,
  LayoutDashboard,
  Music,
  NotebookPen,
  Settings,
  SquareCheckBig,
  Timer,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; color: string; dock?: boolean };

export const NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: LayoutDashboard, color: "#64748b", dock: true },
  { href: "/focus", label: "Focus", icon: Timer, color: "#ec4899", dock: true },
  { href: "/notes", label: "Notes", icon: NotebookPen, color: "#f59e0b", dock: true },
  { href: "/tasks", label: "Tasks", icon: SquareCheckBig, color: "#10b981", dock: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, color: "#3b82f6", dock: true },
  { href: "/habits", label: "Habits", icon: Flame, color: "#f97316" },
  { href: "/stats", label: "Stats", icon: ChartColumn, color: "#8b5cf6" },
  { href: "/music", label: "Music", icon: Music, color: "#ef4444", dock: true },
  { href: "/settings", label: "Settings", icon: Settings, color: "#71717a" },
];
