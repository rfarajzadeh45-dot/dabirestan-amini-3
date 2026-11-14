import { describe, expect, it } from "vitest";
import { compareStudentName } from "@/lib/fa";

const s = (full: string) => { const p = full.split(" "); return { first_name: p.slice(0, -1).join(" "), last_name: p.at(-1)! }; };
const sorted = (names: string[]) => names.map(s).sort(compareStudentName).map((x) => `${x.first_name} ${x.last_name}`);

describe("compareStudentName", () => {
  it("sorts by family name (first word) in Persian order", () => {
    expect(sorted(["خانی محمد مهدی", "بهرامی دومان", "پاکزاد علی", "آسوده خیال علی اکبر", "گودرزی رضا", "کاظمی سینا"]))
      .toEqual(["آسوده خیال علی اکبر", "بهرامی دومان", "پاکزاد علی", "خانی محمد مهدی", "کاظمی سینا", "گودرزی رضا"]);
  });
  it("same family name falls back to remaining names", () => {
    expect(sorted(["احمدی مهدی", "احمدی امیر"])).toEqual(["احمدی امیر", "احمدی مهدی"]);
  });
  it("treats Arabic ي/ك like ی/ک", () => {
    expect(compareStudentName(s("كريمي علي"), s("کریمی علی"))).toBe(0);
  });
});
