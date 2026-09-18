/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { StudyChat } from "@/components/StudyChat";
import { AiBlockedNotice } from "@/components/app/AiFeatureGate";

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
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 empty:hidden">
        <AiBlockedNotice />
      </div>
      <StudyChat threadId={threadId} />
    </>
  );
}
