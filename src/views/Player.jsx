import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Player.css";

export default function Player() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [voiceType, setVoiceType] = useState("femenina"); // 'femenina' o 'masculina'
  const [voiceDescription, setVoiceDescription] = useState("Voz femenina adulta en español, clara y profesional, con tono cálido de enseñanza, articulado y expresivo.");
  const [voicePreset, setVoicePreset] = useState("default"); // default, podcast, etc.
  const [showText, setShowText] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const currentAudioUrlRef = useRef(null); // Para limpiar URLs de blob anteriores
  const audioContextRef = useRef(null); // Web Audio API context
  const sourceNodeRef = useRef(null); // Audio source node para aplicar pitch
  const gainNodeRef = useRef(null); // Gain node para control de volumen

  useEffect(() => {
    loadDocument();
    // Cargar preferencia de voz guardada para este documento
    const savedVoices = localStorage.getItem("documentVoices");
    if (savedVoices) {
      try {
        const voices = JSON.parse(savedVoices);
        if (voices[documentId]) {
          console.log(`🔊 Cargando preferencia de voz para ${documentId}: ${voices[documentId]}`);
          setVoiceType(voices[documentId]);
        } else {
          console.log(`ℹ️ No hay preferencia de voz guardada para ${documentId}, usando femenina por defecto`);
        }
      } catch (e) {
        console.error("Error al cargar preferencia de voz:", e);
      }
    }
  }, [documentId]);
  
  // Aplicar cambios de velocidad cuando cambie
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      // Cargar desde localStorage primero
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        const docs = JSON.parse(savedDocs);
        const doc = docs.find(d => d.id === documentId);
        if (doc) {
          setDocumentData(doc);
          setLoading(false);
          return;
        }
      }
      
      // Si no está en localStorage, cargar desde backend
      const res = await fetch(`/api/v1/documents/${documentId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.document) {
          // Obtener el texto
          const textRes = await fetch(`/api/v1/documents/${documentId}/text`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (textRes.ok) {
            const textData = await textRes.json();
            setDocumentData({
              ...data.document,
              name: data.document.filename,
              text: textData.text || ""
            });
          } else {
            setDocumentData(data.document);
          }
        }
      }
    } catch (error) {
      console.error("Error al cargar documento:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAudio = async (voiceTypeToUse = null) => {
    if (!documentData || !documentData.text) return;
    
    // Usar el voiceType pasado como parámetro, o el estado actual si no se proporciona
    const finalVoiceType = voiceTypeToUse !== null ? voiceTypeToUse : voiceType;
    console.log(`🎵 Generando audio con voz: ${finalVoiceType} (parámetro: ${voiceTypeToUse}, estado: ${voiceType})`);
    
    try {
      setGeneratingAudio(true);
      
      // Limpiar audio anterior si existe
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        // Remover todos los event listeners
        audioRef.current.onloadedmetadata = null;
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
      
      // Limpiar URL de blob anterior si existe
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
      
      const token = localStorage.getItem("authToken");
      
      // Determinar código de idioma según tipo de voz
      // gTTS solo acepta códigos simples como 'es', 'en', etc.
      // No soporta variantes regionales como 'es-mx' o 'es-es'
      // Por ahora usamos 'es' para ambos tipos de voz
      // (gTTS no tiene control directo de voces masculinas/femeninas)
      let lang = "es"; // Español por defecto
      
      console.log(`📤 Enviando request TTS: textLength=${documentData.text.substring(0, 5000).length}, lang=${lang}, voiceType=${finalVoiceType}`);
      
      const ttsRes = await fetch('/api/v1/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: documentData.text.substring(0, 5000), 
          lang: lang,
          voiceType: finalVoiceType // Usar el voiceType pasado o el estado actual
        })
      });

      if (!ttsRes.ok) {
        const errorText = await ttsRes.text();
        console.error("Error del backend:", errorText);
        throw new Error('Error al generar el audio');
      }

      const contentType = ttsRes.headers.get('content-type');
      if (!contentType || !contentType.includes('audio')) {
        const errorText = await ttsRes.text();
        console.error("El backend no devolvió audio:", errorText);
        throw new Error('El servidor no devolvió un archivo de audio válido');
      }

      // Crear URL del blob de audio
      const audioBlob = await ttsRes.blob();
      console.log("Blob creado, tamaño:", audioBlob.size, "bytes, tipo:", audioBlob.type);
      
      if (audioBlob.size === 0) {
        throw new Error('El archivo de audio está vacío');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("URL del audio creada:", audioUrl);
      currentAudioUrlRef.current = audioUrl; // Guardar referencia para limpiar después
      
      // Configurar reproductor HTML5
      if (!audioRef.current) {
        // Crear elemento audio si no existe
        const audio = document.createElement('audio');
        audioRef.current = audio;
      }
      
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = speed;
      
      // Configurar eventos del reproductor
      audioRef.current.onloadedmetadata = () => {
        const duration = audioRef.current.duration;
        console.log("Audio cargado, duración:", duration, "segundos");
        setDuration(duration);
        setGeneratingAudio(false);
        
        // Reproducir automáticamente cuando el audio esté cargado
        audioRef.current.play().then(() => {
          console.log("✅ Audio iniciado con reproductor HTML5");
          setIsPlaying(true);
        }).catch((playError) => {
          console.error("Error al iniciar reproducción:", playError);
          setGeneratingAudio(false);
          // No lanzar error, el usuario puede hacer clic en Play manualmente
        });
      };
      
      audioRef.current.onplay = () => {
        console.log("Audio empezó a reproducirse");
        // Asegurar que el estado de generación esté limpio
        setGeneratingAudio(false);
        setIsPlaying(true);
      };
      
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };
      
      audioRef.current.onended = () => {
        console.log("Audio terminó");
        setIsPlaying(false);
        setCurrentTime(0);
        // Limpiar URL cuando termine
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
        }
      };
      
      audioRef.current.onerror = (error) => {
        console.error("Error en reproductor:", error);
        setGeneratingAudio(false);
        setIsPlaying(false);
        // Limpiar URL en caso de error
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
        }
        alert("Error al reproducir el audio. Intenta de nuevo.");
      };
    } catch (error) {
      console.error("Error al generar audio:", error);
      setGeneratingAudio(false);
      setIsPlaying(false);
      alert(error.message || "Error al generar el audio");
    }
  };

  // Aplicar cambios de velocidad cuando cambie
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const handlePlayPause = () => {
    if (!audioRef.current && !sourceNodeRef.current) {
      generateAudio();
      return;
    }
    
    if (isPlaying) {
      // Pausar usando Web Audio API o audio element
      if (sourceNodeRef.current && audioContextRef.current) {
        audioContextRef.current.suspend();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      // Reanudar usando Web Audio API o audio element
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      } else if (audioRef.current) {
        audioRef.current.play();
      } else {
        // Si no hay audio, generarlo
        generateAudio();
        return;
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleVoiceTypeChange = async (newVoiceType) => {
    console.log(`🔄 Cambiando voz de ${voiceType} a ${newVoiceType} para documento ${documentId}`);
    
    if (newVoiceType === voiceType) {
      console.log(`⏭️ La voz ya es ${newVoiceType}, no se hace nada`);
      return; // No hacer nada si es la misma voz
    }
    
    // Guardar preferencia de voz primero
    const savedVoices = localStorage.getItem("documentVoices");
    const voices = savedVoices ? JSON.parse(savedVoices) : {};
    voices[documentId] = newVoiceType;
    localStorage.setItem("documentVoices", JSON.stringify(voices));
    console.log(`💾 Preferencia de voz guardada: ${newVoiceType}`);
    
    // Actualizar el estado
    setVoiceType(newVoiceType);
    
    // Limpiar audio anterior completamente
    if (audioRef.current) {
      console.log(`🛑 Deteniendo audio anterior`);
      audioRef.current.pause();
      audioRef.current.src = '';
      // Remover todos los event listeners
      audioRef.current.onloadedmetadata = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    
    // Limpiar URL de blob anterior
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    
    // Limpiar Web Audio API si existe
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.warn("Error al cerrar AudioContext:", e);
      }
      audioContextRef.current = null;
    }
    sourceNodeRef.current = null;
    gainNodeRef.current = null;
    
    // Resetear estados
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // Regenerar audio con la nueva voz (pasar el nuevo tipo directamente)
    console.log(`🎵 Regenerando audio con voz ${newVoiceType}...`);
    await generateAudio(newVoiceType); // Pasar el nuevo voiceType directamente
  };

  const handleVoicePresetChange = (preset) => {
    setVoicePreset(preset);
    // Aplicar configuraciones según el preset
    switch(preset) {
      case "podcast":
        setSpeed(0.9);
        setVoiceDescription("Voz adulta en español, clara y profesional, con tono cálido de podcast, relajado y conversacional.");
        break;
      case "lectura":
        setSpeed(1.0);
        setVoiceDescription("Voz adulta en español, clara y profesional, con tono cálido de enseñanza, articulado y expresivo.");
        break;
      case "rapido":
        setSpeed(1.25);
        setVoiceDescription("Voz adulta en español, clara y profesional, con tono cálido de enseñanza, articulado y expresivo.");
        break;
      default:
        setSpeed(1.0);
        setVoiceDescription("Voz femenina adulta en español, clara y profesional, con tono cálido de enseñanza, articulado y expresivo.");
    }
  };

  if (loading) {
    return (
      <div className="player-container">
        <div className="player-loading">
          <p>Cargando documento...</p>
        </div>
      </div>
    );
  }

      if (!documentData) {
        return (
          <div className="player-container">
            <div className="player-error">
              <p>Documento no encontrado</p>
              <button onClick={() => navigate("/dashboard")}>Volver al dashboard</button>
            </div>
          </div>
        );
      }

  return (
    <div className="player-container">
      <header className="player-header">
        <div className="header-left">
          <span className="material-symbols-outlined">music_note</span>
          <h2>AudIA</h2>
        </div>
        <nav className="header-nav">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}>Inicio</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}>Mis documentos</a>
          <a href="#">Explorar</a>
        </nav>
        <div className="header-right">
          <button className="help-btn">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="user-avatar"></div>
        </div>
      </header>

      <main className="player-main">
        <div className="player-content">
          <div className="player-title-section">
            <h1>{documentData.name || documentData.filename || "Documento sin título"}</h1>
            <button 
              className="toggle-text-btn"
              onClick={() => setShowText(!showText)}
            >
              {showText ? "Ocultar texto" : "Ver texto"}
            </button>
          </div>

          <div className="player-card">
            <div className="player-artwork">
              {generatingAudio ? (
                <div className="generating-overlay">
                  <div className="spinner-large"></div>
                  <p>Generando audio...</p>
                </div>
              ) : showText ? (
                <div className="text-preview">
                  <p>{documentData.text?.substring(0, 500) || "No hay texto disponible"}...</p>
                </div>
              ) : (
                <div className="artwork-placeholder">
                  <span className="material-symbols-outlined">description</span>
                </div>
              )}
            </div>

            <div className="player-controls">
              <div className="progress-section">
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div 
                  className="progress-bar"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="progress-fill"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="control-buttons">
                <button 
                  className="control-btn"
                  onClick={() => handleSeek(-10)}
                  title="Retroceder 10 segundos"
                >
                  <span className="material-symbols-outlined">replay_10</span>
                </button>
                <button 
                  className="control-btn play-btn"
                  onClick={handlePlayPause}
                  disabled={generatingAudio}
                >
                  {generatingAudio ? (
                    <div className="spinner-large"></div>
                  ) : (
                    <span className="material-symbols-outlined">
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  )}
                </button>
                <button 
                  className="control-btn"
                  onClick={() => handleSeek(10)}
                  title="Adelantar 10 segundos"
                >
                  <span className="material-symbols-outlined">forward_10</span>
                </button>
              </div>
            </div>
          </div>

          <div className="player-options">
            <h3>Opciones de reproducción</h3>
            
            <div className="option-group">
              <label>Velocidad de lectura</label>
              <div className="speed-control">
                <span>0.75x</span>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.25"
                  value={speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="speed-slider"
                />
                <span>1.5x</span>
                <span className="current-speed">{speed.toFixed(2)}x</span>
              </div>
            </div>

            <div className="option-group">
              <label>Tipo de voz</label>
              <div className="voice-type-buttons">
                <button
                  className={`voice-btn ${voiceType === "masculina" ? "active" : ""}`}
                  onClick={() => handleVoiceTypeChange("masculina")}
                  disabled={generatingAudio || voiceType === "masculina"}
                >
                  {generatingAudio && voiceType === "masculina" ? "Generando..." : "Voz masculina"}
                </button>
                <button
                  className={`voice-btn ${voiceType === "femenina" ? "active" : ""}`}
                  onClick={() => handleVoiceTypeChange("femenina")}
                  disabled={generatingAudio || voiceType === "femenina"}
                >
                  {generatingAudio && voiceType === "femenina" ? "Generando..." : "Voz femenina"}
                </button>
              </div>
              <p className="voice-description-hint">
                Cambiar el tipo de voz regenerará el audio con la nueva voz seleccionada.
              </p>
            </div>
          </div>

          <div className="player-actions">
            <select
              className="voice-preset-select"
              value={voicePreset}
              onChange={(e) => handleVoicePresetChange(e.target.value)}
            >
              <option value="default">Seleccionar voz...</option>
              <option value="podcast">Escuchar como podcast</option>
              <option value="lectura">Voz de lectura</option>
              <option value="rapido">Voz rápida</option>
            </select>
            <button 
              className="action-btn"
              onClick={() => navigate(`/dashboard/flashpills/${documentId}`)}
            >
              <span className="material-symbols-outlined">auto_stories</span>
              <span>Flash Pills</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate(`/dashboard/chat/${documentId}`)}
            >
              <span className="material-symbols-outlined">chat</span>
              <span>Preguntar al asistente</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

