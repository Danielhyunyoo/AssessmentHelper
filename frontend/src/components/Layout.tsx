// src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import DevBar from "./DevBar";
import NightmodeToggle from "./NightmodeToggle"

export default function Layout() {

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <DevBar />
      <NightmodeToggle />
    </>
  );
}