import { Link } from "@tanstack/react-router";
import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon" | "responsive";
  className?: string;
  asLink?: boolean;
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        {/* 完整Logo：图标 + 文字 */}
        <div
          className={cn(
            "flex items-center gap-2 group-data-[collapsible=icon]:hidden",
            className
          )}
        >
          <Bot className="size-5 text-primary" />
          <span className="font-bold text-lg text-primary">WBBot</span>
        </div>
        {/* 仅图标 */}
        <Bot
          className={cn(
            "size-5 text-primary hidden group-data-[collapsible=icon]:block",
            className
          )}
        />
      </>
    ) : (
      <div
        className={cn(
          "flex items-center gap-2",
          variant === "icon" && "gap-0",
          className
        )}
      >
        <Bot className="size-5 text-primary" />
        {variant === "full" && (
          <span className="font-bold text-lg text-primary">WBBot</span>
        )}
      </div>
    );

  if (!asLink) {
    return content;
  }

  return <Link to="/">{content}</Link>;
}
