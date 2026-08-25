import { useEffect, useRef } from "react";
import activityService from "../services/activityService";

const TOOLS = new Set(["chat", "voice", "projects", "profile", "admin"]);
const TICK_MS = 20000;

export default function useActivityTracker(tool, enabled) {
  const toolRef = useRef(tool);
  const lastRef = useRef(0);

  useEffect(() => { toolRef.current = tool; }, [tool]);

  useEffect(() => {
    if (!enabled || !TOOLS.has(tool)) return undefined;

    lastRef.current = Date.now();

    const flush = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        lastRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const seconds = Math.round((now - lastRef.current) / 1000);
      lastRef.current = now;
      if (seconds >= 1) activityService.heartbeat(toolRef.current, seconds);
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else lastRef.current = Date.now();
    };

    const id = setInterval(flush, TICK_MS);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, [enabled, tool]);
}
