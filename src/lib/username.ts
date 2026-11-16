// Usernames are the only sign-in identifier. The auth backend needs an email
// internally, so each username maps to a fixed, never-mailed internal address.
export const USERNAME_DOMAIN = "users.school.local";

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const arDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arDigits.indexOf(d)));
}

export function isValidUsername(u: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(u);
}

export function usernameToEmail(raw: string): string {
  return `${normalizeUsername(raw)}@${USERNAME_DOMAIN}`;
}

export type AppRole = "admin" | "teacher" | "student" | "parent";

export const roleLabel: Record<AppRole, string> = {
  student: "دانش‌آموز",
  parent: "والدین",
  teacher: "معلم",
  admin: "مدیر مدرسه",
};

/** Where each role lands after sign-in. */
export function homeForRole(role: AppRole | null): "/dashboard" | "/my-report" | "/children" {
  if (role === "student") return "/my-report";
  if (role === "parent") return "/children";
  return "/dashboard";
}

/** Highest-privilege role wins when an account has several. */
export function primaryRole(roles: string[]): AppRole | null {
  for (const r of ["admin", "teacher", "parent", "student"] as const) if (roles.includes(r)) return r;
  return null;
}
