import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyMate — Swiss Gymnasium study assistant" },
      { name: "description", content: "Prepare for your Swiss Gymnasium exams with an AI study assistant." },
      { property: "og:title", content: "StudyMate — Swiss Gymnasium study assistant" },
      { property: "og:description", content: "Prepare for your Swiss Gymnasium exams with an AI study assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
  component: () => null,
});
