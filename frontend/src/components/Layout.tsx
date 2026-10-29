// src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import DevBar from "./DevBar";

export default function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <DevBar />
    </>
  );
}
