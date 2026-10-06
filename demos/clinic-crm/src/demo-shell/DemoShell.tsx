import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { DemoTipModal } from "./DemoTipModal";
import type { DemoShellConfig, DemoShellContextValue, DemoTipContent } from "./types";

const DemoShellContext = createContext<DemoShellContextValue | null>(null);

type ActiveTip = { id: string; content: DemoTipContent };

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1" || sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeLocal(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function writeSession(key: string, on: boolean) {
  try {
    if (on) sessionStorage.setItem(key, "1");
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function tipForPath(config: DemoShellConfig, pathname: string): ActiveTip | null {
  const path = normalizePath(pathname);
  if (path === "/") {
    return { id: "page:/", content: config.pages["/"] ?? config.welcome };
  }
  const page = config.pages[path];
  if (!page) return null;
  return { id: `page:${path}`, content: page };
}

/** Синхронно: что показать без useEffect — без кадра «пустой страницы». */
function resolveAutoTip(
  config: DemoShellConfig,
  pathname: string,
  tipsMuted: boolean,
): ActiveTip | null {
  if (tipsMuted) return null;

  const welcomeId = "welcome";
  const welcomeKey = `${config.seenPrefix}${welcomeId}`;
  if (!readFlag(welcomeKey)) {
    return { id: welcomeId, content: config.welcome };
  }

  const page = tipForPath(config, pathname);
  if (!page) return null;
  if (readFlag(`${config.seenPrefix}${page.id}`)) return null;
  return page;
}

interface Props {
  config: DemoShellConfig;
  children: ReactNode;
}

/** Общая оболочка демо: welcome + подсказки страниц + mute. */
export function DemoShell({ config, children }: Props) {
  const location = useLocation();
  const [tipsMuted, setTipsMutedState] = useState(() => readFlag(config.muteKey));
  const [seenTick, setSeenTick] = useState(0);
  const [forced, setForced] = useState(false);
  const [forcedTip, setForcedTip] = useState<ActiveTip | null>(null);

  const setTipsMuted = useCallback(
    (muted: boolean) => {
      setTipsMutedState(muted);
      writeLocal(config.muteKey, muted);
    },
    [config.muteKey],
  );

  const markSeen = useCallback(
    (id: string) => {
      writeSession(`${config.seenPrefix}${id}`, true);
      setSeenTick((value) => value + 1);
    },
    [config.seenPrefix],
  );

  const autoTip = useMemo(() => {
    void seenTick;
    if (forced) return null;
    return resolveAutoTip(config, location.pathname, tipsMuted);
  }, [config, forced, location.pathname, seenTick, tipsMuted]);

  const active = forced ? forcedTip : autoTip;

  const closeTip = useCallback(() => {
    if (!active) return;
    markSeen(active.id);
    if (forced) {
      setForced(false);
      setForcedTip(null);
    }
    // После welcome autoTip на следующем рендере станет подсказкой страницы.
  }, [active, forced, markSeen]);

  const openCurrentTip = useCallback(() => {
    const page = tipForPath(config, location.pathname);
    if (!page) return;
    setForced(true);
    setForcedTip(page);
  }, [config, location.pathname]);

  const hasPageTip = !!tipForPath(config, location.pathname);

  const value = useMemo<DemoShellContextValue>(
    () => ({
      config,
      tipOpen: !!active,
      tipsMuted,
      hasPageTip,
      setTipsMuted,
      openCurrentTip,
      closeTip,
    }),
    [config, active, tipsMuted, hasPageTip, setTipsMuted, openCurrentTip, closeTip],
  );

  return (
    <DemoShellContext.Provider value={value}>
      {children}
      {active ? (
        <DemoTipModal
          open
          tipId={active.id}
          content={active.content}
          showMute={active.id !== "welcome"}
          muteChecked={tipsMuted}
          onMuteChange={setTipsMuted}
          onClose={closeTip}
        />
      ) : null}
    </DemoShellContext.Provider>
  );
}

export function useDemoShell() {
  const ctx = useContext(DemoShellContext);
  if (!ctx) throw new Error("useDemoShell outside DemoShell");
  return ctx;
}

export function useDemoShellOptional() {
  return useContext(DemoShellContext);
}
