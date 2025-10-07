import "../styles/HomePage.css";

export default function HomePage() {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="brand">Bienvenidos: Homepage</h1>
        <div className="header-buttons">
          <button className="btn">Demo 1</button>
          <button className="btn">Demo 2</button>
        </div>
      </header>

      <main className="home-content">
        <p>Esta es la página de inicio de Grupo 21: proyecto GPTI.</p>
      </main>
    </div>
  );
}
