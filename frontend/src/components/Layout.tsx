// src/components/Layout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import NavigationHelper from "./NavigationHelper";
import DateAdjustor from "./DateAdjustor";

export default function Layout() {
  const [simulatedDate, setSimulatedDate] = useState<string>("2026-10-05");

  return (
    <>
      <Header />
      <main>
        <Outlet context={{ simulatedDate }} />
      </main>
      <Footer />
      <NavigationHelper />
      <DateAdjustor 
        currentDate={simulatedDate} 
        onDateChange={setSimulatedDate} 
      />
    </>
  );
}