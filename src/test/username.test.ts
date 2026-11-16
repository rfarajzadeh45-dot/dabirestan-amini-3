import { describe, expect, it } from "vitest";
import { homeForRole, isValidUsername, normalizeUsername, primaryRole, usernameToEmail } from "@/lib/username";

describe("username accounts", () => {
  it("normalizes Persian digits and case", () => {
    expect(normalizeUsername(" Ali۱۲۳ ")).toBe("ali123");
  });
  it("rejects usernames with spaces or too short", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("ali reza")).toBe(false);
    expect(isValidUsername("s1001")).toBe(true);
  });
  it("maps a username to its internal sign-in address", () => {
    expect(usernameToEmail("S1001")).toBe("s1001@users.school.local");
  });
  it("sends each role to its own dashboard", () => {
    expect(homeForRole("student")).toBe("/my-report");
    expect(homeForRole("parent")).toBe("/children");
    expect(homeForRole("teacher")).toBe("/dashboard");
    expect(homeForRole("admin")).toBe("/dashboard");
  });
  it("prefers admin over other roles", () => {
    expect(primaryRole(["student", "admin"])).toBe("admin");
    expect(primaryRole([])).toBe(null);
  });
});
