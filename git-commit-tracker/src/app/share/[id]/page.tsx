"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineChart } from "@/components/timeline-chart";
import { VelocityMetrics } from "@/components/velocity-metrics";
import type { Commit } from "@/lib/github";
import { Loader2, User } from "lucide-react";
import Link from "next/link";

interface ShareData {
  repos: string[];
  dateFrom?: string;
  dateTo?: string;
  username: string;
  commits: Commit[];
}

/**
 * Decodes the share ID back to share data
 */
function decodeShareId(shareId: string): ShareData | null {
  try {
    // Decode the base64 URL-safe string
    const base64 = shareId.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(paddedBase64, "base64").toString("utf-8");
    return JSON.parse(decoded) as ShareData;
  } catch {
    return null;
  }
}

export default function SharePage() {
  const params = useParams();
  const shareId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [shareData, setShareData] = React.useState<ShareData | null>(null);

  React.useEffect(() => {
    if (!shareId) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    // Decode share data from the URL
    const data = decodeShareId(shareId);
    if (!data) {
      setError("Invalid or corrupted share link");
      setLoading(false);
      return;
    }

    setShareData(data);
    setLoading(false);
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="flex h-[400px] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading shared view...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error || "Failed to load shared view"}</p>
              <Link
                href="/"
                className="mt-4 inline-block text-sm text-primary hover:underline"
              >
                Go to homepage
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const dateRange = {
    from: shareData.dateFrom ? new Date(shareData.dateFrom) : undefined,
    to: shareData.dateTo ? new Date(shareData.dateTo) : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Commitline
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Shared by {shareData.username}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          {/* Info Banner */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span>
                  <strong>Repositories:</strong> {shareData.repos.join(", ")}
                </span>
                <span>
                  <strong>Period:</strong>{" "}
                  {dateRange.from || dateRange.to
                    ? `${dateRange.from?.toLocaleDateString() || "Any"} - ${dateRange.to?.toLocaleDateString() || "Any"}`
                    : "All time"}
                </span>
                <span>
                  <strong>Total commits:</strong> {shareData.commits.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Velocity Metrics */}
          <VelocityMetrics commits={shareData.commits} dateRange={dateRange} />

          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Commit Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineChart commits={shareData.commits} />
            </CardContent>
          </Card>

          {/* CTA Footer */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Want to create your own commit timeline?
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Sign in with GitHub
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
