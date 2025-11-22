import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/FlashPills.css";

export default function FlashPills() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (documentId) {
      loadFlashcards();
    } else {
      // Si no hay documentId, mostrar mensaje
      setFlashcards([]);
    }
  }, [documentId]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      const res = await fetch(`/api/v1/documents/${documentId}/flashcards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ count: 10 })
      });

      if (!res.ok) throw new Error("Error al cargar flashcards");

      const data = await res.json();
      setFlashcards(data.flashcards || []);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cargar las flashcards");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleToggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="flashpills-container">
      <aside className="flashpills-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="brand__icon" />
          </div>
          <h1 className="sidebar-title">AudIA</h1>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}>
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M224,115.55V208a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V168a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V115.55a16,16,0,0,1,5.17-11.78l80-75.48.11-.11a16,16,0,0,1,21.53,0,1.14,1.14,0,0,0,.11.11l80,75.48A16,16,0,0,1,224,115.55Z"></path>
            </svg>
            <span>Inicio</span>
          </a>
          <a href="#" className="nav-item nav-item--active">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M216.42,39.6a53.26,53.26,0,0,0-75.32,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31h0L216.43,114.91A53.31,53.31,0,0,0,216.42,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69ZM189.68,82.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,1,1-11.31-11.32l24-24A8,8,0,0,1,189.68,82.34Z"></path>
            </svg>
            <span>Flash Pills</span>
          </a>
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate("/dashboard/chat"); }}>
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z"></path>
            </svg>
            <span>Chat</span>
          </a>
        </nav>
      </aside>

      <main className="flashpills-main">
        <div className="flashpills-header">
          <h2 className="flashpills-title">Flash Pills</h2>
          <p className="flashpills-subtitle">
            Practica con tarjetas de estudio generadas automáticamente
          </p>
        </div>

        {loading ? (
          <div className="flashpills-loading">
            <p>Generando flashcards...</p>
          </div>
        ) : flashcards.length === 0 ? (
          <div className="flashpills-empty">
            <p>{documentId ? "No hay flashcards disponibles para este documento." : "Selecciona un documento desde el dashboard para ver sus flashcards."}</p>
            <button 
              className="btn btn--primary"
              onClick={() => navigate("/dashboard")}
            >
              Volver al Dashboard
            </button>
          </div>
        ) : (
          <div className="flashpills-content">
            <div className="flashcard-counter">
              {currentIndex + 1} / {flashcards.length}
            </div>

            <div className="flashcard-container">
              <div className="flashcard">
                <div className="flashcard-question">
                  <h3>Pregunta</h3>
                  <p>{currentCard.question}</p>
                </div>

                {showAnswer && (
                  <div className="flashcard-answer">
                    <h3>Respuesta</h3>
                    <p>{currentCard.answer}</p>
                  </div>
                )}

                <div className="flashcard-actions">
                  <button
                    className="btn btn--toggle"
                    onClick={handleToggleAnswer}
                  >
                    {showAnswer ? "Ocultar respuesta" : "Mostrar respuesta"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flashcard-navigation">
              <button
                className="btn btn--nav"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                ← Anterior
              </button>
              <button
                className="btn btn--nav"
                onClick={handleNext}
                disabled={currentIndex === flashcards.length - 1}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

