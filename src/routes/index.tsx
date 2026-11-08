import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سامانه مدیریت مدرسه" },
      { name: "description", content: "داشبورد مدیریت کلاس‌ها، حضور و غیاب و نمرات دانش‌آموزان" },
      { property: "og:title", content: "سامانه مدیریت مدرسه" },
      { property: "og:description", content: "داشبورد مدیریت کلاس‌ها، حضور و غیاب و نمرات دانش‌آموزان" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
