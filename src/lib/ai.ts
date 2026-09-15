import { invoke } from "@tauri-apps/api/core";

export async function generateWeeklyReflection(weekJson: string): Promise<string> {
  return invoke<string>("generate_weekly_reflection", { weekJson });
}

export async function setApiKey(key: string): Promise<void> {
  return invoke<void>("set_api_key", { key });
}

export async function hasApiKey(): Promise<boolean> {
  return invoke<boolean>("has_api_key");
}

export async function deleteApiKey(): Promise<void> {
  return invoke<void>("delete_api_key");
}
