import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/FlashPills.css";

export default function FlashPills() {
  const navigate = useNavigate();
  const { documentId: urlDocumentId } = useParams();
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(urlDocumentId || null);
  const [pills, setPills] = useState({
    microSummary: null,
    flashcards: [],
    highlightConcepts: [],
    savedPills: []
  });
  const [loading, setLoading] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState(null); // 'microSummary', 'flashcards', 'concepts', null
  const [editingPill, setEditingPill] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [canCancel, setCanCancel] = useState(false);
  const [documentNotFound, setDocumentNotFound] = useState(false); // Para rastrear si el documento no existe en el backend
  const abortControllerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  // Cleanup: detener audio cuando el componente se desmonte
  useEffect(() => {
    return () => {
      console.log("🛑 Deteniendo audio al salir de Flash Pills");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        // Limpiar event listeners
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onpause = null;
      }
      setPlayingAudio(null);
    };
  }, []);

  useEffect(() => {
    if (selectedDocumentId) {
      setDocumentNotFound(false); // Reset cuando se selecciona un nuevo documento
      loadPills(selectedDocumentId);
    } else {
      setDocumentNotFound(false);
      setPills({
        microSummary: null,
        flashcards: [],
        highlightConcepts: [],
        savedPills: []
      });
    }
  }, [selectedDocumentId]);

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch('/api/v1/documents', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.documents && data.documents.length > 0) {
          console.log('✅ Documentos cargados del backend:', data.documents.length);
          setDocuments(data.documents);
        } else {
          // Fallback a localStorage
          const savedDocs = localStorage.getItem("userDocuments");
          if (savedDocs) {
            const parsed = JSON.parse(savedDocs);
            console.log('✅ Documentos cargados de localStorage:', parsed.length);
            setDocuments(parsed);
          } else {
            console.log('⚠️ No hay documentos disponibles');
            setDocuments([]);
          }
        }
      } else {
        // Fallback a localStorage
        const savedDocs = localStorage.getItem("userDocuments");
        if (savedDocs) {
          const parsed = JSON.parse(savedDocs);
          console.log('✅ Documentos cargados de localStorage (fallback):', parsed.length);
          setDocuments(parsed);
        } else {
          console.log('⚠️ No hay documentos disponibles');
          setDocuments([]);
        }
      }
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      // Fallback a localStorage
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        const parsed = JSON.parse(savedDocs);
        console.log('✅ Documentos cargados de localStorage (error):', parsed.length);
        setDocuments(parsed);
      } else {
        console.log('⚠️ No hay documentos disponibles');
        setDocuments([]);
      }
    }
  };

  const loadPills = async (docId, skipGeneration = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      // Cargar todas las pills del documento
      const res = await fetch(`/api/v1/documents/${docId}/pills`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setDocumentNotFound(false); // Documento existe en el backend
        const data = await res.json();
        if (data.success && data.pills) {
          setPills(data.pills);
          
          // Solo generar pills si no existen Y no se está saltando la generación (evitar loop)
          if (!skipGeneration) {
            const needsGeneration = !data.pills.microSummary || 
                                    !data.pills.flashcards.length || 
                                    !data.pills.highlightConcepts.length;
            
            if (needsGeneration) {
              console.log('🔄 Generando pills faltantes...');
              await generateAllPills(docId);
            } else {
              console.log('✅ Todas las pills ya existen, usando cache');
            }
          }
        }
      } else if (res.status === 404) {
        // Documento no existe en el backend (solo en localStorage)
        console.warn('⚠️ Documento no encontrado en el backend. Solo existe en localStorage.');
        setDocumentNotFound(true);
        setPills({
          microSummary: null,
          flashcards: [],
          highlightConcepts: [],
          savedPills: []
        });
        // No intentar generar pills si el documento no existe en el backend
      } else if (!skipGeneration) {
        // Si hay otro error, intentar generar pills solo una vez
        console.log('⚠️ Error al cargar pills, intentando generar...');
        await generateAllPills(docId);
      }
    } catch (error) {
      console.error("Error al cargar pills:", error);
      // Intentar generar pills solo si no hay error de conexión y no se está saltando
      if (!skipGeneration && error.message !== 'Failed to fetch') {
        await generateAllPills(docId);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateAllPills = async (docId) => {
    // Crear AbortController para poder cancelar
    abortControllerRef.current = new AbortController();
    setCanCancel(true);
    
    try {
      const token = localStorage.getItem("authToken");
      const signal = abortControllerRef.current.signal;
      
      // Generar secuencialmente para mejor feedback (y evitar sobrecargar la API)
      try {
        setGeneratingStatus('microSummary');
        const summaryRes = await fetch(`/api/v1/documents/${docId}/micro-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          signal
        });
        if (!summaryRes.ok && !signal.aborted) {
          if (summaryRes.status === 404) {
            console.error('⚠️ Documento no encontrado en el backend. Por favor, sube el documento nuevamente.');
            setGeneratingStatus(null);
            return; // No continuar si el documento no existe
          }
          console.error('Error al generar micro summary:', summaryRes.status);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error al generar micro summary:', err);
        }
      }

      if (signal.aborted) return;

      try {
        setGeneratingStatus('flashcards');
        const flashcardsRes = await fetch(`/api/v1/documents/${docId}/flashcards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ count: 5 }),
          signal
        });
        if (!flashcardsRes.ok && !signal.aborted) {
          console.error('Error al generar flashcards');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error al generar flashcards:', err);
        }
      }

      if (signal.aborted) return;

      try {
        setGeneratingStatus('concepts');
        const conceptsRes = await fetch(`/api/v1/documents/${docId}/highlight-concepts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ count: 5 }),
          signal
        });
        if (!conceptsRes.ok && !signal.aborted) {
          console.error('Error al generar conceptos');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error al generar conceptos:', err);
        }
      }

      if (!signal.aborted) {
        // Recargar pills directamente sin generar de nuevo (evitar loop infinito)
        await loadPills(docId, true); // skipGeneration = true para evitar loop
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error al generar pills:", error);
      }
    } finally {
      setGeneratingStatus(null);
      setCanCancel(false);
      abortControllerRef.current = null;
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setCanCancel(false);
      setGeneratingStatus(null);
      setLoading(false);
      console.log('🛑 Generación cancelada por el usuario');
    }
  };

  const handleListen = async (text, pillId) => {
    // Si el audio ya está reproduciéndose para este pill, detenerlo
    if (playingAudio === pillId && audioRef.current) {
      try {
        // Limpiar event listeners antes de detener para evitar que se disparen errores
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onpause = null;
        
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        setPlayingAudio(null);
        return;
      } catch (error) {
        console.error("Error al detener audio:", error);
        setPlayingAudio(null);
      }
    }

    try {
      // Detener audio anterior si existe (de otro pill)
      if (audioRef.current) {
        // Limpiar event listeners antes de detener para evitar errores
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onpause = null;
        
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }

      setPlayingAudio(pillId);
      const token = localStorage.getItem("authToken");
      
      // Obtener preferencia de voz del documento
      const savedVoices = localStorage.getItem("documentVoices");
      const voices = savedVoices ? JSON.parse(savedVoices) : {};
      const voiceType = voices[selectedDocumentId] || 'femenina';

      const ttsRes = await fetch('/api/v1/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: text.substring(0, 5000), 
          lang: 'es',
          voiceType: voiceType
        })
      });

      if (!ttsRes.ok) {
        throw new Error('Error al generar audio');
      }

      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      // Limpiar event listeners anteriores
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      
      audioRef.current.src = audioUrl;
      
      audioRef.current.onended = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audioRef.current.onerror = (e) => {
        // Solo mostrar error si realmente hay un problema, no cuando se detiene intencionalmente
        if (audioRef.current && audioRef.current.src) {
          console.error('Error al reproducir el audio:', e);
          setPlayingAudio(null);
          URL.revokeObjectURL(audioUrl);
          alert('Error al reproducir el audio');
        }
      };
      
      audioRef.current.onpause = () => {
        // No hacer nada cuando se pausa, solo limpiar si fue intencional
        // El estado se maneja en handleListen cuando se detiene explícitamente
      };

      await audioRef.current.play();
    } catch (error) {
      console.error("Error al reproducir audio:", error);
      setPlayingAudio(null);
      if (error.name !== 'AbortError') {
        alert('Error al generar el audio');
      }
    }
  };

  const handleEdit = (pill) => {
    setEditingPill(pill);
  };

  const handleSaveEdit = async (pill) => {
    try {
      const token = localStorage.getItem("authToken");
      
      // Guardar como Saved Pill
      const res = await fetch(`/api/v1/documents/${selectedDocumentId}/pills/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pillId: pill.id,
          title: pill.title,
          description: pill.description
        })
      });

      if (res.ok) {
        // Recargar pills
        await loadPills(selectedDocumentId);
        setEditingPill(null);
        alert('Pill guardada exitosamente');
      }
    } catch (error) {
      console.error("Error al guardar pill:", error);
      alert('Error al guardar la pill');
    }
  };

  const handleDocumentChange = (e) => {
    const docId = e.target.value;
    console.log('📄 Documento seleccionado:', docId);
    setSelectedDocumentId(docId || null);
    if (docId) {
      navigate(`/dashboard/flashpills/${docId}`);
      // Cargar pills del documento seleccionado
      loadPills(docId);
    } else {
      navigate('/dashboard/flashpills');
      setPills({
        microSummary: null,
        flashcards: [],
        highlightConcepts: [],
        savedPills: []
      });
    }
  };

  const renderPillCard = (pill, type) => {
    const isPlaying = playingAudio === pill.id;
    const isEditing = editingPill?.id === pill.id;

    return (
      <div key={pill.id} className="pill-card">
        <div>
          <h4 className="pill-title">{pill.title}</h4>
          {isEditing ? (
            <div className="pill-edit-form">
              <input
                type="text"
                value={editingPill.title}
                onChange={(e) => setEditingPill({ ...editingPill, title: e.target.value })}
                className="pill-edit-input"
              />
              <textarea
                value={editingPill.description}
                onChange={(e) => setEditingPill({ ...editingPill, description: e.target.value })}
                className="pill-edit-textarea"
                rows="3"
              />
              <div className="pill-edit-actions">
                <button
                  className="pill-btn pill-btn--save"
                  onClick={() => handleSaveEdit(editingPill)}
                >
                  Guardar
                </button>
                <button
                  className="pill-btn pill-btn--cancel"
                  onClick={() => setEditingPill(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="pill-description">{pill.description}</p>
          )}
        </div>
        {!isEditing && (
          <div className="pill-actions">
            <button
              className="pill-btn pill-btn--edit"
              onClick={() => handleEdit(pill)}
            >
              <svg className="pill-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path>
                <path clipRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fillRule="evenodd"></path>
              </svg>
              Edit
            </button>
            <button
              className="pill-btn pill-btn--listen"
              onClick={() => handleListen(pill.description || pill.title, pill.id)}
            >
              {isPlaying ? (
                <>
                  <svg className="pill-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path>
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg className="pill-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path>
                  </svg>
                  Listen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flashpills-page">
      <header className="player-header">
        <div className="header-left">
          <span className="material-symbols-outlined">music_note</span>
          <h2>AudIA</h2>
        </div>
        <nav className="header-nav">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}>Inicio</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/dashboard/flashpills"); }}>Mis documentos</a>
          <a href="#">Explorar</a>
        </nav>
        <div className="header-right">
          <button className="help-btn">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="user-avatar"></div>
        </div>
      </header>

      <main className="flashpills-main">
        <div className="flashpills-container">
          <div className="flashpills-header">
            <h2 className="flashpills-title">Flash Pills</h2>
            <p className="flashpills-subtitle">Review cards for your selected document.</p>
            <div className="document-selector">
              <label htmlFor="document-select">Select a Document</label>
              <div className="select-wrapper">
                <select
                  id="document-select"
                  value={selectedDocumentId || ''}
                  onChange={handleDocumentChange}
                  className="document-select-input"
                >
                  <option value="">-- Selecciona un documento --</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name || doc.filename || doc.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flashpills-loading">
              <div className="spinner-large"></div>
              <p>
                {generatingStatus === 'microSummary' && 'Generando micro resumen...'}
                {generatingStatus === 'flashcards' && 'Generando flashcards...'}
                {generatingStatus === 'concepts' && 'Generando conceptos destacados...'}
                {!generatingStatus && 'Cargando pills...'}
              </p>
              {canCancel && (
                <button 
                  className="btn btn--cancel"
                  onClick={cancelGeneration}
                  style={{ marginTop: '1rem' }}
                >
                  Cancelar generación
                </button>
              )}
            </div>
          ) : !selectedDocumentId ? (
            <div className="flashpills-empty">
              <p>Selecciona un documento para ver sus Flash Pills</p>
            </div>
          ) : documentNotFound ? (
            <div className="flashpills-empty">
              <p>⚠️ Este documento solo existe en localStorage. Por favor, súbelo nuevamente desde el Dashboard para generar sus Flash Pills.</p>
              <button 
                className="btn btn--primary"
                onClick={() => navigate('/dashboard')}
                style={{ marginTop: '1rem' }}
              >
                Ir al Dashboard
              </button>
            </div>
          ) : (
            <div className="flashpills-content">
              {/* Micro Summary Section */}
              <section className="pills-section">
                <h3 className="section-title">Micro Summary</h3>
                <div className="pills-grid">
                  {pills.microSummary ? (
                    renderPillCard(pills.microSummary, 'microSummary')
                  ) : (
                    <div className="pill-card pill-card--empty">
                      <p>No hay micro summary disponible</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Flashcards Section */}
              <section className="pills-section">
                <h3 className="section-title">Flashcards</h3>
                <div className="pills-grid">
                  {pills.flashcards.length > 0 ? (
                    pills.flashcards.map((flashcard) => renderPillCard(flashcard, 'flashcard'))
                  ) : (
                    <div className="pill-card pill-card--empty">
                      <p>No hay flashcards disponibles</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Highlight Concepts Section */}
              <section className="pills-section">
                <h3 className="section-title">Highlight Concepts</h3>
                <div className="pills-grid">
                  {pills.highlightConcepts.length > 0 ? (
                    pills.highlightConcepts.map((concept) => renderPillCard(concept, 'concept'))
                  ) : (
                    <div className="pill-card pill-card--empty">
                      <p>No hay conceptos destacados disponibles</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Saved Pills Section */}
              <section className="pills-section">
                <h3 className="section-title">Saved Pills</h3>
                <div className="pills-grid">
                  {pills.savedPills.length > 0 ? (
                    pills.savedPills.map((savedPill) => renderPillCard(savedPill, 'saved'))
                  ) : (
                    <div className="pill-card pill-card--empty">
                      <p>No hay pills guardadas</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
