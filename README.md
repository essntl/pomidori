# Pomidori - A suite of productivity tools that just works.

Pomidori is a passion project to create a platform for productivity tools like Pomodoro timer, notes, to-do lists, calendar, and more.

## Features
-  **Customisable home** — drag widgets to rearrange them, drag a corner to resize, and hide the ones you don't need (press `E` or the grid button). Bigger widgets show more.
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
-  **Optional sync** — end-to-end encrypted sync between your devices with a passphrase, merged item by item. Off unless you set it up.
-  **Shortcuts** — hold `Shift` to reveal quick-delete buttons on notes, tasks, habits and songs; `Ctrl/Cmd + Z` undoes it. Press `?` for the full list.
-  Light/dark/auto theme with six accent colours.

## Your data
Everything is stored in your browser's `localStorage` by default — no accounts needed. Use **Settings → Export backup** to move your data to another device. Notes from older versions of Pomidori are migrated automatically.

### Sync across devices (optional)
On a server with sync enabled, open **Settings → Sync across devices** and set up a passphrase, then enter the same passphrase on your other devices.
- **End-to-end encrypted.** Your passphrase never leaves your device; data is encrypted in the browser and the server only stores ciphertext. Lose the passphrase and the synced copy can't be recovered (your devices keep their own copies).
- **Merges per item.** Notes, tasks, events, habits, focus sessions, playlists and settings sync item by item, so edits on different devices combine. When the same item is edited in two places, the latest edit wins. Deletions sync too, and a sudden mass deletion is held for you to confirm.
- **Works offline.** Changes are saved locally and go up the next time the server is reachable.
- Without a passphrase nothing changes: data stays in that browser only. The music queue, the running timer and ambient sound stay per device.

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
Pomidori ships as a container image on the GitHub Container Registry: `ghcr.io/essntl/pomidori` (amd64 and arm64). The ready-made stacks below include a Postgres database for optional cross-device sync; everything else stays in each user's browser.

| Variable | Default | What it does |
| --- | --- | --- |
| `DATABASE_URL` | unset | Postgres connection string. Sync is enabled when set; without it Pomidori is browser-only, as before. |
| `ALLOW_SIGNUPS` | `true` | Whether new sync passphrases can be created. Set to `false` once your devices are set up; existing passphrases keep working. |
| `POSTGRES_PASSWORD` | `pomidori` | Database password used by the stack (the database isn't exposed outside it). Set it in a `.env` file next to the compose file. |

**Docker run** (browser-only, no sync)
```bash
docker run -d --name pomidori -p 3000:3000 --restart unless-stopped ghcr.io/essntl/pomidori:latest
```

**Docker Compose** (with sync) — use the [`docker-compose.yml`](docker-compose.yml) in this repo. Don't want sync? Remove the `db` service, `depends_on` and `DATABASE_URL`.
```bash
docker compose up -d
```
Then open http://localhost:3000. To build from source instead of pulling the image, swap `image:` for `build: .` in the compose file.

**ZimaOS / CasaOS** — open the App Store, choose **Custom Install → Import**, and paste [`zimaos/docker-compose.yml`](zimaos/docker-compose.yml). Pomidori will be available on port `3456`, with sync data stored in `/DATA/AppData/pomidori/db`.

The image is built and published by [`.github/workflows/docker.yml`](.github/workflows/docker.yml) on every push to `main` and on version tags (`v1.2.3`).

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## License
This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

