import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import type { Commit } from "@/lib/github";

export interface MetricSnapshot {
  totalCommits: number;
  prsOpened: number;
  prsMerged: number;
  linesChanged: number;
  reviewTurnaroundHours: number;
  issueCloseRate: number;
  velocity: number;
}

export interface ShareData {
  repos: string[];
  dateFrom?: string;
  dateTo?: string;
  username: string;
  commits: Commit[];
  metrics?: MetricSnapshot;
}

/**
 * Generate a shareable link by encoding the share data as base64 URL-safe string.
 * This approach avoids needing a database while still providing a unique "ID".
 * Links are valid indefinitely (at least 30 days) since data is self-contained.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { repos, dateFrom, dateTo, commits, metrics } = body as {
      repos: string[];
      dateFrom?: string;
      dateTo?: string;
      commits: Commit[];
      metrics?: MetricSnapshot;
    };

    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      return NextResponse.json(
        { error: "At least one repository is required" },
        { status: 400 }
      );
    }

    if (!commits || !Array.isArray(commits)) {
      return NextResponse.json(
        { error: "Commits data is required" },
        { status: 400 }
      );
    }

    // Create share data object
    const shareData: ShareData = {
      repos,
      username: session.user.name || "Anonymous",
      commits,
    };

    if (dateFrom) {
      shareData.dateFrom = dateFrom;
    }
    if (dateTo) {
      shareData.dateTo = dateTo;
    }
    if (metrics) {
      shareData.metrics = metrics;
    }

    // Encode the share data as base64 URL-safe string
    const shareId = Buffer.from(JSON.stringify(shareData))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return NextResponse.json({ shareId });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}

/**
 * Parse a share ID to extract the share data
 */
export async function GET(request: NextRequest) {
  const shareId = request.nextUrl.searchParams.get("id");

  if (!shareId) {
    return NextResponse.json(
      { error: "Share ID is required" },
      { status: 400 }
    );
  }

  try {
    // Decode the base64 URL-safe string
    const base64 = shareId.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(paddedBase64, "base64").toString("utf-8");
    const shareData = JSON.parse(decoded) as ShareData;

    return NextResponse.json(shareData);
  } catch {
    return NextResponse.json(
      { error: "Invalid share ID" },
      { status: 400 }
    );
  }
}
