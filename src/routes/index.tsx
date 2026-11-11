import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
