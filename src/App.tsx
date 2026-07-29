import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useWindowChrome } from "@/hooks/use-window-chrome";

export default function App() {
  useWindowChrome();

  return (
    <div className="flex min-h-svh flex-col bg-background/40 text-foreground">
      <header
        className="sticky top-0 z-10 select-none border-b border-border/40 bg-background/35 pl-[72px] backdrop-blur-md"
        data-tauri-drag-region="deep"
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div data-tauri-drag-region="false">
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-muted/55 px-6 py-16 backdrop-blur-sm sm:px-10">
          <p className="text-center font-heading text-2xl font-medium tracking-tight sm:text-3xl">
            Hello World
          </p>
        </div>
      </main>
    </div>
  );
}
