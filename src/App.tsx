import { GlassSmokeTest } from "@/components/glass-smoke-test";
import { PaneContainer } from "@/components/shell/pane-container";
import { Rail } from "@/components/shell/rail";
import { Strip } from "@/components/shell/strip";
import { useShellShortcuts } from "@/hooks/use-shortcuts";
import { useWindowChrome } from "@/hooks/use-window-chrome";

export default function App() {
  useWindowChrome();
  useShellShortcuts();

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col">
        <Strip />
        <PaneContainer />
      </div>
      <GlassSmokeTest />
    </div>
  );
}
