import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { format, subDays, addDays, startOfWeek } from "date-fns";
import type {
  AppState,
  Commitment,
  CheckIn,
  CheckOut,
  Disposition,
  DropReason,
  TimeOfDay,
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

interface CommitmentInput {
  text: string;
  timeOfDay?: TimeOfDay;
}

interface CheckInInput {
  commitments: CommitmentInput[];
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
  viewingDay: string;
  hydrate: () => Promise<void>;
  navigate: (route: Route) => void;
  setViewingDay: (day: string) => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;
  checkIn: (input: CheckInInput) => void;
  addCommitment: (dayKey: string, input: CommitmentInput) => void;
  updateDisposition: (
    commitmentId: string,
    disposition: Disposition,
    dropReason?: DropReason
  ) => void;
  breakDown: (commitmentId: string, firstStep: string) => void;
  checkOut: (input: CheckOutInput) => void;
  getToday: () => TodayView;
  getWeek: (anchorDate?: Date) => WeekView;
  carryForward: (commitmentId: string) => void;
  getCarriedCommitments: () => Commitment[];
  updateCommitmentText: (commitmentId: string, text: string) => void;
  reorderCommitments: (dayKey: string, orderedIds: string[]) => void;
  updateTimeOfDay: (commitmentId: string, timeOfDay: TimeOfDay | undefined) => void;
  updateHardThing: (dayKey: string, text: string) => void;
  updateProtectedThing: (dayKey: string, text: string) => void;
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
  viewingDay: todayKey(),

  hydrate: async () => {
    const state = await loadState();
    const day = format(new Date(), "yyyy-MM-dd");
    set({ ...state, _hydrated: true, route: "day", viewingDay: day });
  },

  navigate: (route) => set({ route }),

  setViewingDay: (day) => set({ viewingDay: day, route: "day" }),

  goToPrevDay: () => {
    const current = get().viewingDay;
    const prev = format(subDays(new Date(current + "T12:00:00"), 1), "yyyy-MM-dd");
    set({ viewingDay: prev, route: "day" });
  },

  goToNextDay: () => {
    const current = get().viewingDay;
    const next = format(addDays(new Date(current + "T12:00:00"), 1), "yyyy-MM-dd");
    set({ viewingDay: next, route: "day" });
  },

  checkIn: (input) => {
    const day = todayKey();
    const now = new Date().toISOString();
    const newCommitments: Commitment[] = input.commitments.map((c, i) => ({
      id: uuid(),
      text: c.text,
      createdAt: now,
      dayKey: day,
      disposition: "pending",
      carryHistory: [],
      timeOfDay: c.timeOfDay,
      order: i,
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

  addCommitment: (dayKey, input) => {
    const now = new Date().toISOString();
    set((state) => {
      const maxOrder = state.commitments
        .filter((c) => c.dayKey === dayKey)
        .reduce((max, c) => Math.max(max, c.order ?? 0), -1);
      const commitment: Commitment = {
        id: uuid(),
        text: input.text,
        createdAt: now,
        dayKey,
        disposition: "pending",
        carryHistory: [],
        timeOfDay: input.timeOfDay,
        order: maxOrder + 1,
      };
      const next = { commitments: [...state.commitments, commitment] };
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

  breakDown: (commitmentId, firstStep) => {
    const now = new Date().toISOString();
    const parent = get().commitments.find((c) => c.id === commitmentId);
    const day = parent?.dayKey ?? todayKey();
    const child: Commitment = {
      id: uuid(),
      text: firstStep,
      createdAt: now,
      dayKey: day,
      disposition: "pending",
      brokenDownFrom: commitmentId,
      carryHistory: [],
      timeOfDay: parent?.timeOfDay,
      order: (parent?.order ?? 0) + 0.5,
    };

    set((state) => {
      const commitments = state.commitments.map((c) =>
        c.id === commitmentId
          ? { ...c, disposition: "broken_down" as Disposition, firstStepNote: firstStep }
          : c
      );
      const next = { commitments: [...commitments, child] };
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

      const maxOrder = state.commitments
        .filter((c) => c.dayKey === day)
        .reduce((max, c) => Math.max(max, c.order ?? 0), -1);
      const carried: Commitment = {
        id: uuid(),
        text: original.text,
        createdAt: now,
        dayKey: day,
        disposition: "pending",
        carryHistory: [...original.carryHistory, original.dayKey],
        timeOfDay: original.timeOfDay,
        order: maxOrder + 1,
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

  updateCommitmentText: (commitmentId, text) => {
    set((state) => {
      const commitments = state.commitments.map((c) =>
        c.id === commitmentId ? { ...c, text } : c
      );
      const next = { commitments };
      saveState({ ...state, ...next });
      return next;
    });
  },

  reorderCommitments: (dayKey, orderedIds) => {
    set((state) => {
      const commitments = state.commitments.map((c) => {
        if (c.dayKey !== dayKey) return c;
        const idx = orderedIds.indexOf(c.id);
        return idx >= 0 ? { ...c, order: idx } : c;
      });
      const next = { commitments };
      saveState({ ...state, ...next });
      return next;
    });
  },

  updateTimeOfDay: (commitmentId, timeOfDay) => {
    set((state) => {
      const commitments = state.commitments.map((c) =>
        c.id === commitmentId ? { ...c, timeOfDay } : c
      );
      const next = { commitments };
      saveState({ ...state, ...next });
      return next;
    });
  },

  updateHardThing: (dayKey, text) => {
    set((state) => {
      const existing = state.checkIns.find((ci) => ci.dayKey === dayKey);
      if (existing) {
        const checkIns = state.checkIns.map((ci) =>
          ci.dayKey === dayKey ? { ...ci, hardThing: text } : ci
        );
        const next = { checkIns };
        saveState({ ...state, ...next });
        return next;
      }
      const now = new Date().toISOString();
      const checkIn: CheckIn = {
        dayKey,
        completedAt: now,
        commitments: [],
        hardThing: text,
        protectedThing: "",
      };
      const next = { checkIns: [...state.checkIns, checkIn] };
      saveState({ ...state, ...next });
      return next;
    });
  },

  updateProtectedThing: (dayKey, text) => {
    set((state) => {
      const existing = state.checkIns.find((ci) => ci.dayKey === dayKey);
      if (existing) {
        const checkIns = state.checkIns.map((ci) =>
          ci.dayKey === dayKey ? { ...ci, protectedThing: text } : ci
        );
        const next = { checkIns };
        saveState({ ...state, ...next });
        return next;
      }
      const now = new Date().toISOString();
      const checkIn: CheckIn = {
        dayKey,
        completedAt: now,
        commitments: [],
        hardThing: "",
        protectedThing: text,
      };
      const next = { checkIns: [...state.checkIns, checkIn] };
      saveState({ ...state, ...next });
      return next;
    });
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
