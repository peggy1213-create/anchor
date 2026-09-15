import { useState, useEffect, useMemo } from "react";
import { useStore, weekKey } from "../lib/store";
import { generateWeeklyReflection } from "../lib/ai";
import type { Commitment, CheckIn, CheckOut } from "../lib/types";

interface WeekDay {
  dayKey: string;
  checkIn?: CheckIn;
  commitments: Commitment[];
  checkOut?: CheckOut;
}

interface WeekData {
  days: WeekDay[];
}

function buildDeterministicReflection(week: WeekData): string {
  const allCommitments = week.days.flatMap((d) => d.commitments);
  const total = allCommitments.length;
  const done = allCommitments.filter((c) => c.disposition === "done").length;
  const carried = allCommitments.filter((c) => c.disposition === "carried").length;
  const dropped = allCommitments.filter((c) => c.disposition === "dropped").length;

  const topCarried = allCommitments
    .filter((c) => c.disposition === "carried")
    .sort((a, b) => b.carryHistory.length - a.carryHistory.length)[0];

  const oneWords = week.days
    .map((d) => d.checkOut?.oneWord)
    .filter((w): w is string => !!w);

  const checkedInDays = week.days.filter((d) => d.checkIn).length;

  const protectedDays = week.days.filter((d) => d.checkIn?.protectedThing).length;

  let paragraph = `This week you committed to ${total} thing${total !== 1 ? "s" : ""} and finished ${done}.`;

  if (carried > 0 || dropped > 0) {
    const parts: string[] = [];
    if (carried > 0) {
      parts.push(`carried ${carried}${topCarried ? ` ("${topCarried.text}")` : ""}`);
    }
    if (dropped > 0) {
      parts.push(`let go of ${dropped}`);
    }
    paragraph += ` You ${parts.join(" and ")}.`;
  }

  if (oneWords.length > 0) {
    paragraph += ` Your check-outs mentioned: ${oneWords.join(", ")}.`;
  }

  if (protectedDays >= 3) {
    paragraph += ` You protected something on ${protectedDays} days this week.`;
  }

  paragraph += ` You checked in ${checkedInDays} out of 7 days.`;
  paragraph += " Take what's useful from this and leave the rest.";

  return paragraph;
}

function ShimmerParagraph() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md"
          style={{
            backgroundColor: "var(--anchor-border)",
            width: i === 3 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}

export default function Weekly() {
  const navigate = useStore((s) => s.navigate);
  const aiEnabled = useStore((s) => s.settings.aiEnabled);
  const weeklyReviews = useStore((s) => s.weeklyReviews);
  const saveWeeklyReview = useStore((s) => s.saveWeeklyReview);
  const saveTryDifferently = useStore((s) => s.saveTryDifferently);
  const getWeek = useStore((s) => s.getWeek);

  const wk = weekKey();
  const week = useMemo(() => getWeek(), [getWeek]);
  const existingReview = useMemo(
    () => weeklyReviews.find((r) => r.weekKey === wk),
    [weeklyReviews, wk]
  );

  const [reflection, setReflection] = useState(existingReview?.reflection ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tryText, setTryText] = useState(existingReview?.tryDifferently ?? "");
  const [trySaved, setTrySaved] = useState(false);

  const allCommitments = week.days.flatMap((d) => d.commitments);
  const total = allCommitments.length;
  const done = allCommitments.filter((c) => c.disposition === "done").length;
  const carried = allCommitments.filter((c) => c.disposition === "carried").length;
  const dropped = allCommitments.filter((c) => c.disposition === "dropped").length;
  const checkedInDays = week.days.filter((d) => d.checkIn).length;

  const oneWords = week.days
    .map((d) => d.checkOut?.oneWord)
    .filter((w): w is string => !!w);

  const fetchReflection = async (force = false) => {
    if (!force && existingReview?.reflection) {
      setReflection(existingReview.reflection);
      return;
    }

    if (!aiEnabled) {
      const text = buildDeterministicReflection(week);
      setReflection(text);
      saveWeeklyReview({
        weekKey: wk,
        reflection: text,
        isAi: false,
        createdAt: new Date().toISOString(),
        tryDifferently: existingReview?.tryDifferently,
      });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const weekData = {
        days: week.days.map((d) => ({
          date: d.dayKey,
          checkIn: d.checkIn
            ? {
                hardThing: d.checkIn.hardThing,
                protectedThing: d.checkIn.protectedThing,
              }
            : null,
          commitments: d.commitments.map((c) => ({
            text: c.text,
            disposition: c.disposition,
            dropReason: c.dropReason,
            carryHistory: c.carryHistory,
          })),
          checkOut: d.checkOut
            ? {
                tookYourDay: d.checkOut.tookYourDay,
                oneWord: d.checkOut.oneWord,
              }
            : null,
        })),
      };

      const text = await generateWeeklyReflection(JSON.stringify(weekData, null, 2));
      setReflection(text);
      saveWeeklyReview({
        weekKey: wk,
        reflection: text,
        isAi: true,
        createdAt: new Date().toISOString(),
        tryDifferently: existingReview?.tryDifferently,
      });
    } catch (err) {
      const fallback = buildDeterministicReflection(week);
      setReflection(fallback);
      setError("The reflection didn't arrive. Here's a plain summary.");
      saveWeeklyReview({
        weekKey: wk,
        reflection: fallback,
        isAi: false,
        createdAt: new Date().toISOString(),
        tryDifferently: existingReview?.tryDifferently,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!reflection) {
      fetchReflection();
    }
  }, []);

  const handleSaveTry = () => {
    if (!tryText.trim()) return;
    saveTryDifferently(wk, tryText.trim());
    setTrySaved(true);
    setTimeout(() => setTrySaved(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg px-6 pt-10 pb-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("day")}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Back
        </button>
        <div />
      </div>

      <h1 className="font-serif text-3xl text-text-primary text-center mb-8">
        This week
      </h1>

      {/* Reflection paragraph */}
      <div className="mb-8">
        {loading ? (
          <ShimmerParagraph />
        ) : (
          <div className="animate-fade-in">
            {error && (
              <p className="text-xs text-carried mb-2 italic">{error}</p>
            )}
            <p className="font-serif text-text-primary leading-relaxed text-[0.95rem]">
              {reflection}
            </p>
            {aiEnabled && (
              <button
                onClick={() => fetchReflection(true)}
                className="mt-3 text-xs text-text-secondary hover:text-accent transition-colors"
              >
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-border bg-surface/40 px-3 py-3 text-center">
          <p className="text-xl text-text-primary font-medium">{total}</p>
          <p className="text-xs text-text-secondary mt-1">Committed</p>
          <p className="text-xl text-text-primary font-medium mt-2">{done}</p>
          <p className="text-xs text-text-secondary mt-1">Finished</p>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 px-3 py-3 text-center">
          <p className="text-xl text-text-primary font-medium">{carried}</p>
          <p className="text-xs text-text-secondary mt-1">Carried</p>
          <p className="text-xl text-text-primary font-medium mt-2">{dropped}</p>
          <p className="text-xs text-text-secondary mt-1">Let go</p>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 px-3 py-3 text-center">
          <p className="text-xl text-text-primary font-medium">{checkedInDays}/7</p>
          <p className="text-xs text-text-secondary mt-1">Days checked in</p>
        </div>
      </div>

      {/* One-words row */}
      {oneWords.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-3">
            Words for the week
          </p>
          <div className="flex flex-wrap gap-2">
            {oneWords.map((word, i) => (
              <span
                key={i}
                className={`inline-block rounded-lg border border-border px-3 py-1 text-sm font-serif italic ${
                  i === oneWords.length - 1
                    ? "text-text-primary"
                    : "text-text-secondary"
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Try differently */}
      <div className="mt-auto pt-6">
        <h2 className="font-serif text-lg text-text-primary mb-3">
          What do you want to try differently next week?
        </h2>
        <textarea
          value={tryText}
          onChange={(e) => {
            setTryText(e.target.value);
            setTrySaved(false);
          }}
          placeholder="Something small you'd like to shift…"
          rows={3}
          className="w-full rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent transition-colors resize-none"
        />
        <div className="mt-2 flex justify-end items-center gap-3">
          {trySaved && (
            <span className="text-xs text-done animate-fade-in">Saved</span>
          )}
          <button
            onClick={handleSaveTry}
            disabled={!tryText.trim()}
            className="text-sm px-4 py-1.5 rounded-lg bg-accent text-white disabled:opacity-40 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
