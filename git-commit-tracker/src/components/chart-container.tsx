"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
}

export function ChartContainer({
  children,
  height = 400,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "w-full rounded-lg border bg-card p-4",
        className
      )}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
