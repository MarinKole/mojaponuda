import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TenderSistemLogoSize = "sm" | "md" | "lg";

interface TenderSistemLogoProps {
  href?: string;
  size?: TenderSistemLogoSize;
  theme?: "light" | "dark";
  subtitle?: string;
  className?: string;
  priority?: boolean;
}

const sizeStyles: Record<
  TenderSistemLogoSize,
  {
    wrapper: string;
    icon: string;
    title: string;
    subtitle: string;
  }
> = {
  sm: {
    wrapper: "gap-2.5",
    icon: "h-9 w-9",
    title: "text-lg",
    subtitle: "text-[10px]",
  },
  md: {
    wrapper: "gap-3",
    icon: "h-12 w-12",
    title: "text-2xl",
    subtitle: "text-[11px]",
  },
  lg: {
    wrapper: "gap-4",
    icon: "h-14 w-14",
    title: "text-3xl",
    subtitle: "text-xs",
  },
};

export function TenderSistemLogo({
  href = "/",
  size = "md",
  theme = "light",
  subtitle,
  className,
  priority = false,
}: TenderSistemLogoProps) {
  const styles = sizeStyles[size];
  const isDark = theme === "dark";

  const content = (
    <>
      <span className={cn("relative block shrink-0 overflow-hidden", styles.icon)}>
        <Image
          src="/images/tendersistem-logo.png"
          alt="Tendersistem logo"
          fill
          sizes={size === "sm" ? "36px" : size === "md" ? "48px" : "56px"}
          className="object-contain"
          priority={priority}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "font-heading flex items-baseline gap-0 font-bold tracking-tight leading-none",
            styles.title,
            isDark ? "text-white" : "text-slate-900",
          )}
        >
          <span>Tender</span>
          <span className="text-[#31C5FF]">sistem</span>
          <span className={cn("font-semibold", isDark ? "text-slate-200" : "text-slate-700")}>.com</span>
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-1 font-semibold uppercase tracking-[0.18em]",
              styles.subtitle,
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </>
  );

  const classes = cn("inline-flex items-center", styles.wrapper, className);

  if (!href) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
