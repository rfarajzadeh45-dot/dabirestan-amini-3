import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SolarDatePicker } from "@/components/solar-date-picker";
import { jalali, toISODate, shiftDate } from "@/lib/fa";

afterEach(cleanup);

describe("Solar dates", () => {
  it("converts Nowruz to solar year 1405 without changing the stored date", () => {
    expect(jalali("2026-03-21")).toBe("۱۴۰۵/۰۱/۰۱");
    expect(toISODate(new Date(2026, 2, 21))).toBe("2026-03-21");
    expect(jalali(shiftDate("2026-03-21", -1))).toBe("۱۴۰۴/۱۲/۲۹");
  });

  it("returns Gregorian ISO for a selected solar-calendar day", () => {
    const onChange = vi.fn();
    render(<SolarDatePicker value="2026-03-21" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "تاریخ" }));
    const day = screen.getAllByRole("button").find((button) =>
      button.getAttribute("data-day") === "۱۴۰۵/۱/۲");
    expect(day).toBeDefined();
    if (!day) throw new Error("Solar day not found");
    fireEvent.click(day);
    expect(onChange).toHaveBeenCalledWith("2026-03-22");
  });

  it("prevents selecting attendance dates after the maximum date", () => {
    const onChange = vi.fn();
    render(<SolarDatePicker value="2026-03-21" max="2026-03-21" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "تاریخ" }));
    const day = screen.getAllByRole("button").find((button) =>
      button.getAttribute("data-day") === "۱۴۰۵/۱/۲");
    expect(day).toBeDefined();
    if (!day) throw new Error("Solar day not found");
    expect(day).toBeDisabled();
    fireEvent.click(day);
    expect(onChange).not.toHaveBeenCalled();
  });
});