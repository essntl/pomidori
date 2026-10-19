import { STORAGE_PREFIX, flushStores, reloadAllStores } from "./storage";

/** Download any text as a file. */
export function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Open a file picker and resolve with the chosen file's text. */
export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ name: file.name, text: await file.text() });
    };
    input.click();
  });
}

export function exportAll() {
  flushStores();
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith(STORAGE_PREFIX)) data[key] = localStorage.getItem(key)!;
  }
  const payload = { app: "pomidori", exportedAt: new Date().toISOString(), data };
  downloadText(`pomidori-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function importAll(text: string) {
  const payload = JSON.parse(text) as { app?: string; data?: Record<string, string> };
  if (payload.app !== "pomidori" || !payload.data) throw new Error("This file is not a Pomidori backup.");
  flushStores();
  for (const [key, value] of Object.entries(payload.data)) {
    if (key.startsWith(STORAGE_PREFIX) && typeof value === "string") localStorage.setItem(key, value);
  }
  reloadAllStores();
}

export function resetAll() {
  flushStores();
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  // Stop the legacy notes from being re-imported after a reset.
  localStorage.removeItem("notes");
  localStorage.removeItem("darkMode");
  reloadAllStores();
}
