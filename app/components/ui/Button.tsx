"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/app/lib/cn";
import { spring } from "@/app/lib/motion";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive" | "soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-[0_6px_20px_-8px_var(--accent)] hover:brightness-110",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3",
  soft: "bg-accent-soft text-accent hover:brightness-110",
  ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
  danger: "text-danger hover:bg-danger/10",
  destructive: "bg-danger text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[0.7rem]",
  md: "h-10 px-4 text-sm gap-2 rounded-control",
  lg: "h-12 px-6 text-base gap-2 rounded-2xl",
};

const base =
  "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,color,filter,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-40";

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

/** A Next.js link that looks like a Button. */
export function LinkButton({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(buttonClass(variant, size), "active:scale-[0.96] transition-transform", className)} {...props} />;
}

export type ButtonProps = HTMLMotionProps<"button"> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.96 }}
      transition={spring.snappy}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
});

const iconSizes: Record<Size, string> = {
  sm: "size-8 rounded-[0.7rem] [&_svg]:size-4",
  md: "size-10 rounded-control [&_svg]:size-[18px]",
  lg: "size-12 rounded-2xl [&_svg]:size-5",
};

export type IconButtonProps = HTMLMotionProps<"button"> & { variant?: Variant; size?: Size; label: string };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", label, className, type = "button", ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center transition-[background-color,color,filter] duration-150 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        iconSizes[size],
        className,
      )}
      {...props}
    />
  );
});
