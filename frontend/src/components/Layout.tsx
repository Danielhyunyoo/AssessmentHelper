// src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import NavigationHelper from "./NavigationHelper"; // <-- Add this import

export default function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <NavigationHelper />
    </>
  );
}