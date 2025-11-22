import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Chat.css";

export default function Chat() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Mensaje de bienvenida
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy tu asistente de AudIA. Puedo ayudarte a entender el contenido de tus documentos. ¿Sobre qué te gustaría preguntar?",
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      
      // Si hay un documentId, usar el endpoint de chat contextual
      const endpoint = documentId 
        ? `/api/v1/documents/${documentId}/chat`
        : `/api/v1/chat`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: inputMessage })
      });

      if (!res.ok) throw new Error("Error al obtener respuesta");

      const data = await res.json();
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Lo siento, no pude procesar tu pregunta.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
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
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate("/dashboard/flashpills"); }}>
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M216.42,39.6a53.26,53.26,0,0,0-75.32,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31h0L216.43,114.91A53.31,53.31,0,0,0,216.42,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69ZM189.68,82.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,1,1-11.31-11.32l24-24A8,8,0,0,1,189.68,82.34Z"></path>
            </svg>
            <span>Flash Pills</span>
          </a>
          <a href="#" className="nav-item nav-item--active">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z"></path>
            </svg>
            <span>Chat</span>
          </a>
        </nav>
      </aside>

      <main className="chat-main">
        <div className="chat-header">
          <h2 className="chat-title">Asistente Conversacional</h2>
          <p className="chat-subtitle">
            Haz preguntas sobre tus documentos y recibe respuestas contextualizadas
          </p>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message message--${message.role}`}
            >
              <div className="message-content">
                <p>{message.content}</p>
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message message--assistant">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <textarea
            className="chat-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu pregunta aquí..."
            rows={1}
            disabled={loading}
          />
          <button
            className="btn btn--send"
            onClick={handleSend}
            disabled={!inputMessage.trim() || loading}
          >
            <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20">
              <path d="M223.69,48.48l-58.6,191.94a16,16,0,0,1-25,9.15L74.91,188,24.12,219.07a8,8,0,0,1-11.18-2.21,7.84,7.84,0,0,1-1-5.53l16-88a8,8,0,0,1,5.44-6.32l136-40a8,8,0,0,1,10.12,10.12l-40,136L88,200l57.07-65.48a8,8,0,0,1,11.72,10.84l-64.08,73.54L200,64.48a8,8,0,0,1,15.19-3.35l8.5,20.49a8,8,0,0,1-1.58,8.64l-44.1,44.1a8,8,0,1,1-11.31-11.31l39.6-39.6Z"></path>
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}

