import { useState, useMemo, useCallback, useRef, useEffect, type DragEvent } from "react";
import { format, parseISO, isToday } from "date-fns";
import { useStore } from "../lib/store";
import type { Commitment, DropReason, TimeOfDay } from "../lib/types";

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
      {disposition === "dropped" && dropReason && (
        <span className="ml-1 opacity-70">
          · {DROP_OPTIONS.find((o) => o.value === dropReason)?.label}
        </span>
      )}
    </span>
  );
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

function CommitmentCard({
  commitment,
  children,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  commitment: Commitment;
  children?: Commitment[];
  isDragOver?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
}) {
  const { updateDisposition, breakDown, carryForward, updateTimeOfDay, updateCommitmentText } = useStore();
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [showBreakDown, setShowBreakDown] = useState(false);
  const [breakDownText, setBreakDownText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(commitment.text);
  const editRef = useRef<HTMLInputElement>(null);

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
    <div
      className={commitment.brokenDownFrom ? "ml-6" : ""}
      draggable={isPending && !commitment.brokenDownFrom}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        className={`rounded-xl border px-4 py-3 transition-all ${
          isDragOver
            ? "border-accent border-dashed"
            : isCarried
              ? "border-carried/40 bg-surface/40"
              : isResolved
                ? "border-border/50 bg-surface/30"
                : "border-border bg-surface/60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {isPending && !commitment.brokenDownFrom && (
            <span
              className="cursor-grab active:cursor-grabbing text-text-secondary/40 hover:text-text-secondary select-none shrink-0 pt-0.5"
              title="Drag to reorder"
            >
              ⠿
            </span>
          )}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={editRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmed = editText.trim();
                    if (trimmed) updateCommitmentText(commitment.id, trimmed);
                    setIsEditing(false);
                  }
                  if (e.key === "Escape") {
                    setEditText(commitment.text);
                    setIsEditing(false);
                  }
                }}
                onBlur={() => {
                  const trimmed = editText.trim();
                  if (trimmed) updateCommitmentText(commitment.id, trimmed);
                  setIsEditing(false);
                }}
                className="w-full bg-transparent font-sans font-medium leading-snug text-text-primary outline-none border-b border-accent pb-0.5"
              />
            ) : (
              <p
                className={`font-sans font-medium leading-snug ${
                  isDone
                    ? "line-through text-text-secondary"
                    : isDropped
                      ? "text-text-secondary"
                      : "text-text-primary"
                } ${isPending ? "cursor-text" : ""}`}
                onClick={() => {
                  if (!isPending) return;
                  setEditText(commitment.text);
                  setIsEditing(true);
                  setTimeout(() => editRef.current?.focus(), 0);
                }}
                title={isPending ? "Click to edit" : undefined}
              >
                {commitment.text}
              </p>
            )}
            {commitment.timeOfDay && isPending && (
              <button
                onClick={() => setShowTimeMenu(!showTimeMenu)}
                className="inline-block text-xs px-2 py-0.5 rounded-md mt-1 border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
              >
                {TIME_LABELS[commitment.timeOfDay]}
              </button>
            )}
            {!commitment.timeOfDay && isPending && (
              <button
                onClick={() => setShowTimeMenu(!showTimeMenu)}
                className="inline-block text-xs px-2 py-0.5 rounded-md mt-1 text-text-secondary/50 hover:text-accent transition-colors"
              >
                + when
              </button>
            )}
            {isResolved && commitment.timeOfDay && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-md mt-1 text-text-secondary/50">
                {TIME_LABELS[commitment.timeOfDay]}
              </span>
            )}
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

        {showTimeMenu && isPending && (
          <div className="mt-3 flex flex-wrap gap-1.5 animate-fade-in">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  updateTimeOfDay(commitment.id, commitment.timeOfDay === opt.value ? undefined : opt.value);
                  setShowTimeMenu(false);
                }}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  commitment.timeOfDay === opt.value
                    ? "border-accent text-accent bg-accent/10"
                    : "border-border text-text-secondary hover:border-accent hover:text-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {commitment.timeOfDay && (
              <button
                onClick={() => {
                  updateTimeOfDay(commitment.id, undefined);
                  setShowTimeMenu(false);
                }}
                className="text-xs px-2.5 py-1 rounded-md text-text-secondary hover:text-accent transition-colors"
              >
                Clear
              </button>
            )}
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

function CheckOutSummary({ dayKey }: { dayKey: string }) {
  const checkOuts = useStore((s) => s.checkOuts);
  const co = useMemo(() => checkOuts.find((c) => c.dayKey === dayKey), [checkOuts, dayKey]);
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
  const day = useStore((s) => s.viewingDay);
  const goToPrevDay = useStore((s) => s.goToPrevDay);
  const goToNextDay = useStore((s) => s.goToNextDay);
  const setViewingDay = useStore((s) => s.setViewingDay);
  const addCommitment = useStore((s) => s.addCommitment);
  const updateHardThing = useStore((s) => s.updateHardThing);
  const updateProtectedThing = useStore((s) => s.updateProtectedThing);

  const viewDate = useMemo(() => parseISO(day + "T12:00:00"), [day]);
  const isTodayView = isToday(viewDate);
  const dateStr = format(viewDate, "EEEE, d MMMM");
  const hour = new Date().getHours();

  const checkIn = useMemo(() => checkIns.find((ci) => ci.dayKey === day), [checkIns, day]);
  const checkOut = useMemo(() => checkOuts.find((co) => co.dayKey === day), [checkOuts, day]);
  const dayCommitments = useMemo(() => allCommitments.filter((c) => c.dayKey === day), [allCommitments, day]);

  const topLevel = useMemo(
    () => dayCommitments
      .filter((c) => !c.brokenDownFrom)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [dayCommitments]
  );
  const getChildren = (parentId: string) =>
    allCommitments.filter((c) => c.brokenDownFrom === parentId && c.dayKey === day);

  const { reorderCommitments } = useStore();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const newTaskRef = useRef<HTMLInputElement>(null);

  const [editingHard, setEditingHard] = useState(false);
  const [hardText, setHardText] = useState(checkIn?.hardThing ?? "");
  const hardRef = useRef<HTMLInputElement>(null);
  const [editingProtected, setEditingProtected] = useState(false);
  const [protectedText, setProtectedText] = useState(checkIn?.protectedThing ?? "");
  const protectedRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHardText(checkIn?.hardThing ?? "");
    setProtectedText(checkIn?.protectedThing ?? "");
  }, [checkIn?.hardThing, checkIn?.protectedThing]);

  const saveHard = () => {
    const trimmed = hardText.trim();
    if (trimmed !== (checkIn?.hardThing ?? "")) {
      updateHardThing(day, trimmed);
    }
    setEditingHard(false);
  };

  const saveProtected = () => {
    const trimmed = protectedText.trim();
    if (trimmed !== (checkIn?.protectedThing ?? "")) {
      updateProtectedThing(day, trimmed);
    }
    setEditingProtected(false);
  };

  const hasTasks = topLevel.length > 0;

  const handleDragStart = useCallback((idx: number, e: DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const handleDragOver = useCallback((idx: number, e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((targetIdx: number, e: DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) return;
    const newOrder = [...topLevel];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    reorderCommitments(day, newOrder.map((c) => c.id));
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, topLevel, day, reorderCommitments]);

  const handleAddTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    addCommitment(day, { text });
    setNewTaskText("");
    setTimeout(() => newTaskRef.current?.focus(), 50);
  };

  const anyTouched = dayCommitments.some((c) => c.disposition !== "pending");
  const allResolved = dayCommitments.length > 0 && dayCommitments.every((c) => c.disposition !== "pending");
  const showCheckOut = isTodayView && !checkOut && (hour >= 16 || anyTouched);

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
          <div className="flex items-center justify-center gap-3 mb-1">
            <button
              onClick={goToPrevDay}
              className="text-text-secondary hover:text-accent transition-colors text-sm"
              title="Previous day"
            >
              ‹
            </button>
            {isTodayView ? (
              <p className="text-xs text-text-secondary uppercase tracking-wider">Today</p>
            ) : (
              <button
                onClick={() => setViewingDay(format(new Date(), "yyyy-MM-dd"))}
                className="text-xs text-accent hover:text-accent/80 transition-colors uppercase tracking-wider"
              >
                Back to today
              </button>
            )}
            <button
              onClick={goToNextDay}
              className="text-text-secondary hover:text-accent transition-colors text-sm"
              title="Next day"
            >
              ›
            </button>
          </div>
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

      <div className="flex gap-3 mb-6">
        <div
          className="flex-1 rounded-xl px-4 py-3 cursor-text"
          style={{ backgroundColor: "color-mix(in srgb, var(--anchor-highlight) 15%, transparent)" }}
          onClick={() => {
            if (!editingProtected) {
              setEditingProtected(true);
              setTimeout(() => protectedRef.current?.focus(), 0);
            }
          }}
        >
          <p className="text-xs text-highlight uppercase tracking-wider mb-1">Protected</p>
          {editingProtected ? (
            <input
              ref={protectedRef}
              value={protectedText}
              onChange={(e) => setProtectedText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveProtected()}
              onBlur={saveProtected}
              placeholder="One thing you'll protect..."
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 outline-none"
            />
          ) : (
            <p className="text-sm text-text-primary">
              {checkIn?.protectedThing || <span className="text-text-secondary/50">One thing you'll protect...</span>}
            </p>
          )}
        </div>
        <div
          className="flex-1 rounded-xl border border-border px-4 py-3 cursor-text"
          onClick={() => {
            if (!editingHard) {
              setEditingHard(true);
              setTimeout(() => hardRef.current?.focus(), 0);
            }
          }}
        >
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Might be hard</p>
          {editingHard ? (
            <input
              ref={hardRef}
              value={hardText}
              onChange={(e) => setHardText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveHard()}
              onBlur={saveHard}
              placeholder="What might be hard..."
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 outline-none"
            />
          ) : (
            <p className="text-sm text-text-primary">
              {checkIn?.hardThing || <span className="text-text-secondary/50">What might be hard...</span>}
            </p>
          )}
        </div>
      </div>

      {!hasTasks && (
        <h2 className="font-serif text-xl text-text-primary text-center mb-4">
          What matters most today?
        </h2>
      )}

      <div className="space-y-3 flex-1">
        {topLevel.map((c, idx) => (
          <CommitmentCard
            key={c.id}
            commitment={c}
            children={getChildren(c.id)}
            isDragOver={dragOverIdx === idx && dragIdx !== idx}
            onDragStart={(e) => handleDragStart(idx, e)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(idx, e)}
            onDrop={(e) => handleDrop(idx, e)}
          />
        ))}

        <div className="flex items-center gap-2">
          <input
            ref={newTaskRef}
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            placeholder="+ Add a task..."
            className={`flex-1 rounded-lg border border-dashed bg-transparent px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent transition-colors ${
              hasTasks
                ? "border-border placeholder:text-text-secondary/40"
                : "border-accent/50 placeholder:text-text-secondary/60"
            }`}
          />
        </div>
      </div>

      {checkOut && (
        <div className="mt-6">
          <CheckOutSummary dayKey={day} />
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
