// src/components/NightModeToggle.tsx
import { useEffect, useState } from "react";
import SunIcon from "../assets/sun.png";
import MoonIcon from "../assets/moon.png";
import BlackLogo from "../assets/logo-black.png"; // Replace with your actual paths
import WhiteLogo from "../assets/logo-white.png";

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

// Helper hook or asset export for Header/Navbar logo rendering:
export function useLogo(blackLogoPath: string, whiteLogoPath: string) {
  const [isDark, setIsDark] = useState<boolean>(() => 
    document.documentElement.classList.contains("dark-mode")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark-mode"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark ? whiteLogoPath : blackLogoPath;
}