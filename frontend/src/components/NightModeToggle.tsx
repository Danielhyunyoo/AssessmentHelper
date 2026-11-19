import { useEffect, useRef, useState } from "react";
import SunIcon from "../assets/icons/sun.png";
import MoonIcon from "../assets/icons/moon.png";
import defaultLogo from "../assets/icons/utd_logo.png";
import utdLogo from "../assets/icons/utd_logo.png";

interface NightModeToggleProps {
  onThemeChange?: (isDark: boolean) => void;
}

const TRANSITION_COOLDOWN_MS = 600;

export default function NightModeToggle({ onThemeChange }: NightModeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
    if (onThemeChange) {
      onThemeChange(isDark);
    }
  }, [isDark, onThemeChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleToggle = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setIsDark((prev) => !prev);

    timeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_COOLDOWN_MS);
  };

  return (
    <button
      type="button"
      className="nightmode-floating-btn"
      onClick={handleToggle}
      disabled={isTransitioning}
      aria-busy={isTransitioning}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Night Mode"
    >
      <img
        src={isDark ? SunIcon : MoonIcon}
        alt={isDark ? "Sun Icon" : "Moon Icon"}
        className="nightmode-icon"
      />
    </button>
  );
}

export function useLogo(
  lightLogoPath: string = defaultLogo,
  darkLogoPath: string = utdLogo
) {
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark-mode")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark-mode"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark ? darkLogoPath : lightLogoPath;
}

interface LogoProps {
  alt?: string;
  className?: string;
}

export function Logo({
  alt = "App Logo",
  className = "header-logo",
}: LogoProps) {
  const activeLogo = useLogo();
  return <img src={activeLogo} alt={alt} className={className} />;
}