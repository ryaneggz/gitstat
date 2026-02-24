"use client";

import { signIn } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <Alert className="border-blue-500/50 bg-blue-500/10">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          You&apos;re viewing sample data.{" "}
          <span className="hidden sm:inline">
            Sign in with GitHub to see your own stats.
          </span>
        </span>
        <Button
          size="sm"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        >
          Sign in with GitHub
        </Button>
      </AlertDescription>
    </Alert>
  );
}
