import { describe, it, expect } from "vitest";
import { GitHubRateLimitError } from "../github";

describe("GitHubRateLimitError", () => {
  it("computes minutesUntilReset from a future timestamp", () => {
    const futureSeconds = Math.floor(Date.now() / 1000) + 600; // 10 min from now
    const err = new GitHubRateLimitError(futureSeconds);

    expect(err.name).toBe("GitHubRateLimitError");
    expect(err.minutesUntilReset).toBeGreaterThanOrEqual(9);
    expect(err.minutesUntilReset).toBeLessThanOrEqual(11);
    expect(err.resetTime).toBeInstanceOf(Date);
  });

  it("floors to 1 minute when reset is in the past", () => {
    const pastSeconds = Math.floor(Date.now() / 1000) - 60;
    const err = new GitHubRateLimitError(pastSeconds);

    expect(err.minutesUntilReset).toBe(1);
  });

  it("includes minutes in the message", () => {
    const futureSeconds = Math.floor(Date.now() / 1000) + 300; // 5 min
    const err = new GitHubRateLimitError(futureSeconds);

    expect(err.message).toMatch(/Try again in \d+ minutes?\./);
  });
});
