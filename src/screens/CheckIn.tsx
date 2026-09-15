import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useStore } from "../lib/store";

const HARD_PLACEHOLDERS = [
  "Energy low",
  "Meeting-heavy afternoon",
  "Waiting on a reply",
  "The task I keep avoiding",
];

const PROTECT_PLACEHOLDERS = [
  "30 min of writing before lunch",
  "No Slack before 10",
  "A walk after the workshop",
  "Quiet focus time this morning",
];

function pickPlaceholder(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
          style={{
            backgroundColor: i === current
              ? "var(--anchor-accent)"
              : "var(--anchor-border)",
          }}
        />
      ))}
    </div>
  );
}

export default function CheckIn() {
  const store = useStore();
  const [step, setStep] = useState(0);
  const [commitments, setCommitments] = useState<string[]>([""]);
  const [hardThing, setHardThing] = useState("");
  const [protectedThing, setProtectedThing] = useState("");
  const [showMaxHint, setShowMaxHint] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [hardPlaceholder] = useState(() => pickPlaceholder(HARD_PLACEHOLDERS));
  const suggestedProtected = useStore((s) => s.suggestedProtectedThing);
  const [protectPlaceholder] = useState(() => suggestedProtected || pickPlaceholder(PROTECT_PLACEHOLDERS));

  const storeCommitments = useStore((s) => s.commitments);
  const carriedItems = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10);
    return storeCommitments.filter(
      (c) => c.dayKey === day && c.carryHistory.length > 0 && c.disposition === "pending"
    );
  }, [storeCommitments]);
  const [dismissedCarried, setDismissedCarried] = useState<Set<string>>(new Set());
  const [acceptedCarried, setAcceptedCarried] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (step === 0) inputRefs.current[0]?.focus();
  }, [step]);

  const filledCount = commitments.filter((c) => c.trim()).length;

  const addInput = useCallback(() => {
    if (commitments.length < 3) {
      setCommitments([...commitments, ""]);
      setTimeout(() => inputRefs.current[commitments.length]?.focus(), 50);
    } else {
      setShowMaxHint(true);
    }
  }, [commitments]);

  const handleCommitmentKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const current = commitments[idx]?.trim();
      if (!current) return;
      if (idx < commitments.length - 1) {
        inputRefs.current[idx + 1]?.focus();
      } else if (commitments.length < 3) {
        addInput();
      } else {
        setStep(1);
      }
    }
  };

  const updateCommitment = (idx: number, val: string) => {
    const next = [...commitments];
    next[idx] = val;
    setCommitments(next);
    if (showMaxHint) setShowMaxHint(false);
  };

  const acceptCarried = (c: { id: string; text: string }) => {
    setAcceptedCarried((s) => new Set(s).add(c.id));
    if (!commitments.some((t) => t === c.text)) {
      const empty = commitments.findIndex((t) => !t.trim());
      if (empty >= 0) {
        updateCommitment(empty, c.text);
      } else if (commitments.length < 3) {
        setCommitments([...commitments, c.text]);
      }
    }
  };

  const dismissCarried = (id: string) => {
    setDismissedCarried((s) => new Set(s).add(id));
  };

  const handleSubmit = () => {
    const texts = commitments.filter((c) => c.trim());
    if (texts.length === 0) return;
    store.checkIn({
      commitments: texts,
      hardThing,
      protectedThing,
    });
    store.navigate("day");
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-6 pt-12 pb-8">
      <StepDots current={step} />

      {step === 0 && (
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="font-serif text-2xl text-text-primary text-center mb-8">
            What matters most today?
          </h2>

          {carriedItems
            .filter((c) => !dismissedCarried.has(c.id) && !acceptedCarried.has(c.id))
            .map((c) => (
              <div
                key={c.id}
                className="mb-3 rounded-lg border border-border bg-surface/40 px-4 py-3 flex items-center justify-between gap-2"
              >
                <span className="text-sm text-text-secondary">
                  From yesterday: {c.text}
                  {c.carryHistory.length >= 3 && (
                    <span className="block text-xs mt-1 text-carried">
                      You've carried this a few times. Break it down or let it go?
                    </span>
                  )}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => acceptCarried(c)}
                    className="text-xs px-2 py-1 rounded-md text-accent hover:bg-accent/10 transition-colors"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => dismissCarried(c.id)}
                    className="text-xs px-2 py-1 rounded-md text-text-secondary hover:bg-border/50 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}

          <div className="space-y-3">
            {commitments.map((val, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                value={val}
                onChange={(e) => updateCommitment(idx, e.target.value)}
                onKeyDown={(e) => handleCommitmentKeyDown(idx, e)}
                placeholder={idx === 0 ? "Something that matters…" : "Another thing…"}
                className="w-full rounded-lg border border-border bg-surface/60 px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent transition-colors"
              />
            ))}
          </div>

          {filledCount > 0 && commitments.length < 3 && !showMaxHint && (
            <button
              onClick={addInput}
              className="mt-3 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              + add another
            </button>
          )}

          {showMaxHint && (
            <p className="mt-3 text-sm text-text-secondary italic">
              Which of these is the one you'd feel best about finishing?
            </p>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => filledCount > 0 && setStep(1)}
              disabled={filledCount === 0}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="font-serif text-2xl text-text-primary text-center mb-8">
            What might be hard about today?
          </h2>

          <input
            autoFocus
            value={hardThing}
            onChange={(e) => setHardThing(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setStep(2)}
            placeholder={hardPlaceholder}
            className="w-full rounded-lg border border-border bg-surface/60 px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent transition-colors"
          />

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Skip
            </button>
            <button
              onClick={() => setStep(2)}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="font-serif text-2xl text-text-primary text-center mb-8">
            What's one thing you'll protect?
          </h2>

          <input
            autoFocus
            value={protectedThing}
            onChange={(e) => setProtectedThing(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={protectPlaceholder}
            className="w-full rounded-lg border border-border bg-surface/60 px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent transition-colors"
          />

          <div className="mt-8 flex justify-between">
            <button
              onClick={handleSubmit}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white"
            >
              Start the day
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
