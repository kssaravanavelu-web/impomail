import logoAsset from "@/../public/impo-mail-logo.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Brand logo that re-tints itself with the active accent color.
 * The gold artwork is desaturated then re-colored via blend layers,
 * so it always matches the user's chosen theme accent.
 */
export function BrandLogo({
  className,
  glow = true,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden isolate", className)}
      style={glow ? { boxShadow: "var(--shadow-glow)" } : undefined}
    >
      <img
        src={logoAsset.url}
        alt="ImpoMail"
        className="h-full w-full object-cover"
        style={{ filter: "grayscale(1) contrast(1.05)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--primary)", mixBlendMode: "color" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: "var(--primary)", mixBlendMode: "overlay" }}
      />
    </span>
  );
}
