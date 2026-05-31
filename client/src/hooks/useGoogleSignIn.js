import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/**
 * Renders the Google Identity Services button into googleBtnRef.
 * @param {{ buttonText?: 'continue_with' | 'signup_with' | 'signin_with', setError?: (msg: string) => void }} opts
 */
export function useGoogleSignIn({ buttonText = "continue_with", setError } = {}) {
  const googleBtnRef = useRef(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    let cancelled = false;

    const handleGoogleCredential = async (response) => {
      setGoogleLoading(true);
      setError?.("");
      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential, rememberMe: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google sign-in failed");
        authService.setSession(data.token, data.user, { remember: true });
        navigate("/projects", { replace: true });
      } catch (err) {
        setError?.(err.message || "Google sign-in failed. Please try again.");
        setGoogleLoading(false);
      }
    };

    const initGoogle = () => {
      if (cancelled || !googleBtnRef.current || !window.google?.accounts?.id) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          use_fedcm_for_prompt: false,
        });
        googleBtnRef.current.innerHTML = "";
        const width = Math.min(360, Math.max(200, googleBtnRef.current.offsetWidth || 320));
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: buttonText,
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
        return true;
      } catch (err) {
        console.error("Google Sign-In init failed:", err);
        setError?.("Could not load Google sign-in. Check your Google Client ID and authorized origins.");
        return false;
      }
    };

    if (initGoogle()) return undefined;

    const timer = setInterval(() => {
      if (initGoogle()) clearInterval(timer);
    }, 100);
    const timeout = setTimeout(() => clearInterval(timer), 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [navigate, buttonText, setError]);

  return { googleBtnRef, googleLoading, googleConfigured: !!GOOGLE_CLIENT_ID };
}
