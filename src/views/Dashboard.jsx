import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(null); // { docId, audio, progress }

  // Cargar documentos al montar el componente
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      // Intentar cargar desde el backend
      try {
        const res = await fetch("/api/v1/documents", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Si la respuesta es 404 o cualquier error, usar localStorage
        if (!res.ok) {
          throw new Error(`Backend responded with ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success && data.documents) {
          // Combinar documentos del backend con los de localStorage (prioridad a backend)
          const backendDocs = data.documents;
          const savedDocs = localStorage.getItem("userDocuments");
          
          if (savedDocs) {
            try {
              const localDocs = JSON.parse(savedDocs);
              // Combinar: backend tiene prioridad, pero mantener textos de localStorage
              const combinedDocs = backendDocs.map(backendDoc => {
                const localDoc = localDocs.find(d => d.id === backendDoc.id);
                return {
                  ...backendDoc,
                  name: backendDoc.filename || localDoc?.name || "", // Usar filename como name
                  text: localDoc?.text || "", // Mantener texto de localStorage si existe
                  date: localDoc?.date || new Date(backendDoc.createdAt).toLocaleDateString("es-ES", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  })
                };
              });
              setDocuments(combinedDocs);
              localStorage.setItem("userDocuments", JSON.stringify(combinedDocs));
              return;
            } catch (e) {
              console.log("Error al parsear documentos de localStorage");
            }
          }
          
          // Si no hay localStorage, usar solo backend
          const formattedDocs = backendDocs.map(doc => ({
            ...doc,
            name: doc.filename || "", // Usar filename como name
            date: new Date(doc.createdAt).toLocaleDateString("es-ES", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })
          }));
          setDocuments(formattedDocs);
          localStorage.setItem("userDocuments", JSON.stringify(formattedDocs));
          return;
        }
      } catch (error) {
        console.log("Backend no disponible o error:", error);
      }
      
      // Si el backend no responde, cargar desde localStorage
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        try {
          const parsedDocs = JSON.parse(savedDocs);
          // Asegurar que todos los documentos tengan name (puede ser filename o name)
          const normalizedDocs = parsedDocs.map(doc => ({
            ...doc,
            name: doc.name || doc.filename || "Documento sin nombre"
          }));
          setDocuments(normalizedDocs);
        } catch (e) {
          console.error("Error al parsear documentos:", e);
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      // Intentar cargar desde localStorage como último recurso
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        try {
          setDocuments(JSON.parse(savedDocs));
        } catch (e) {
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === "application/pdf");
    
    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      alert("Por favor, sube solo archivos PDF");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === "application/pdf") {
        handleFileUpload(file);
      } else {
        alert("Por favor, sube solo archivos PDF");
      }
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      // Simular progreso de subida
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const res = await fetch("/api/v1/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
          // NO incluir Content-Type cuando se envía FormData, el navegador lo hace automáticamente
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Verificar si la respuesta es JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Respuesta no JSON del servidor:", text);
        throw new Error("El servidor devolvió una respuesta inválida. Verifica que el backend esté corriendo.");
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al subir el archivo");
      }

      const data = await res.json();
      const documentId = data.document?.id || `doc-${Date.now()}`;
      
      // Obtener el texto del documento para guardarlo localmente
      let documentText = "";
      // Intentar obtener el texto hasta 3 veces con esperas progresivas
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Esperar progresivamente más tiempo en cada intento
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          
          console.log(`Intentando obtener texto del documento (intento ${attempt + 1}/3)...`);
          const textRes = await fetch(`/api/v1/documents/${documentId}/text`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`
            }
          });
          
          if (textRes.ok) {
            const textData = await textRes.json();
            documentText = textData.text || "";
            if (documentText.length > 0) {
              console.log("✅ Texto obtenido del backend:", documentText.length, "caracteres");
              break; // Salir del loop si se obtuvo el texto
            } else {
              console.log("⚠️ El backend respondió pero el texto está vacío");
            }
          } else {
            console.log(`⚠️ No se pudo obtener el texto del backend (status: ${textRes.status}), intento ${attempt + 1}/3`);
          }
        } catch (e) {
          console.log(`⚠️ Error al obtener el texto (intento ${attempt + 1}/3):`, e);
        }
      }
      
      if (!documentText || documentText.length === 0) {
        console.warn("⚠️ No se pudo obtener el texto del documento después de 3 intentos. El texto se obtendrá cuando se haga clic en Play.");
      }
      
      // Agregar el nuevo documento a la lista
      const newDocument = {
        id: documentId,
        name: data.document?.filename || file.name,
        filename: data.document?.filename || file.name, // Guardar también filename para consistencia
        date: new Date().toLocaleDateString("es-ES", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        }),
        text: documentText, // Guardar texto para uso local
        createdAt: new Date().toISOString() // Guardar fecha de creación para consistencia
      };

      const updatedDocuments = [newDocument, ...documents];
      setDocuments(updatedDocuments);
      
      // Guardar en localStorage para persistencia
      localStorage.setItem("userDocuments", JSON.stringify(updatedDocuments));

      alert("Archivo subido exitosamente");
    } catch (error) {
      console.error("Error al subir archivo:", error);
      alert(error.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePlay = async (docId) => {
    console.log("handlePlay llamado para docId:", docId);
    
    try {
      // Si ya hay un audio reproduciéndose del mismo documento, pausar/reanudar
      if (playingAudio && playingAudio.docId === docId) {
        const isCurrentlyPaused = playingAudio.isPaused || window.speechSynthesis.paused;
        const isCurrentlySpeaking = window.speechSynthesis.speaking;
        
        console.log("Estado actual:", {
          isCurrentlyPaused,
          isCurrentlySpeaking,
          playingAudioIsPaused: playingAudio.isPaused,
          speechSynthesisPaused: window.speechSynthesis.paused,
          speechSynthesisSpeaking: window.speechSynthesis.speaking
        });
        
        if (isCurrentlySpeaking && !isCurrentlyPaused) {
          // Pausar
          console.log("Pausando audio...");
          window.speechSynthesis.pause();
          // Actualizar estado inmediatamente usando función de callback
          setPlayingAudio(prev => {
            if (prev && prev.docId === docId) {
              const newState = {
                ...prev,
                isPaused: true
              };
              console.log("Estado actualizado a pausado:", newState);
              return newState;
            }
            return prev;
          });
          return;
        } else if (isCurrentlyPaused) {
          // Reanudar
          console.log("Reanudando audio...");
          window.speechSynthesis.resume();
          // Actualizar estado inmediatamente usando función de callback
          setPlayingAudio(prev => {
            if (prev && prev.docId === docId) {
              const newState = {
                ...prev,
                isPaused: false
              };
              console.log("Estado actualizado a reproduciendo:", newState);
              return newState;
            }
            return prev;
          });
          return;
        } else {
          // Si no está hablando, cancelar y permitir que se reinicie
          console.log("Cancelando audio anterior...");
          window.speechSynthesis.cancel();
          setPlayingAudio(null);
          // Continuar para iniciar nueva reproducción
        }
      }

      // Si hay otro audio reproduciéndose, detenerlo
      if (playingAudio && playingAudio.docId !== docId) {
        console.log("Deteniendo otro audio...");
        window.speechSynthesis.cancel();
        setPlayingAudio(null);
      }

      // Obtener texto del documento
      console.log("Obteniendo texto para docId:", docId);
      const token = localStorage.getItem("authToken");
      
      // Primero intentar desde localStorage (más rápido)
      let text = "";
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        try {
          const docs = JSON.parse(savedDocs);
          const doc = docs.find(d => d.id === docId);
          if (doc && doc.text) {
            text = doc.text;
            console.log("Texto obtenido de localStorage:", text.length, "caracteres");
          } else {
            console.log("Documento no encontrado en localStorage o sin texto");
          }
        } catch (e) {
          console.error("Error al parsear localStorage:", e);
        }
      }
      
      // Si no hay texto en localStorage, intentar desde el backend
      if (!text || text.trim().length === 0) {
        console.log("Intentando obtener texto del backend...");
        try {
          const res = await fetch(`/api/v1/documents/${docId}/text`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            text = data.text || "";
            console.log("Texto obtenido del backend:", text.length, "caracteres");
            
            // Guardar el texto en localStorage para futuras veces
            if (text && savedDocs) {
              try {
                const docs = JSON.parse(savedDocs);
                const docIndex = docs.findIndex(d => d.id === docId);
                if (docIndex !== -1) {
                  docs[docIndex].text = text;
                  localStorage.setItem("userDocuments", JSON.stringify(docs));
                }
              } catch (e) {
                console.error("Error al guardar texto en localStorage:", e);
              }
            }
          } else {
            console.error("Backend respondió con error:", res.status, res.statusText);
          }
        } catch (error) {
          console.error("Error al obtener texto del backend:", error);
        }
      }

      if (!text || text.trim().length === 0) {
        alert("No se pudo obtener el texto del documento. Por favor, espera unos segundos y vuelve a intentar, o sube el documento nuevamente.");
        console.error("Texto vacío para el documento:", docId);
        console.log("Documentos en localStorage:", savedDocs);
        return;
      }
      
      // Usar Web Speech API del navegador para TTS
      if (!('speechSynthesis' in window)) {
        alert("Tu navegador no soporta síntesis de voz. Por favor, usa Chrome, Edge o Safari.");
        console.error("speechSynthesis no disponible");
        return;
      }

      // Verificar que no haya una síntesis en curso
      if (window.speechSynthesis.speaking) {
        console.log("Cancelando síntesis anterior...");
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const textToSpeak = text.substring(0, 10000); // Limitar a 10000 caracteres
      console.log("Iniciando síntesis de voz con", textToSpeak.length, "caracteres");
      
      // Crear utterance
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      console.log("Utterance creado:", {
        lang: utterance.lang,
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume,
        textLength: utterance.text.length
      });

      // Calcular duración estimada (aproximadamente 150 palabras por minuto)
      const words = textToSpeak.split(/\s+/).length;
      const estimatedDuration = (words / 150) * 60; // en segundos
      let startTime = Date.now();

      // Estado inicial
      let progressInterval = null;

      utterance.onstart = () => {
        console.log("✅ Audio iniciado correctamente");
        startTime = Date.now();
        setPlayingAudio({
          docId,
          speechSynthesis: utterance,
          progress: 0,
          isPaused: false
        });
        
        // Actualizar progreso cada 100ms
        progressInterval = setInterval(() => {
          if (!window.speechSynthesis.paused && window.speechSynthesis.speaking) {
            const elapsed = (Date.now() - startTime) / 1000; // segundos
            const progress = Math.min((elapsed / estimatedDuration) * 100, 100);
            setPlayingAudio(prev => {
              if (prev && prev.docId === docId) {
                return {
                  ...prev,
                  progress: Math.round(progress)
                };
              }
              return prev;
            });
          }
        }, 100);
      };

      utterance.onend = () => {
        console.log("Audio terminado");
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setPlayingAudio(null);
      };

      utterance.onerror = (error) => {
        // Ignorar el error "canceled" - es normal cuando cancelamos una síntesis anterior
        if (error.error === 'canceled') {
          console.log("⚠️ Síntesis cancelada (esto es normal cuando se cancela una síntesis anterior)");
          return;
        }
        
        console.error("❌ Error en síntesis de voz:", error);
        console.error("Error details:", {
          error: error.error,
          type: error.type,
          charIndex: error.charIndex,
          charLength: error.charLength,
          utterance: error.utterance
        });
        
        // Mensajes de error más específicos
        let errorMessage = "Error al reproducir el audio.";
        if (error.error === 'not-allowed') {
          errorMessage = "Permiso denegado para usar síntesis de voz. Verifica los permisos del navegador.";
        } else if (error.error === 'network') {
          errorMessage = "Error de red al reproducir el audio.";
        } else if (error.error === 'synthesis-failed') {
          errorMessage = "La síntesis de voz falló. Intenta con otro navegador.";
        } else if (error.error === 'synthesis-unavailable') {
          errorMessage = "La síntesis de voz no está disponible en tu navegador.";
        } else if (error.error === 'text-too-long') {
          errorMessage = "El texto es demasiado largo para reproducir.";
        } else if (error.error === 'invalid-argument') {
          errorMessage = "Argumento inválido en la síntesis de voz.";
        }
        
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setPlayingAudio(null);
        alert(errorMessage);
      };
      
      // Nota: SpeechSynthesis no tiene eventos onpause/onresume en el utterance
      // El estado se maneja directamente en handlePlay

      // Verificar que speechSynthesis esté disponible
      if (!window.speechSynthesis) {
        throw new Error("speechSynthesis no está disponible");
      }

      // Cancelar cualquier síntesis anterior antes de iniciar una nueva
      window.speechSynthesis.cancel();
      
      // Esperar un momento para que se cancele completamente
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log("Llamando a window.speechSynthesis.speak()...");
      console.log("Estado antes de speak:", {
        speaking: window.speechSynthesis.speaking,
        pending: window.speechSynthesis.pending,
        paused: window.speechSynthesis.paused
      });
      
      // Intentar activar la síntesis de voz (algunos navegadores requieren esto)
      try {
        // Forzar la activación de la API
        const voices = window.speechSynthesis.getVoices();
        console.log("Voces disponibles:", voices.length);
        
        if (voices.length === 0) {
          // Esperar a que las voces se carguen
          console.log("Esperando a que se carguen las voces...");
          await new Promise(resolve => {
            const checkVoices = () => {
              const loadedVoices = window.speechSynthesis.getVoices();
              if (loadedVoices.length > 0) {
                console.log("Voces cargadas:", loadedVoices.length);
                resolve();
              } else {
                setTimeout(checkVoices, 100);
              }
            };
            checkVoices();
          });
        }
      } catch (e) {
        console.warn("Error al obtener voces:", e);
      }
      
      // Reproducir
      try {
        window.speechSynthesis.speak(utterance);
        console.log("✅ speak() llamado exitosamente");
      } catch (speakError) {
        console.error("❌ Error al llamar speak():", speakError);
        throw speakError;
      }
      
      console.log("Estado después de speak:", {
        speaking: window.speechSynthesis.speaking,
        pending: window.speechSynthesis.pending,
        paused: window.speechSynthesis.paused
      });
      
      // Verificar después de un momento si se inició
      setTimeout(() => {
        console.log("Estado después de 1000ms:", {
          speaking: window.speechSynthesis.speaking,
          pending: window.speechSynthesis.pending,
          paused: window.speechSynthesis.paused
        });
        
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          console.warn("⚠️ El audio no se inició después de 1 segundo.");
          console.warn("Esto puede deberse a:");
          console.warn("1. Permisos del navegador bloqueados");
          console.warn("2. Política de autoplay del navegador");
          console.warn("3. Problema con la API de síntesis de voz");
          alert("El audio no se pudo iniciar. Por favor, verifica que tu navegador tenga permisos para reproducir audio. Si el problema persiste, intenta hacer clic en Play nuevamente.");
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error al reproducir:", error);
      alert(error.message || "Error al reproducir el documento. Asegúrate de que el documento esté procesado.");
    }
  };

  const handlePills = (docId) => {
    navigate(`/dashboard/flashpills/${docId}`);
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="brand__icon" />
          </div>
          <h1 className="sidebar-title">AudIA</h1>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item nav-item--active" onClick={(e) => { e.preventDefault(); }}>
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
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate("/dashboard/chat"); }}>
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z"></path>
            </svg>
            <span>Chat</span>
          </a>
          <a href="#" className="nav-item">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
            </svg>
            <span>Perfil</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="nav-item">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path>
            </svg>
            <span>Ayuda</span>
          </a>
          <button onClick={handleLogout} className="nav-item nav-item--logout">
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <h2 className="dashboard-title">Panel de control</h2>
        
        <section className="upload-section">
          <h3 className="section-title">Subir documento</h3>
          <div
            className={`upload-zone ${isDragging ? "upload-zone--dragging" : ""} ${uploading ? "upload-zone--uploading" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <p className="upload-text">
              Arrastra y suelta un archivo PDF o haz clic para seleccionar
            </p>
            <p className="upload-subtext">
              Los documentos se procesan para crear materiales de estudio personalizados.
            </p>
            {uploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{uploadProgress}%</p>
              </div>
            )}
            {!uploading && (
              <button className="btn btn--upload">
                Subir archivo
              </button>
            )}
          </div>
        </section>

        <section className="documents-section">
          <h3 className="section-title">Historial de documentos</h3>
          {loading ? (
            <div className="documents-loading">
              <p>Cargando documentos...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="documents-empty">
              <p>No hay documentos aún. Sube tu primer PDF para comenzar.</p>
            </div>
          ) : (
            <div className="documents-list">
              {documents.map((doc) => (
              <div key={doc.id} className="document-item">
                <div className="document-content">
                  <div className="document-icon">
                    <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
                      <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                    </svg>
                  </div>
                  <div className="document-info">
                    <p className="document-name">{doc.name || doc.filename || "Documento sin nombre"}</p>
                    <p className="document-date">Procesado el {doc.date}</p>
                  </div>
                  <div className="document-actions">
                    <button 
                      className="btn btn--play"
                      onClick={() => handlePlay(doc.id)}
                    >
                      {playingAudio && playingAudio.docId === doc.id && !playingAudio.isPaused ? (
                        <>
                          <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20">
                            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm24-88a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,128Z"></path>
                          </svg>
                          <span>Pause</span>
                        </>
                      ) : playingAudio && playingAudio.docId === doc.id && playingAudio.isPaused ? (
                        <>
                          <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20">
                            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48.44-85.25-64,40a8,8,0,0,1-8.17-11.5L160,128,104.28,97.25a8,8,0,0,1,8.17-11.5l64,40A8,8,0,0,1,176.44,130.75Z"></path>
                          </svg>
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20">
                            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48.44-85.25-64,40a8,8,0,0,1-8.17-11.5L160,128,104.28,97.25a8,8,0,0,1,8.17-11.5l64,40A8,8,0,0,1,176.44,130.75Z"></path>
                          </svg>
                          <span>Play</span>
                        </>
                      )}
                    </button>
                    <button 
                      className="btn btn--pills"
                      onClick={() => handlePills(doc.id)}
                    >
                      <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20">
                        <path d="M216.42,39.6a53.26,53.26,0,0,0-75.32,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31h0L216.43,114.91A53.31,53.31,0,0,0,216.42,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69ZM189.68,82.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,1,1-11.31-11.32l24-24A8,8,0,0,1,189.68,82.34Z"></path>
                      </svg>
                      <span>Pills</span>
                    </button>
                  </div>
                </div>
                {playingAudio && playingAudio.docId === doc.id && (
                  <div className="document-progress">
                    <div className="progress-header">
                      <span>En escucha</span>
                      <span>{playingAudio.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${playingAudio.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

