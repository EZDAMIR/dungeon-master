import {
  appReducer,
  INITIAL_STATE,
  type AppMode,
  type AppState,
} from "../modes";

export type ContextStep = "intake" | "documents" | "review";
export type AppRoute = { mode: AppMode; contextStep: ContextStep };

const paths: Record<AppMode, string> = {
  PROFILE: "/context",
  PLAN: "/plan",
  PROGRESS: "/progress",
  SCHEDULE: "/schedule",
  CAMERA_PERMISSION: "/camera/permission",
  TUTORIAL: "/tutorial",
  MENU: "/menu",
  CALIBRATION: "/camera/setup",
  COUNTDOWN: "/camera/countdown",
  WORKOUT: "/workout",
  PAUSED: "/workout/paused",
  RESULTS: "/results",
};

function basePrefix(base: string): string {
  return base.replace(/\/$/, "");
}

export function readRoute(
  pathname: string,
  base: string,
  defaultMode: AppMode = "PROFILE",
): AppRoute {
  const prefix = basePrefix(base);
  if (prefix && pathname !== prefix && !pathname.startsWith(prefix + "/"))
    return { mode: "PROFILE", contextStep: "intake" };
  const path = pathname.slice(prefix.length).replace(/\/$/, "") || "/";
  if (path === "/") return { mode: defaultMode, contextStep: "intake" };
  if (path === "/context/documents" || path === "/context/review")
    return {
      mode: "PROFILE",
      contextStep: path === "/context/documents" ? "documents" : "review",
    };
  const mode = (Object.keys(paths) as AppMode[]).find(
    (key) => paths[key] === path,
  );
  return { mode: mode ?? "PROFILE", contextStep: "intake" };
}

export function routeUrl(
  mode: AppMode,
  contextStep: ContextStep,
  base: string,
  search: string,
): string {
  const path =
    mode === "PROFILE" && contextStep !== "intake"
      ? `/context/${contextStep}`
      : paths[mode];
  return basePrefix(base) + path + search;
}

export function initialRouteState(
  pathname: string,
  base: string,
  legacyFake: boolean,
): AppState {
  const route = readRoute(
    pathname,
    base,
    legacyFake ? "CAMERA_PERMISSION" : "PROFILE",
  );
  return appReducer(INITIAL_STATE, { type: "NAVIGATE", mode: route.mode });
}
