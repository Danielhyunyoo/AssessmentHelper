// src/components/Layout.tsx
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import DevBar from "./DevBar";
import NightModeToggle from "./NightModeToggle"

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
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