/** Alim application component for study, planning, profile, or navigation workflows. */
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Button that turns the optional example content on. */
export function DemoModeButton({ className }: { className?: string }) {
  const { demoMode, setDemoMode } = useAppData();
  if (demoMode) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        setDemoMode(true);
        toast.success("Demo Mode on", {
          description: "Example content is shown. Your own data is untouched.",
        });
      }}
    >
      <Sparkles className="h-4 w-4" />
      View Demo Content
    </Button>
  );
}

/** Persistent banner shown across the app while Demo Mode is active. */
export function DemoModeBanner({ className }: { className?: string }) {
  const { demoMode, setDemoMode } = useAppData();
  if (!demoMode) return null;
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border-strong bg-surface-2 px-4 py-3",
        className,
      )}
    >
      <p className="text-[14px] text-muted-foreground">
        <span className="font-medium text-foreground">Demo Mode is on.</span> Everything shown is
        example content — your own records are hidden until you exit.
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setDemoMode(false);
          toast.success("Demo Mode off", { description: "Back to your own data." });
        }}
      >
        <X className="h-4 w-4" />
        Exit Demo Mode
      </Button>
    </div>
  );
}
