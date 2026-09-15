import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { AppState } from "./types";

const DIR_NAME = "anchor";
const FILE_NAME = "state.json";

const DEFAULT_STATE: AppState = {
  commitments: [],
  checkIns: [],
  checkOuts: [],
  weeklyReviews: [],
  settings: {
    theme: "auto",
    aiEnabled: false,
  },
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function getFilePath(): Promise<string> {
  const base = await appDataDir();
  return join(base, DIR_NAME, FILE_NAME);
}

async function ensureDir(): Promise<void> {
  const base = await appDataDir();
  const dir = await join(base, DIR_NAME);
  const dirExists = await exists(dir);
  if (!dirExists) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadState(): Promise<AppState> {
  try {
    const path = await getFilePath();
    const fileExists = await exists(path);
    if (!fileExists) {
      return { ...DEFAULT_STATE };
    }
    const raw = await readTextFile(path);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      commitments: parsed.commitments ?? [],
      checkIns: parsed.checkIns ?? [],
      checkOuts: parsed.checkOuts ?? [],
      weeklyReviews: parsed.weeklyReviews ?? [],
      suggestedProtectedThing: parsed.suggestedProtectedThing,
      settings: {
        theme: parsed.settings?.theme ?? "auto",
        aiEnabled: parsed.settings?.aiEnabled ?? false,
      },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: AppState): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(async () => {
    try {
      await ensureDir();
      const path = await getFilePath();
      await writeTextFile(path, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error("Failed to save state:", err);
    }
  }, 500);
}
