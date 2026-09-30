import { useLayoutEffect, useRef, useState } from "react";
import type { AppAction, AppState } from "../modes";
import { readRoute, routeUrl, type ContextStep } from "./routes";

// URLs describe screens, never serialized calibration or camera/session state.
export function useBrowserRoutes(
  state: AppState,
  send: (action: AppAction) => AppState,
) {
  const base = import.meta.env.BASE_URL;
  const [contextStep, setContextStep] = useState<ContextStep>(
    () => readRoute(window.location.pathname, base).contextStep,
  );
  const first = useRef(true);
  const previousMode = useRef(state.mode);
  const step = useRef(contextStep);
  const mode = useRef(state.mode);
  useLayoutEffect(() => {
    const onPop = () => {
      const route = readRoute(window.location.pathname, base);
      const next = send({ type: "NAVIGATE", mode: route.mode });
      step.current = route.contextStep;
      setContextStep(route.contextStep);
      mode.current = next.mode;
      // Normalize protected/unknown routes in place, retaining the forward stack.
      window.history.replaceState(
        null,
        "",
        routeUrl(next.mode, route.contextStep, base, window.location.search),
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [base, send]);
  useLayoutEffect(() => {
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
    if (window.location.pathname + window.location.search !== url) {
      // Frame-driven readiness/countdown and pause updates must not fill history.
      const automatic =
        ["COUNTDOWN", "WORKOUT", "PAUSED"].includes(state.mode) &&
        ["CALIBRATION", "COUNTDOWN", "WORKOUT", "PAUSED"].includes(
          previousMode.current,
        );
      if (first.current || automatic)
        window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    }
    first.current = false;
    previousMode.current = state.mode;
  }, [base, contextStep, state.mode]);
  return { contextStep, setContextStep };
}
