import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Vistas
import Landing from "../views/Landing";
import FeaturesPage from "../views/Features";
import DemoTTS from "../views/DemoTTS";
import DemoLLM from "../views/DemoLLM";
import Demos from "../views/Demos";
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

          {/* Hub de demos */}
          <Route path="/demo" element={<Demos />} />

          {/* Demos individuales */}
          <Route path="/demo/tts" element={<DemoTTS />} />
          <Route path="/demo/llm" element={<DemoLLM />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
