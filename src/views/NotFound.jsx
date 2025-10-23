// src/views/NotFound.jsx
export default function NotFound() {
  return (
    <section className="container" style={{ padding: "64px 0" }}>
      <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900, color: "#fff" }}>404</h1>
      <p style={{ marginTop: 12, color: "var(--subtext)" }}>
        La página que buscas no existe. Revisa la URL o vuelve al inicio.
      </p>
    </section>
  );
}
