"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepoSelector } from "@/components/repo-selector";

export default function DashboardPage() {
  const [selectedRepos, setSelectedRepos] = React.useState<string[]>([]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <Card>
        <CardHeader>
          <CardTitle>Select Repositories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RepoSelector
            selectedRepos={selectedRepos}
            onSelectionChange={setSelectedRepos}
          />
          {selectedRepos.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedRepos.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Commit Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your commit timeline visualization will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
