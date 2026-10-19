import Navbar from "../components/layout/Navbar";
import Dock from "../components/layout/Dock";
import ControlCenter from "../components/layout/ControlCenter";
import CommandPalette from "../components/palette/CommandPalette";

export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 pt-3 pb-20 sm:px-5 sm:pt-5">{children}</main>
      <Dock />
      <ControlCenter />
      <CommandPalette />
    </div>
  );
}
