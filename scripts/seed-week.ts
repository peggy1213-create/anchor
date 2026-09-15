/**
 * Seed a realistic week of data into Anchor's state file.
 * Run: npx tsx scripts/seed-week.ts
 *
 * This writes directly to the AppData state.json file.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const APPDATA = process.env.APPDATA || join(process.env.HOME || "", "AppData", "Roaming");
const DIR = join(APPDATA, "so.daodao.anchor", "anchor");
const FILE = join(DIR, "state.json");

function dayKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function iso(daysAgo: number, hour = 8): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

interface Commitment {
  id: string;
  text: string;
  createdAt: string;
  dayKey: string;
  disposition: string;
  dropReason?: string;
  brokenDownFrom?: string;
  carryHistory: string[];
  firstStepNote?: string;
}

interface CheckIn {
  dayKey: string;
  completedAt: string;
  commitments: string[];
  hardThing: string;
  protectedThing: string;
}

interface CheckOut {
  dayKey: string;
  completedAt: string;
  tookYourDay: string;
  oneWord: string;
}

const commitments: Commitment[] = [];
const checkIns: CheckIn[] = [];
const checkOuts: CheckOut[] = [];

const WEEK = [
  {
    daysAgo: 6,
    items: [
      { text: "Write project proposal", disposition: "done" },
      { text: "Review pull requests", disposition: "done" },
      { text: "Organise desk", disposition: "carried" },
    ],
    hard: "Back-to-back meetings until 3",
    protect: "Morning writing hour",
    tookDay: "Meetings and the proposal draft",
    oneWord: "scattered",
  },
  {
    daysAgo: 5,
    items: [
      { text: "Finish proposal edits", disposition: "done" },
      { text: "Organise desk", disposition: "carried", carryHistory: [dayKey(6)] },
      { text: "Read chapter 4", disposition: "dropped", dropReason: "not_now" },
    ],
    hard: "Waiting on feedback from Kai",
    protect: "Lunch away from screen",
    tookDay: "Waiting and editing",
    oneWord: "patient",
  },
  {
    daysAgo: 4,
    items: [
      { text: "Organise desk", disposition: "done", carryHistory: [dayKey(6), dayKey(5)] },
      { text: "Plan sprint goals", disposition: "done" },
    ],
    hard: "Low energy after bad sleep",
    protect: "No Slack before 10",
    tookDay: "Sprint planning took the whole afternoon",
    oneWord: "tired",
  },
  {
    daysAgo: 3,
    items: [
      { text: "Write tests for auth module", disposition: "broken_down" },
      { text: "Reply to design feedback", disposition: "done" },
      { text: "Grocery run", disposition: "dropped", dropReason: "not_mine" },
    ],
    hard: "The auth code is a mess",
    protect: "Deep work block 2-4pm",
    tookDay: "Debugging auth and the design review",
    oneWord: "focused",
  },
  {
    daysAgo: 2,
    items: [
      { text: "Write first auth test", disposition: "done", brokenDownFrom: "placeholder" },
      { text: "Send weekly update email", disposition: "done" },
    ],
    hard: "",
    protect: "Morning walk",
    tookDay: "Tests and email",
    oneWord: "steady",
  },
  {
    daysAgo: 1,
    items: [
      { text: "Prepare demo slides", disposition: "done" },
      { text: "Read chapter 4", disposition: "pending" },
      { text: "Fix CI pipeline", disposition: "carried" },
    ],
    hard: "Demo nerves",
    protect: "",
    tookDay: "Demo prep consumed everything",
    oneWord: "nervous",
  },
];

let authParentId = "";

for (const day of WEEK) {
  const dk = dayKey(day.daysAgo);
  const ids: string[] = [];

  for (const item of day.items) {
    const id = randomUUID();
    ids.push(id);

    const c: Commitment = {
      id,
      text: item.text,
      createdAt: iso(day.daysAgo, 8),
      dayKey: dk,
      disposition: item.disposition,
      carryHistory: (item as any).carryHistory || [],
    };

    if ((item as any).dropReason) {
      c.dropReason = (item as any).dropReason;
    }

    if (item.text === "Write tests for auth module" && item.disposition === "broken_down") {
      authParentId = id;
      c.firstStepNote = "Write first auth test";
    }

    if ((item as any).brokenDownFrom === "placeholder" && authParentId) {
      c.brokenDownFrom = authParentId;
    }

    commitments.push(c);
  }

  checkIns.push({
    dayKey: dk,
    completedAt: iso(day.daysAgo, 8),
    commitments: ids,
    hardThing: day.hard,
    protectedThing: day.protect,
  });

  checkOuts.push({
    dayKey: dk,
    completedAt: iso(day.daysAgo, 18),
    tookYourDay: day.tookDay,
    oneWord: day.oneWord,
  });
}

const state = {
  commitments,
  checkIns,
  checkOuts,
  weeklyReviews: [],
  settings: {
    theme: "auto",
    aiEnabled: false,
  },
};

if (!existsSync(DIR)) {
  mkdirSync(DIR, { recursive: true });
}

writeFileSync(FILE, JSON.stringify(state, null, 2), "utf-8");
console.log(`Seeded ${commitments.length} commitments across ${WEEK.length} days.`);
console.log(`Written to: ${FILE}`);
