"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string;
  trend: "up" | "down" | "flat";
  sparklineData: number[];
  unit: string;
  description?: string;
  /** Period-over-period delta, e.g. "+15%" or "-8%" */
  delta?: string;
}

const trendConfig = {
  up: {
    icon: ArrowUp,
    color: "text-emerald-500",
    chartStroke: "var(--chart-1)",
    chartFill: "var(--chart-1)",
    label: "Trending up",
  },
  down: {
    icon: ArrowDown,
    color: "text-red-500",
    chartStroke: "var(--chart-2)",
    chartFill: "var(--chart-2)",
    label: "Trending down",
  },
  flat: {
    icon: Minus,
    color: "text-muted-foreground",
    chartStroke: "var(--chart-4)",
    chartFill: "var(--chart-4)",
    label: "No change",
  },
} as const;

export function MetricCard({
  title,
  value,
  trend,
  sparklineData,
  unit,
  description,
  delta,
}: MetricCardProps) {
  const config = trendConfig[trend];
  const TrendIcon = config.icon;

  // Take last 30 data points and convert to chart format
  const chartData = sparklineData.slice(-30).map((v, i) => ({ i, v }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn("gap-0.5", config.color)}
              >
                <TrendIcon className="size-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{config.label}</TooltipContent>
          </Tooltip>
          {delta && (
            <span
              className={cn(
                "text-xs font-medium",
                delta.startsWith("+") ? "text-emerald-500" : delta.startsWith("-") ? "text-red-500" : "text-muted-foreground"
              )}
            >
              {delta} vs prev
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        {chartData.length > 1 && (
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={config.chartFill} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={config.chartFill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={config.chartStroke}
                  strokeWidth={1.5}
                  fill={`url(#fill-${title})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
