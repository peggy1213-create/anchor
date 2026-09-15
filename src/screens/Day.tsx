import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "../lib/store";
import type { Commitment, DropReason } from "../lib/types";

const DROP_OPTIONS: { value: DropReason | "none"; label: string }[] = [
  { value: "not_now", label: "Not now" },
  { value: "not_mine", label: "Not mine" },
  { value: "not_worth_it", label: "Not worth it" },
  { value: "avoided", label: "Avoided" },
  { value: "none", label: "No reason" },
];

function DispositionPill({ disposition, dropReason }: { disposition: string; dropReason?: DropReason }) {
  const labels: Record<string, { text: string; color: string }> = {
    done: { text: "Done", color: "var(--anchor-done)" },
    carried: { text: "Waiting for tomorrow", color: "var(--anchor-carried)" },
    dropped: { text: "Let go", color: "var(--anchor-text-secondary)" },
    broken_down: { text: "Broken down", color: "var(--anchor-text-secondary)" },
  };
  const info = labels[disposition];
  if (!info) return null;

  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded-md mt-1"
      style={{ color: info.color, backgroundColor: `color-mix(in srgb, ${info.color} 12%, transparent)` }}
    >
      {info.text}
      {disposition === "dropped" && dropReason && dropReason !== "none" && (
        <span className="ml-1 opacity-70">
          · {DROP_OPTIONS.find((o) => o.value === dropReason)?.label}
        </span>
      )}
    </span>
  );
}

function CommitmentCard({
  commitment,
  children,
}: {
  commitment: Commitment;
  children?: Commitment[];
}) {
  const { updateDisposition, breakDown, carryForward } = useStore();
  const [showDrop, setShowDrop] = useState(false);
  const [showBreakDown, setShowBreakDown] = useState(false);
  const [breakDownText, setBreakDownText] = useState("");

  const isPending = commitment.disposition === "pending";
  const isDone = commitment.disposition === "done";
  const isCarried = commitment.disposition === "carried";
  const isDropped = commitment.disposition === "dropped";
  const isBrokenDown = commitment.disposition === "broken_down";
  const isResolved = !isPending;

  const handleDrop = (reason: DropReason | "none") => {
    updateDisposition(
      commitment.id,
      "dropped",
      reason === "none" ? undefined : reason
    );
    setShowDrop(false);
  };

  const handleBreakDown = () => {
    if (!breakDownText.trim()) return;
    breakDown(commitment.id, breakDownText.trim());
    setShowBreakDown(false);
    setBreakDownText("");
  };

  return (
    <div className={commitment.brokenDownFrom ? "ml-6" : ""}>
      <div
        className={`rounded-xl border px-4 py-3 transition-all ${
          isCarried
            ? "border-carried/40 bg-surface/40"
            : isResolved
              ? "border-border/50 bg-surface/30"
              : "border-border bg-surface/60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className={`font-sans font-medium leading-snug ${
                isDone
                  ? "line-through text-text-secondary"
                  : isDropped
                    ? "text-text-secondary"
                    : "text-text-primary"
              }`}
            >
              {commitment.text}
            </p>
            {isResolved && (
              <DispositionPill disposition={commitment.disposition} dropReason={commitment.dropReason} />
            )}
            {isCarried && (
              <p className="text-xs text-carried mt-1">Waiting for tomorrow</p>
            )}
          </div>

          {isPending && (
            <div className="flex gap-1 shrink-0 pt-0.5">
              <IconButton
                title="Done"
                onClick={() => updateDisposition(commitment.id, "done")}
              >
                ✓
              </IconButton>
              <IconButton
                title="Save for tomorrow"
                onClick={() => carryForward(commitment.id)}
              >
                ↷
              </IconButton>
              <IconButton
                title="Break it down"
                onClick={() => setShowBreakDown(!showBreakDown)}
              >
                ⤓
              </IconButton>
              <IconButton
                title="Let this one go"
                onClick={() => setShowDrop(!showDrop)}
              >
                ✕
              </IconButton>
            </div>
          )}
        </div>

        {showDrop && (
          <div className="mt-3 flex flex-wrap gap-1.5 animate-fade-in">
            <span className="text-xs text-text-secondary mr-1 self-center">Why?</span>
            {DROP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDrop(opt.value)}
                className="text-xs px-2.5 py-1 rounded-md border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {showBreakDown && (
          <div className="mt-3 animate-fade-in">
            <input
              autoFocus
              value={breakDownText}
              onChange={(e) => setBreakDownText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBreakDown()}
              placeholder="What's the smallest next step?"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent transition-colors"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowBreakDown(false)}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBreakDown}
                disabled={!breakDownText.trim()}
                className="text-xs px-3 py-1 rounded-md bg-accent text-white disabled:opacity-40 transition-opacity"
              >
                Break down
              </button>
            </div>
          </div>
        )}
      </div>

      {isBrokenDown && children && children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <CommitmentCard key={child.id} commitment={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors text-sm"
    >
      {children}
    </button>
  );
}

function CheckOutSummary() {
  const checkOuts = useStore((s) => s.checkOuts);
  const day = format(new Date(), "yyyy-MM-dd");
  const co = useMemo(() => checkOuts.find((c) => c.dayKey === day), [checkOuts, day]);
  if (!co) return null;

  return (
    <div className="rounded-xl border border-border bg-surface/40 px-4 py-4 animate-fade-in">
      <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">Evening reflection</p>
      <p className="text-sm text-text-primary">{co.tookYourDay}</p>
      <p className="mt-2 font-serif text-lg text-accent italic">{co.oneWord}</p>
    </div>
  );
}

export default function Day() {
  const navigate = useStore((s) => s.navigate);
  const allCommitments = useStore((s) => s.commitments);
  const checkIns = useStore((s) => s.checkIns);
  const checkOuts = useStore((s) => s.checkOuts);

  const day = format(new Date(), "yyyy-MM-dd");
  const dateStr = format(new Date(), "EEEE, d MMMM");
  const hour = new Date().getHours();

  const checkIn = useMemo(() => checkIns.find((ci) => ci.dayKey === day), [checkIns, day]);
  const checkOut = useMemo(() => checkOuts.find((co) => co.dayKey === day), [checkOuts, day]);
  const todayCommitments = useMemo(() => allCommitments.filter((c) => c.dayKey === day), [allCommitments, day]);

  const topLevel = todayCommitments.filter((c) => !c.brokenDownFrom);
  const getChildren = (parentId: string) =>
    allCommitments.filter((c) => c.brokenDownFrom === parentId && c.dayKey === day);

  const anyTouched = todayCommitments.some((c) => c.disposition !== "pending");
  const allResolved = todayCommitments.length > 0 && todayCommitments.every((c) => c.disposition !== "pending");
  const showCheckOut = !checkOut && (hour >= 16 || anyTouched);

  return (
    <div className="flex min-h-screen flex-col bg-bg px-6 pt-10 pb-8">
      <div className="flex items-start justify-between mb-6">
        <button
          onClick={() => navigate("weekly")}
          className="text-xs text-text-secondary hover:text-accent transition-colors pt-1"
        >
          This week
        </button>
        <div className="text-center flex-1">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Today</p>
          <h1 className="font-serif text-2xl text-text-primary">{dateStr}</h1>
        </div>
        <button
          onClick={() => navigate("settings")}
          className="text-text-secondary hover:text-accent transition-colors pt-1"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {checkIn?.protectedThing && (
        <div
          className="rounded-xl px-4 py-3 mb-4"
          style={{ backgroundColor: "color-mix(in srgb, var(--anchor-highlight) 15%, transparent)" }}
        >
          <p className="text-xs text-highlight uppercase tracking-wider mb-1">Protected today</p>
          <p className="text-sm text-text-primary">{checkIn.protectedThing}</p>
        </div>
      )}

      {checkIn?.hardThing && (
        <p className="text-sm text-text-secondary italic mb-6 text-center">
          Might be hard: {checkIn.hardThing}
        </p>
      )}

      <div className="space-y-3 flex-1">
        {topLevel.map((c) => (
          <CommitmentCard key={c.id} commitment={c} children={getChildren(c.id)} />
        ))}
      </div>

      {checkOut && (
        <div className="mt-6">
          <CheckOutSummary />
        </div>
      )}

      {showCheckOut && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate("checkout")}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
              allResolved
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-accent border border-border hover:border-accent"
            }`}
          >
            Evening check-out
          </button>
        </div>
      )}
    </div>
  );
}
