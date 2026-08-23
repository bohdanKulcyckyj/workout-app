"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/provider";
import { useRepositories } from "@/lib/repositories";
import {
  hasLocalData,
  importLocalData,
  importMarkerKey,
} from "@/lib/import-local-data";

type State = "offer" | "running" | "done" | "failed";

// The "store" never changes; only the server/client snapshot split matters.
const noopSubscribe = () => () => {};

/**
 * Offers to copy this browser's localStorage data into the signed-in account.
 * Renders nothing unless there is data to import and this user has not been
 * through it already.
 */
export function ImportPrompt() {
  const { user } = useAuth();
  // No user on /login, so the prompt is already hidden there. The `key` resets
  // the inner state on sign-out/sign-in, rather than an effect doing it.
  if (!user) return null;
  return <Prompt key={user.id} userId={user.id} />;
}

function Prompt({ userId }: { userId: string }) {
  const { planRepository, exerciseRepository, reload } = useRepositories();
  const [state, setState] = useState<State>("offer");
  const [note, setNote] = useState("");
  const [dismissed, setDismissed] = useState(false);
  // localStorage is client-only, so it cannot be read during the server render.
  // useSyncExternalStore returns the server snapshot (false) until hydration,
  // which is exactly the "not on the server" gate needed here -- and unlike a
  // mount effect it does not setState during render.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  // Snapshotted once per mount, deliberately NOT recomputed each render: a
  // successful import writes the marker, and re-reading it here would unmount
  // the banner before the user ever sees the result.
  const [offerable] = useState(
    () =>
      typeof window !== "undefined" &&
      !localStorage.getItem(importMarkerKey(userId)) &&
      hasLocalData()
  );

  if (!mounted || !offerable || dismissed) return null;

  async function runImport() {
    setState("running");
    try {
      const result = await importLocalData(
        exerciseRepository,
        planRepository,
        userId
      );
      // Marker is UX only -- correctness comes from the upserts, so clearing
      // it and re-running stays safe.
      localStorage.setItem(importMarkerKey(userId), "true");
      setNote(
        `Imported ${count(result.exercises, "exercise", "exercises")} and ${count(result.plans, "plan", "plans")}.`
      );
      setState("done");
      // The page's hooks fetched before the import; make them refetch.
      reload();
    } catch (e) {
      // localStorage is untouched either way -- it is the only copy.
      setNote(message(e));
      setState("failed");
    }
  }

  return (
    <div
      role="status"
      className="mb-6 rounded-md border p-3 flex items-center gap-3 flex-wrap"
    >
      <p className="text-sm flex-1 min-w-40">
        {state === "done"
          ? note
          : state === "failed"
            ? `Import failed: ${note}`
            : "This browser has workout data saved locally. Import it into your account?"}
      </p>

      {state !== "done" && (
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={state === "running"}
          onClick={runImport}
        >
          {state === "running"
            ? "Importing..."
            : state === "failed"
              ? "Retry"
              : "Import"}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </Button>
    </div>
  );
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function message(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}
