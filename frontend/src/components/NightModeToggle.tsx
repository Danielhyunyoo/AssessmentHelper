import { useEffect, useState } from "react";
import SunIcon from "../assets/sun.png";
import MoonIcon from "../assets/moon.png";
import defaultLogo from "../assets/default_logo.png";
import darkModeLogo from "../assets/dark_mode_logo.png";

interface NightModeToggleProps {
  onThemeChange?: (isDark: boolean) => void;
}

export default function NightModeToggle({ onThemeChange }: NightModeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

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

  return (
    <button
      type="button"
      className="nightmode-floating-btn"
      onClick={() => setIsDark(!isDark)}
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
  darkLogoPath: string = darkModeLogo
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
