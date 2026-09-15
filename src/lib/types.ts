export type Disposition =
  | "pending"
  | "done"
  | "carried"
  | "dropped"
  | "broken_down";

export type DropReason =
  | "not_now"
  | "not_mine"
  | "not_worth_it"
  | "avoided";

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface Commitment {
  id: string;
  text: string;
  createdAt: string;
  dayKey: string;
  disposition: Disposition;
  dropReason?: DropReason;
  brokenDownFrom?: string;
  carryHistory: string[];
  firstStepNote?: string;
  timeOfDay?: TimeOfDay;
  order: number;
}

export interface CheckIn {
  dayKey: string;
  completedAt: string;
  commitments: string[];
  hardThing: string;
  protectedThing: string;
}

export interface CheckOut {
  dayKey: string;
  completedAt: string;
  tookYourDay: string;
  oneWord: string;
}

export interface WeeklyReview {
  weekKey: string;
  reflection: string;
  isAi: boolean;
  createdAt: string;
  tryDifferently?: string;
}

export interface AppState {
  commitments: Commitment[];
  checkIns: CheckIn[];
  checkOuts: CheckOut[];
  weeklyReviews: WeeklyReview[];
  suggestedProtectedThing?: string;
  settings: {
    theme: "auto" | "light" | "dark";
    aiEnabled: boolean;
  };
}
