import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { AppAction, AppState } from "../modes";
import { readRoute, routeUrl, type ContextStep } from "./routes";

// URLs describe screens, never serialized calibration or camera/session state.
export function useBrowserRoutes(
  state: AppState,
  send: (action: AppAction) => AppState,
  suspended = false,
) {
  const base = import.meta.env.BASE_URL;
  const [contextStep, setContextStep] = useState<ContextStep>(
    () => readRoute(window.location.pathname, base).contextStep,
  );
  const first = useRef(true);
  const [historyOwner] = useState(() => crypto.randomUUID());
  const historyIndex = useRef(0);
  const previousMode = useRef(state.mode);
  const step = useRef(contextStep);
  const mode = useRef(state.mode);
  useLayoutEffect(() => {
    if (suspended) return;
    const onPop = (event: PopStateEvent) => {
      historyIndex.current = event.state?.dungeonMaster?.owner === historyOwner
        ? event.state.dungeonMaster.index
        : 0;
      const route = readRoute(window.location.pathname, base);
      const next = send({ type: "NAVIGATE", mode: route.mode });
      step.current = route.contextStep;
      setContextStep(route.contextStep);
      mode.current = next.mode;
      // Normalize protected/unknown routes in place, retaining the forward stack.
      window.history.replaceState(
        window.history.state,
        "",
        routeUrl(next.mode, route.contextStep, base, window.location.search),
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [base, historyOwner, send, suspended]);
  useLayoutEffect(() => {
    if (suspended) return;
    // A normal return to context opens intake; browser history restores its step.
    if (
      state.mode === "PROFILE" &&
      previousMode.current !== "PROFILE" &&
      mode.current !== "PROFILE"
    ) {
      step.current = "intake";
      setContextStep("intake");
    } else {
      step.current = contextStep;
    }
    mode.current = state.mode;
    const url = routeUrl(
      state.mode,
      step.current,
      base,
      window.location.search,
    );
    if (first.current || window.location.pathname + window.location.search !== url) {
      // Frame-driven readiness/countdown and pause updates must not fill history.
      const automatic =
        ["COUNTDOWN", "WORKOUT", "PAUSED", "REST", "NEXT_SET", "RESULTS"].includes(state.mode) &&
        ["CALIBRATION", "COUNTDOWN", "WORKOUT", "PAUSED", "REST", "NEXT_SET"].includes(
          previousMode.current,
        );
      const replace = first.current || automatic;
      if (!replace) historyIndex.current += 1;
      const entry = {
        ...window.history.state,
        dungeonMaster: { owner: historyOwner, index: historyIndex.current },
      };
      if (replace) window.history.replaceState(entry, "", url);
      else window.history.pushState(entry, "", url);
    }
    first.current = false;
    previousMode.current = state.mode;
  }, [base, contextStep, historyOwner, state.mode, suspended]);
  const goBack = useCallback(() => {
    // Only traverse entries created by this app mount; direct links stay in-app.
    if (historyIndex.current > 0) window.history.back();
    else send({ type: "NAVIGATE", mode: "LANDING" });
  }, [send]);
  return { contextStep, setContextStep, goBack };
}
