import { useState } from "react";
import { useStore } from "../lib/store";

export default function CheckOut() {
  const store = useStore();
  const [step, setStep] = useState(0);
  const [tookYourDay, setTookYourDay] = useState("");
  const [oneWord, setOneWord] = useState("");

  const handleSubmit = () => {
    if (!oneWord.trim()) return;
    store.checkOut({ tookYourDay, oneWord: oneWord.trim() });
    store.navigate("goodnight");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      {step === 0 && (
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="font-serif text-2xl text-text-primary text-center mb-8">
            What took most of your day?
          </h2>
          <input
            autoFocus
            value={tookYourDay}
            onChange={(e) => setTookYourDay(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setStep(1)}
            placeholder="The thing that filled today…"
            className="w-full rounded-lg border border-border bg-surface/60 px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent transition-colors"
          />
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => store.navigate("day")}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(1)}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="font-serif text-2xl text-text-primary text-center mb-8">
            One word for today?
          </h2>
          <input
            autoFocus
            value={oneWord}
            onChange={(e) => setOneWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Gentle, productive, scattered…"
            className="w-full rounded-lg border border-border bg-surface/60 px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent text-center font-serif text-lg transition-colors"
          />
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(0)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!oneWord.trim()}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40 transition-opacity"
            >
              Good night
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
