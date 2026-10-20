# Pomidori - A suite of productivity tools that just works.

Pomidori is a passion project to create a platform for productivity tools like Pomodoro timer, notes, to-do lists, calendar, and more.

## Features
-  **Focus timer** — Pomodoro with short/long breaks, presets, auto-start, skip and +1 min, task linking, tab-title countdown, chimes and background notifications. Timestamp-based, so it stays accurate in background tabs and survives reloads.
-  **Notion-style notes** — block editor with `/` slash commands, drag handles to reorder blocks, floating format toolbar, to-dos, callouts, tables, code, nested pages, pinning, search and Markdown import/export.
-  **Tasks** — lists, priorities, due dates, subtasks, drag to reorder and natural quick-add (`Call mom friday !high #home`).
-  **Calendar** — month/week/day views, drag to create, repeating events, `.ics` import/export; shows task due dates and focus sessions.
-  **Habits** — weekly schedules, one-tap check-offs, streaks and history.
-  **Stats** — focus time per day, streaks, top tasks and a 6-month heatmap.
-  **Music** — queue YouTube videos and playlists, SoundCloud tracks/sets and direct audio or radio streams; control everything from the custom player, the control centre, the Dynamic Island or your keyboard's media keys. Save queues as playlists.
-  **Ambient sound** — rain, ocean, brown, pink and white noise generated in the browser, layered under music.
-  **Dynamic Island** — live timer and now-playing activity that expands into controls and doubles as the notification system.
-  **HyperOS-style control centre** — media card, volume sliders, quick toggles and app launcher.
-  **Command palette** — `Ctrl/Cmd + K` to navigate, search everything, add tasks, paste music links and control the timer.
-  Light/dark/auto theme with six accent colours.

## Your data
Everything is stored in your browser's `localStorage` — no database, no accounts, no server. Use **Settings → Export backup** to move your data to another device. Notes from older versions of Pomidori are migrated automatically.

## Stack
Built with Next.js, React, Tailwind CSS, Framer Motion and TipTap.

## Philosophy
Open-source, self-hostable, free forever.

## Motivation
I started this project because I'm tired of being locked into ecosystems and forced to use corporate apps. I just want to have a good-looking, lightweight tool suite. I need something that works, and if it doesn't, I can fix it myself. No subscriptions, no lack of functionality, self hostable where I have full control over my data.

## History
This started as a small project for a JavaScript course on Codedex and evolved into what it is now.

## Getting Started

### Prerequisites
- Node.js 18+ installed

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/essntl/pomidori.git
   cd pomidori
2. Install dependencies
   ```bash
   npm install

3. Run the development server
    ```bash
   npm run dev
4. Open http://localhost:3000 in your browser

## Self-hosting with Docker
Pomidori ships as a container image on the GitHub Container Registry: `ghcr.io/essntl/pomidori` (amd64 and arm64). It is stateless — every user's data stays in their own browser — so no volumes or database are needed.

**Docker run**
```bash
docker run -d --name pomidori -p 3000:3000 --restart unless-stopped ghcr.io/essntl/pomidori:latest
```

**Docker Compose** — use the [`docker-compose.yml`](docker-compose.yml) in this repo:
```bash
docker compose up -d
```
Then open http://localhost:3000. To build from source instead of pulling the image, swap `image:` for `build: .` in the compose file.

**ZimaOS / CasaOS** — open the App Store, choose **Custom Install → Import**, and paste [`zimaos/docker-compose.yml`](zimaos/docker-compose.yml). Pomidori will be available on port `3456`.

The image is built and published by [`.github/workflows/docker.yml`](.github/workflows/docker.yml) on every push to `main` and on version tags (`v1.2.3`).

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## License
This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

