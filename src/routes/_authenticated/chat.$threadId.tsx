import { createFileRoute } from "@tanstack/react-router";
import { StudyChat } from "@/components/StudyChat";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: ({ params }) => ({
    meta: [
      { title: "Study session — StudyMate" },
      { name: "description", content: "Continue your exam-prep study session." },
      { property: "og:title", content: "Study session — StudyMate" },
      { property: "og:description", content: "Continue your exam-prep study session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return <StudyChat threadId={threadId} />;
}
