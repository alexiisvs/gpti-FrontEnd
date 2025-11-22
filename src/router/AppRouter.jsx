import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Vistas
import Landing from "../views/Landing";
import FeaturesPage from "../views/Features";
import DemoTTS from "../views/DemoTTS";
import DemoLLM from "../views/DemoLLM";
import Demos from "../views/Demos";
import Login from "../views/Login";
import Dashboard from "../views/Dashboard";
import FlashPills from "../views/FlashPills";
import Chat from "../views/Chat";
import Player from "../views/Player";
import AccessibilityMode from "../views/AccessibilityMode";
import CalendarSuccess from "../views/CalendarSuccess";
import CalendarError from "../views/CalendarError";
import NotFound from "../views/NotFound";

function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/login" element={<Login />} />

          {/* Hub de demos */}
          <Route path="/demo" element={<Demos />} />

          {/* Demos individuales */}
          <Route path="/demo/tts" element={<DemoTTS />} />
          <Route path="/demo/llm" element={<DemoLLM />} />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Dashboard sin Layout (tiene su propio sidebar) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/accessibility" element={<AccessibilityMode />} />
        <Route path="/dashboard/player/:documentId" element={<Player />} />
        <Route path="/dashboard/flashpills" element={<FlashPills />} />
        <Route path="/dashboard/flashpills/:documentId" element={<FlashPills />} />
        <Route path="/dashboard/chat" element={<Chat />} />
        <Route path="/dashboard/chat/:documentId" element={<Chat />} />
        <Route path="/dashboard/calendar-success" element={<CalendarSuccess />} />
        <Route path="/dashboard/calendar-error" element={<CalendarError />} />
      </Routes>
    </BrowserRouter>
  );
}
