import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "./lib/store";
import CheckIn from "./screens/CheckIn";
import Day from "./screens/Day";
import CheckOut from "./screens/CheckOut";
import Weekly from "./screens/Weekly";
import Settings from "./screens/Settings";

function Goodnight() {
  const navigate = useStore((s) => s.navigate);
  const checkOuts = useStore((s) => s.checkOuts);
  const day = format(new Date(), "yyyy-MM-dd");
  const co = useMemo(() => checkOuts.find((c) => c.dayKey === day), [checkOuts, day]);
  const oneWord = co?.oneWord ?? "";

  useEffect(() => {
    const timer = setTimeout(() => navigate("day"), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg animate-fade-in">
      <p className="font-serif text-3xl text-accent italic">{oneWord}</p>
    </div>
  );
}

function App() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s._hydrated);
  const route = useStore((s) => s.route);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <p className="font-serif text-xl text-text-secondary">Loading…</p>
      </div>
    );
  }

  switch (route) {
    case "checkin":
      return <CheckIn />;
    case "day":
      return <Day />;
    case "checkout":
      return <CheckOut />;
    case "goodnight":
      return <Goodnight />;
    case "weekly":
      return <Weekly />;
    case "settings":
      return <Settings />;
  }
}

export default App;
