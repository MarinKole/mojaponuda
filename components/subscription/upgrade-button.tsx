"use client";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import { ReactNode } from "react";

interface UpgradeButtonProps {
  eventName: string;
  metadata?: Record<string, any>;
  className?: string;
  children: ReactNode;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function UpgradeButton({
  eventName,
  metadata = {},
  className,
  children,
  size = "default",
  variant = "default",
}: UpgradeButtonProps) {
  const handleClick = () => {
    trackEvent(eventName, metadata);
  };

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={className}
      onClick={handleClick}
    >
      <Link href="/dashboard/subscription">{children}</Link>
    </Button>
  );
}
