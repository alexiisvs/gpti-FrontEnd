
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Hero from "./sections/Hero";
import Features from "./sections/Features";

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

function Landing() {
  return (
    <>
      <Hero />
      <Features />
    </>
  );
}

function Demo() {
  return (
    <section className="container" style={{ padding: "48px 0", color: "white" }}>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Demo</h1>
      <p style={{ marginTop: 12 }}>Aquí irá la demo.</p>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
