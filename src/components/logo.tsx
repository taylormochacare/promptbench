import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

function BenchmarkSquares() {
  return (
    <span className="logo-ots-mark flex h-[17px] items-end gap-0.5" aria-hidden>
      <span className="logo-ots-r0 size-[9px] box-border rounded-[1px] border border-muted-foreground/55 bg-transparent origin-bottom" />
      <span className="logo-ots-r1 size-[9px] box-border rounded-[1px] border border-muted-foreground/55 bg-transparent origin-bottom" />
      <span className="logo-ots-r2 size-[9px] box-border rounded-[1px] border border-muted-foreground/55 bg-transparent origin-bottom" />
    </span>
  );
}

function OutlineWordmark() {
  return (
    <span
      className="font-heading text-[13px] font-medium leading-none tracking-[-0.03em] text-transparent"
      style={{ WebkitTextStroke: "0.85px color-mix(in oklch, var(--foreground) 72%, transparent)" }}
    >
      prompt
      <span className="text-[10px] font-normal"> / </span>
      <span className="font-semibold">bench</span>
    </span>
  );
}

function SolidPour() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 inline-flex items-baseline gap-[0.15em] font-heading text-[13px] leading-none tracking-[-0.03em] whitespace-nowrap"
    >
      <span className="logo-ots-p font-medium text-foreground opacity-0">prompt</span>
      <span className="logo-ots-s text-[10px] font-normal text-foreground opacity-0">/</span>
      <span className="logo-ots-b font-semibold text-foreground opacity-0">bench</span>
    </span>
  );
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("logo-ots inline-flex items-center gap-2.5 select-none", className)}>
      <BenchmarkSquares />
      <span className="relative inline-block">
        <OutlineWordmark />
        <SolidPour />
      </span>
    </div>
  );
}
