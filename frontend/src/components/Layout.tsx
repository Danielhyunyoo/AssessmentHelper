// src/components/Layout.tsx
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import DevBar from "./DevBar";
import NightModeToggle from "./NightModeToggle";

function getRouteBgTheme(pathname: string): string {
  if (pathname === "/login/signin") return "signin";
  if (pathname === "/" || pathname.startsWith("/login")) return "home";
  if (
    pathname.startsWith("/observee") ||
    pathname.startsWith("/observer")
  ) {
    return "scheduling";
  }
  if (
    pathname.startsWith("/shared/current-past-observations") ||
    pathname.startsWith("/shared/observation-record") ||
    pathname.startsWith("/shared/post-evaluation-survey")
  ) {
    return "records";
  }
  if (pathname.startsWith("/shared")) return "faculty";
  if (
    pathname.startsWith("/committee/dashboard") ||
    pathname.startsWith("/committee/faculty-matching") ||
    pathname.startsWith("/committee/unmatched-observees") ||
    pathname.startsWith("/committee/faculty-roster")
  ) {
    return "committee-core";
  }
  if (pathname.startsWith("/committee")) return "committee-ops";
  return "home";
}

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const theme = getRouteBgTheme(pathname);
    document.body.setAttribute("data-route-bg", theme);
    return () => {
      document.body.removeAttribute("data-route-bg");
    };
  }, [pathname]);

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <DevBar />
      <NightModeToggle />
    </>
  );
}