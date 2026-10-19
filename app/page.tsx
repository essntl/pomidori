import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Flame, Lock, Music, NotebookPen, SquareCheckBig, Timer } from "lucide-react";

const FEATURES = [
  { icon: Timer, title: "Focus timer", text: "Pomodoro with long breaks, auto-start, presets and an accurate clock that survives reloads.", color: "#ec4899" },
  { icon: NotebookPen, title: "Block notes", text: "A Notion-style editor: slash commands, drag-to-reorder blocks, to-dos, callouts, tables, nested pages.", color: "#f59e0b" },
  { icon: SquareCheckBig, title: "Tasks", text: "Lists, priorities, subtasks and natural quick-add — “Call mom friday !high”.", color: "#10b981" },
  { icon: CalendarDays, title: "Calendar", text: "Month, week and day views with drag-to-create, repeating events and .ics import/export.", color: "#3b82f6" },
  { icon: Flame, title: "Habits & stats", text: "Daily habits with streaks, plus focus charts and a heatmap of your deep work.", color: "#f97316" },
  { icon: Music, title: "Music & ambience", text: "Queue YouTube, SoundCloud or radio streams and layer generated rain or brown noise.", color: "#8b5cf6" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-5">
        <Link href="/" className="glass flex h-11 items-center gap-2 rounded-full border border-line pr-4 pl-1.5 shadow-card">
          <Image src="/images/logo.png" alt="" width={32} height={32} className="size-8" priority />
          <span className="text-[17px] font-extrabold tracking-tight text-fg">Pomidori</span>
        </Link>
        <Link href="/app" className="flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-bold text-bg transition-transform active:scale-95">
          Open app <ArrowRight className="size-4" />
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28">
          <Image src="/images/logo.png" alt="Pomidori logo" width={112} height={112} className="mb-8 size-24 drop-shadow-xl sm:size-28" priority />
          <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-tight text-fg sm:text-6xl">
            The calm productivity suite <span className="text-accent">you own.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-2">
            Timer, notes, tasks, calendar, habits and music in one fluid interface. No accounts, no servers — everything stays in your browser.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/app"
              className="group flex h-12 items-center gap-2 rounded-2xl bg-accent px-7 font-bold text-white shadow-[0_14px_34px_-12px_var(--accent)] transition-transform hover:scale-[1.03] active:scale-95"
            >
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/essntl/pomidori"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-6 font-bold text-fg transition-colors hover:bg-surface-2"
            >
              View on GitHub
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-card border border-line bg-surface p-6 shadow-card backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1">
                <span className="mb-4 grid size-12 place-items-center rounded-2xl text-white shadow-md" style={{ background: f.color }}>
                  <f.icon className="size-6" />
                </span>
                <h3 className="mb-1.5 text-lg font-extrabold text-fg">{f.title}</h3>
                <p className="text-sm leading-relaxed text-fg-2">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-center gap-4 rounded-card border border-line bg-surface p-8 text-center shadow-card backdrop-blur-xl sm:flex-row sm:text-left">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Lock className="size-6" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-fg">Private by design</h3>
              <p className="text-sm leading-relaxed text-fg-2">
                No database and no sign-up. Your data lives in your browser&apos;s local storage, and you can export or import a backup any time from Settings.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-8 text-sm text-muted">
        <span>Built with care for Codedex and daily use.</span>
        <span>
          Made by <span className="font-bold text-fg-2">essential</span>
        </span>
      </footer>
    </div>
  );
}
