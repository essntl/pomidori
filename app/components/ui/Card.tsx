import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/app/lib/cn";

/** The one surface used for every panel, widget and list container. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 pt-3.5 pb-1.5", className)}>
      <div className="flex min-w-0 items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted [&_svg]:size-[15px]">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-fg sm:text-[28px]">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      <div className="mb-1 grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted [&_svg]:size-6">{icon}</div>
      <p className="font-bold text-fg">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-sans text-[11px] font-semibold text-muted">
      {children}
    </kbd>
  );
}
