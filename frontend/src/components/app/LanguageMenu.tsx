/** Compact flag dropdown that switches the whole application language. */
import { LANGUAGES } from "@/lib/i18n/languages";
import { useI18n } from "@/lib/i18n/provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageMenu({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  const active = LANGUAGES.find((entry) => entry.code === language) ?? LANGUAGES[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("common.language.menuLabel")}
          title={t("common.language.menuLabel")}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-[17px] leading-none transition-colors hover:bg-hover",
            className,
          )}
        >
          <span aria-hidden="true">{active.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("common.language.menuLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((entry) => (
          <DropdownMenuItem
            key={entry.code}
            onSelect={() => setLanguage(entry.code)}
            className={cn(entry.code === language && "bg-thread-active")}
          >
            <span aria-hidden="true" className="text-[16px]">
              {entry.flag}
            </span>
            <span>{entry.nativeName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
