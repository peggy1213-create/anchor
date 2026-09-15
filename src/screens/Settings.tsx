import { useState, useEffect } from "react";
import { useStore } from "../lib/store";
import { setApiKey, hasApiKey, deleteApiKey } from "../lib/ai";

export default function Settings() {
  const navigate = useStore((s) => s.navigate);
  const aiEnabled = useStore((s) => s.settings.aiEnabled);
  const setAiEnabled = useStore((s) => s.setAiEnabled);
  const deleteWeeklyReflection = useStore((s) => s.deleteWeeklyReflection);
  const weeklyReviews = useStore((s) => s.weeklyReviews);

  const [keyStored, setKeyStored] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    hasApiKey().then(setKeyStored).catch(() => setKeyStored(false));
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setAiEnabled(enabled);
    if (!enabled) {
      setMessage("");
    }
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    try {
      await setApiKey(keyInput.trim());
      setKeyStored(true);
      setKeyInput("");
      setMessage("Key saved to system keyring.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to save key.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    try {
      await deleteApiKey();
      setKeyStored(false);
      setMessage("Key removed.");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Failed to remove key.");
    }
  };

  const aiReviews = weeklyReviews.filter((r) => r.isAi);

  return (
    <div className="flex min-h-screen flex-col bg-bg px-6 pt-10 pb-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("day")}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Back
        </button>
        <h1 className="font-serif text-xl text-text-primary">Settings</h1>
        <div className="w-10" />
      </div>

      {/* AI toggle */}
      <div className="rounded-xl border border-border bg-surface/60 px-4 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Weekly AI reflection</p>
          </div>
          <button
            onClick={() => handleToggle(!aiEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              aiEnabled ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                aiEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-2 leading-relaxed">
          Anchor sends only this week's check-ins and check-outs to Anthropic
          to compose your reflection. Nothing is stored on their side and your
          data is never used for training. Turn off anytime.
        </p>
      </div>

      {/* API key section */}
      {aiEnabled && (
        <div className="rounded-xl border border-border bg-surface/60 px-4 py-4 mb-4 animate-fade-in">
          <p className="text-sm font-medium text-text-primary mb-3">Anthropic API key</p>

          {keyStored ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-done">Key stored in system keyring</p>
              <button
                onClick={handleDeleteKey}
                className="text-xs text-text-secondary hover:text-carried transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                placeholder="sk-ant-..."
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent transition-colors"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim() || saving}
                  className="text-sm px-4 py-1.5 rounded-lg bg-accent text-white disabled:opacity-40 transition-opacity"
                >
                  {saving ? "Saving…" : "Save key"}
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className="text-xs text-text-secondary mt-2 animate-fade-in">{message}</p>
          )}
        </div>
      )}

      {/* Delete reflections */}
      {aiReviews.length > 0 && (
        <div className="rounded-xl border border-border bg-surface/60 px-4 py-4 mb-4">
          <p className="text-sm font-medium text-text-primary mb-2">AI reflections</p>
          <p className="text-xs text-text-secondary mb-3">
            {aiReviews.length} AI-generated reflection{aiReviews.length !== 1 ? "s" : ""} stored.
          </p>
          {aiReviews.map((r) => (
            <div key={r.weekKey} className="flex items-center justify-between py-1">
              <span className="text-xs text-text-secondary">Week of {r.weekKey}</span>
              <button
                onClick={() => deleteWeeklyReflection(r.weekKey)}
                className="text-xs text-text-secondary hover:text-carried transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
