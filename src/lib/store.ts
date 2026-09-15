import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { format, subDays, startOfWeek } from "date-fns";
import type {
  AppState,
  Commitment,
  CheckIn,
  CheckOut,
  Disposition,
  DropReason,
  WeeklyReview,
} from "./types";
import { loadState, saveState } from "./storage";

export type Route = "checkin" | "day" | "checkout" | "goodnight" | "weekly" | "settings";

function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function weekKey(anchorDate?: Date): string {
  const d = anchorDate ?? new Date();
  const monday = startOfWeek(d, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

interface CheckInInput {
  commitments: string[];
  hardThing: string;
  protectedThing: string;
}

interface CheckOutInput {
  tookYourDay: string;
  oneWord: string;
}

interface TodayView {
  checkIn?: CheckIn;
  commitments: Commitment[];
  checkOut?: CheckOut;
}

interface WeekView {
  days: {
    dayKey: string;
    checkIn?: CheckIn;
    commitments: Commitment[];
    checkOut?: CheckOut;
  }[];
}

interface AppStore extends AppState {
  _hydrated: boolean;
  route: Route;
  hydrate: () => Promise<void>;
  navigate: (route: Route) => void;
  checkIn: (input: CheckInInput) => void;
  updateDisposition: (
    commitmentId: string,
    disposition: Disposition,
    dropReason?: DropReason
  ) => void;
  breakDown: (commitmentId: string, steps: string[]) => void;
  checkOut: (input: CheckOutInput) => void;
  getToday: () => TodayView;
  getWeek: (anchorDate?: Date) => WeekView;
  carryForward: (commitmentId: string) => void;
  getCarriedCommitments: () => Commitment[];
  saveWeeklyReview: (review: WeeklyReview) => void;
  deleteWeeklyReflection: (wk: string) => void;
  saveTryDifferently: (wk: string, text: string) => void;
  setAiEnabled: (enabled: boolean) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  commitments: [],
  checkIns: [],
  checkOuts: [],
  weeklyReviews: [],
  settings: {
    theme: "auto",
    aiEnabled: false,
  },
  _hydrated: false,
  route: "checkin" as Route,

  hydrate: async () => {
    const state = await loadState();
    const day = format(new Date(), "yyyy-MM-dd");
    const hasCheckIn = state.checkIns.some((ci) => ci.dayKey === day);
    set({ ...state, _hydrated: true, route: hasCheckIn ? "day" : "checkin" });
  },

  navigate: (route) => set({ route }),

  checkIn: (input) => {
    const day = todayKey();
    const now = new Date().toISOString();
    const newCommitments: Commitment[] = input.commitments.map((text) => ({
      id: uuid(),
      text,
      createdAt: now,
      dayKey: day,
      disposition: "pending",
      carryHistory: [],
    }));

    const checkIn: CheckIn = {
      dayKey: day,
      completedAt: now,
      commitments: newCommitments.map((c) => c.id),
      hardThing: input.hardThing,
      protectedThing: input.protectedThing,
    };

    set((state) => {
      const next = {
        commitments: [...state.commitments, ...newCommitments],
        checkIns: [...state.checkIns, checkIn],
      };
      saveState({ ...state, ...next });
      return next;
    });
  },

  updateDisposition: (commitmentId, disposition, dropReason) => {
    set((state) => {
      const commitments = state.commitments.map((c) =>
        c.id === commitmentId ? { ...c, disposition, dropReason } : c
      );
      const next = { commitments };
      saveState({ ...state, ...next });
      return next;
    });
  },

  breakDown: (commitmentId, steps) => {
    const day = todayKey();
    const now = new Date().toISOString();
    const children: Commitment[] = steps.map((text) => ({
      id: uuid(),
      text,
      createdAt: now,
      dayKey: day,
      disposition: "pending",
      brokenDownFrom: commitmentId,
      carryHistory: [],
    }));

    set((state) => {
      const commitments = state.commitments.map((c) =>
        c.id === commitmentId
          ? { ...c, disposition: "broken_down" as Disposition, firstStepNote: steps[0] }
          : c
      );
      const next = { commitments: [...commitments, ...children] };
      saveState({ ...state, ...next });
      return next;
    });
  },

  checkOut: (input) => {
    const day = todayKey();
    const now = new Date().toISOString();
    const checkOut: CheckOut = {
      dayKey: day,
      completedAt: now,
      tookYourDay: input.tookYourDay,
      oneWord: input.oneWord,
    };

    set((state) => {
      const next = { checkOuts: [...state.checkOuts, checkOut] };
      saveState({ ...state, ...next });
      return next;
    });
  },

  getToday: () => {
    const state = get();
    const day = todayKey();
    const checkIn = state.checkIns.find((ci) => ci.dayKey === day);
    const commitments = state.commitments.filter((c) => c.dayKey === day);
    const checkOut = state.checkOuts.find((co) => co.dayKey === day);
    return { checkIn, commitments, checkOut };
  },

  getWeek: (anchorDate?: Date) => {
    const state = get();
    const anchor = anchorDate ?? new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(anchor, i);
      const dayKey = format(date, "yyyy-MM-dd");
      days.push({
        dayKey,
        checkIn: state.checkIns.find((ci) => ci.dayKey === dayKey),
        commitments: state.commitments.filter((c) => c.dayKey === dayKey),
        checkOut: state.checkOuts.find((co) => co.dayKey === dayKey),
      });
    }
    return { days };
  },

  carryForward: (commitmentId) => {
    const day = todayKey();
    const now = new Date().toISOString();

    set((state) => {
      const original = state.commitments.find((c) => c.id === commitmentId);
      if (!original) return {};

      const carried: Commitment = {
        id: uuid(),
        text: original.text,
        createdAt: now,
        dayKey: day,
        disposition: "pending",
        carryHistory: [...original.carryHistory, original.dayKey],
      };

      const commitments = state.commitments.map((c) =>
        c.id === commitmentId
          ? { ...c, disposition: "carried" as Disposition }
          : c
      );
      const next = { commitments: [...commitments, carried] };
      saveState({ ...state, ...next });
      return next;
    });
  },

  getCarriedCommitments: () => {
    const state = get();
    const day = todayKey();
    return state.commitments.filter(
      (c) => c.dayKey === day && c.carryHistory.length > 0 && c.disposition === "pending"
    );
  },

  saveWeeklyReview: (review) => {
    set((state) => {
      const weeklyReviews = state.weeklyReviews.filter((r) => r.weekKey !== review.weekKey);
      weeklyReviews.push(review);
      const next = { weeklyReviews };
      saveState({ ...state, ...next });
      return next;
    });
  },

  deleteWeeklyReflection: (wk) => {
    set((state) => {
      const weeklyReviews = state.weeklyReviews.filter((r) => r.weekKey !== wk);
      const next = { weeklyReviews };
      saveState({ ...state, ...next });
      return next;
    });
  },

  saveTryDifferently: (wk, text) => {
    set((state) => {
      const weeklyReviews = state.weeklyReviews.map((r) =>
        r.weekKey === wk ? { ...r, tryDifferently: text } : r
      );
      const suggestedProtectedThing = text || undefined;
      const next = { weeklyReviews, suggestedProtectedThing };
      saveState({ ...state, ...next });
      return next;
    });
  },

  setAiEnabled: (enabled) => {
    set((state) => {
      const settings = { ...state.settings, aiEnabled: enabled };
      const next = { settings };
      saveState({ ...state, ...next });
      return next;
    });
  },
}));
