"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, CloudOff, Copy, Eye, EyeOff, KeyRound, Loader2, LogOut, RefreshCw, RotateCcw, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/app/lib/storage";
import {
  confirmDeletion,
  connect,
  deleteRemote,
  disconnect,
  fetchServerInfo,
  restoreDeletion,
  savedPassphrase,
  syncNow,
  syncStatus,
  type ServerInfo,
} from "@/app/lib/sync/engine";
import { generatePassphrase, normalizePassphrase } from "@/app/lib/sync/crypto";
import { notify } from "@/app/lib/alerts";
import { cn } from "@/app/lib/cn";
import { Card, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";
import { Modal } from "../ui/Modal";

const MIN_CUSTOM_LENGTH = 16;

const COLLECTION_LABEL: Record<string, string> = {
  notes: "notes",
  "note-folders": "note folders",
  tasks: "tasks",
  "task-lists": "task lists",
  events: "events",
  habits: "habits",
  sessions: "focus sessions",
  playlists: "playlists",
};

function ago(ts: number | null) {
  if (!ts) return "not yet";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString();
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API needs HTTPS; fall back for plain-HTTP LAN installs.
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
  }
  notify({ title: "Passphrase copied", icon: "📋", tone: "success", duration: 1600 });
}

function PassphraseBox({ value, hidden = false }: { value: string; hidden?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-control border border-line bg-surface-2 py-2 pr-2 pl-3.5">
      <code className="min-w-0 flex-1 font-mono text-[15px] font-semibold tracking-wide break-all text-fg select-all">
        {hidden ? "•".repeat(Math.min(value.length, 29)) : value}
      </code>
      <Button size="sm" variant="ghost" onClick={() => copyText(value)}>
        <Copy className="size-3.5" /> Copy
      </Button>
    </div>
  );
}

/** Settings card: opt-in, end-to-end encrypted sync with a passphrase. */
export function SyncCard() {
  const status = useStore(syncStatus);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [dialog, setDialog] = useState<"create" | "join" | "delete" | null>(null);
  const [generated, setGenerated] = useState("");
  const [custom, setCustom] = useState<string | null>(null);
  const [joinPhrase, setJoinPhrase] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchServerInfo().then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, []);

  function open(kind: "create" | "join") {
    setError(null);
    setSaved(false);
    setCustom(null);
    setJoinPhrase("");
    setGenerated(generatePassphrase());
    setDialog(kind);
  }

  async function run(mode: "create" | "join") {
    const phrase = mode === "join" ? joinPhrase : (custom ?? generated);
    if (!normalizePassphrase(phrase)) return;
    setBusy(true);
    setError(null);
    try {
      const { joinedExisting } = await connect(phrase, mode);
      setDialog(null);
      notify({
        title: mode === "create" && !joinedExisting ? "Sync is on" : "Connected",
        body: joinedExisting ? "This device's data is merged with your other devices." : "Add your other devices with the same passphrase.",
        icon: "🔄",
        tone: "success",
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const passphrase = status.connected ? savedPassphrase() : null;
  const customTooShort = custom !== null && normalizePassphrase(custom).length < MIN_CUSTOM_LENGTH;

  return (
    <Card>
      <CardHeader
        title="Sync across devices"
        icon={<RefreshCw />}
        action={
          status.connected ? (
            <span className={cn("flex items-center gap-1.5 text-[12px] font-semibold", status.phase === "error" ? "text-danger" : "text-muted")}>
              {status.phase === "syncing" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Syncing…
                </>
              ) : status.phase === "offline" ? (
                <>
                  <CloudOff className="size-3.5" /> Offline
                </>
              ) : status.phase === "error" ? (
                <>
                  <AlertTriangle className="size-3.5" /> Sync failed
                </>
              ) : (
                <>
                  <Check className="size-3.5 text-success" /> Synced {ago(status.lastSync)}
                </>
              )}
            </span>
          ) : null
        }
      />
      <div className="px-4 pb-4">
        {!info && !status.connected ? (
          <p className="text-sm text-muted">Checking this server…</p>
        ) : !status.connected && !info?.enabled ? (
          <p className="text-sm text-muted">
            This server doesn&apos;t offer sync, so your data stays in this browser. Whoever runs it can turn sync on by adding the database from the ready-made Docker stack.
          </p>
        ) : !status.connected ? (
          <>
            <p className="mb-4 text-sm text-muted">
              Keep notes, tasks, events, habits, playlists and settings in step on all your devices. Your data is encrypted on this device with a passphrase only you know; the
              server can&apos;t read it. Without a passphrase, everything simply stays in this browser.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button variant="primary" onClick={() => open("create")} disabled={!info?.signups} className="w-full sm:w-auto">
                <Wand2 className="size-4" /> Set up sync
              </Button>
              <Button variant="secondary" onClick={() => open("join")} className="w-full sm:w-auto">
                <KeyRound className="size-4" /> Join sync
              </Button>
            </div>
            {!info?.signups && <p className="mt-2 text-[13px] text-muted">The owner of this server has turned off new sync passphrases. You can still connect with an existing one.</p>}
          </>
        ) : (
          <>
            {status.held.map((h) => (
              <div key={h.collection} className="mb-3 rounded-control border border-warning/40 bg-warning/10 p-3 text-[13px] text-fg-2">
                <p className="mb-2 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>
                    {h.count} {COLLECTION_LABEL[h.collection] ?? h.collection} disappeared from this device at once. To be safe, the deletion hasn&apos;t been synced to your other
                    devices.
                  </span>
                </p>
                <div className="flex flex-wrap gap-2 pl-6">
                  <Button size="sm" variant="secondary" onClick={() => restoreDeletion(h.collection)}>
                    <RotateCcw className="size-3.5" /> Restore them
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => confirmDeletion(h.collection)}>
                    <Trash2 className="size-3.5" /> Delete everywhere
                  </Button>
                </div>
              </div>
            ))}
            {status.error && status.phase === "error" && <p className="mb-3 text-[13px] text-danger">{status.error}</p>}
            {status.phase === "offline" && <p className="mb-3 text-[13px] text-muted">Can&apos;t reach the server. Changes are saved here and will sync when it&apos;s back.</p>}

            <p className="mb-2 text-sm text-muted">To add another device, open Pomidori there and use this passphrase:</p>
            {passphrase && (
              <div className="mb-4 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <PassphraseBox value={passphrase} hidden={!reveal} />
                </div>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setReveal((r) => !r)} aria-label={reveal ? "Hide passphrase" : "Show passphrase"}>
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button variant="secondary" onClick={() => syncNow()} disabled={status.phase === "syncing"} className="w-full sm:w-auto">
                <RefreshCw className={cn("size-4", status.phase === "syncing" && "animate-spin")} /> Sync now
              </Button>
              <Button
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => {
                  disconnect();
                  notify({ title: "Sync off on this device", body: "Your data stays here and on your other devices.", icon: "⏸️", tone: "info" });
                }}
              >
                <LogOut className="size-4" /> Stop syncing here
              </Button>
              <Button variant="danger" onClick={() => setDialog("delete")} className="col-span-2 w-full sm:w-auto">
                <Trash2 className="size-4" /> Delete synced copy
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Set up a new passphrase */}
      <Modal
        open={dialog === "create"}
        onClose={() => !busy && setDialog(null)}
        title="Set up sync"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => run("create")} disabled={busy || !saved || customTooShort}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Start syncing
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-fg-2">
          <p>This passphrase unlocks your data on other devices. Nobody, not even the server owner, can recover it if it&apos;s lost.</p>
          {custom === null ? (
            <>
              <PassphraseBox value={generated} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                <button type="button" className="font-semibold text-accent" onClick={() => setGenerated(generatePassphrase())}>
                  Generate another
                </button>
                <button type="button" className="font-semibold text-muted hover:text-fg" onClick={() => setCustom("")}>
                  Use my own passphrase
                </button>
              </div>
            </>
          ) : (
            <>
              <Input
                autoFocus
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={`At least ${MIN_CUSTOM_LENGTH} characters`}
              />
              <p className="text-[12px] text-muted">
                Use a long, unique phrase: anyone who guesses it can read your data.{" "}
                <button type="button" className="font-semibold text-accent" onClick={() => setCustom(null)}>
                  Use a generated one instead
                </button>
              </p>
            </>
          )}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-control bg-surface-2 p-3">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
            <span>I&apos;ve saved this passphrase somewhere safe, like a password manager.</span>
          </label>
          {busy && <p className="text-[13px] text-muted">Securing your data… this takes a few seconds.</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      </Modal>

      {/* Connect with an existing passphrase */}
      <Modal
        open={dialog === "join"}
        onClose={() => !busy && setDialog(null)}
        title="Connect this device"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => run("join")} disabled={busy || !normalizePassphrase(joinPhrase)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Connect
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-3 text-sm text-fg-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && normalizePassphrase(joinPhrase)) void run("join");
          }}
        >
          <p>Enter the passphrase from your other device. Anything already on this device is kept and added to your synced data.</p>
          <Input autoFocus type="text" autoComplete="off" spellCheck={false} value={joinPhrase} onChange={(e) => setJoinPhrase(e.target.value)} placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxxxx" />
          {busy && <p className="text-[13px] text-muted">Unlocking… this takes a few seconds.</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </form>
      </Modal>

      {/* Delete the server copy */}
      <Modal
        open={dialog === "delete"}
        onClose={() => !busy && setDialog(null)}
        title="Delete synced copy?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteRemote();
                  setDialog(null);
                  notify({ title: "Synced copy deleted", body: "Data on your devices is untouched.", icon: "🗑️", tone: "info" });
                } catch (err) {
                  notify({ title: "Couldn't delete", body: (err as Error).message, icon: "⚠️", tone: "danger" });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-2">
          This removes your encrypted data from the server and stops sync on this device. Each device keeps its own copy, but your other devices will stop syncing too.
        </p>
      </Modal>
    </Card>
  );
}
