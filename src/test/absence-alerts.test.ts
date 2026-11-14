import { describe, expect, it } from "vitest";
import { absenceAlerts } from "@/components/absence-alerts";

const st = (id: string) => ({ id, first_name: "a", last_name: id, classes: { name: "۱" } });

describe("absenceAlerts", () => {
  it("lists only students with 3 or more absences, most first", () => {
    const rows = [
      ...Array(3).fill({ status: "absent", students: st("x") }),
      ...Array(4).fill({ status: "absent", students: st("y") }),
      ...Array(2).fill({ status: "absent", students: st("z") }),
      { status: "late", students: st("z") },
    ];
    expect(absenceAlerts(rows).map((r) => r.id)).toEqual(["y", "x"]);
  });
});
