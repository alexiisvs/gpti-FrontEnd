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
  const [playingAudio, setPlayingAudio] = useState(null); // { docId, audio, progress, text, currentPosition, rate, elapsedTime, estimatedDuration, audioUrl }
  const [generatingAudio, setGeneratingAudio] = useState(null); // docId del documento que está generando audio
  const [showVoiceModal, setShowVoiceModal] = useState(false); // Modal para seleccionar voz
  const [pendingDocId, setPendingDocId] = useState(null); // docId pendiente de generar audio
  const [documentVoices, setDocumentVoices] = useState({}); // { docId: 'femenina' | 'masculina' }
  const audioRef = useRef(null);

  // Cargar documentos al montar el componente
  useEffect(() => {
    loadDocuments();
    // Cargar preferencias de voz guardadas
    const savedVoices = localStorage.getItem("documentVoices");
    if (savedVoices) {
      try {
        setDocumentVoices(JSON.parse(savedVoices));
      } catch (e) {
        console.error("Error al cargar preferencias de voz:", e);
      }
    }
    
    // Cleanup: detener audio cuando el componente se desmonte
    return () => {
      if (audioRef.current) {
        console.log("🛑 Deteniendo audio al salir del Dashboard");
        audioRef.current.pause();
        audioRef.current.src = '';
        // Limpiar event listeners
        audioRef.current.onloadedmetadata = null;
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onplay = null;
      }
      // Limpiar estado
      setPlayingAudio(null);
      setGeneratingAudio(null);
    };
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
          const backendDocs = data.documents;
          const savedDocs = localStorage.getItem("userDocuments");
          
          // Si el backend devuelve documentos, combinarlos con localStorage
          if (backendDocs.length > 0) {
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
                console.log("✅ Documentos combinados (backend + localStorage):", combinedDocs.length);
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
            console.log("✅ Documentos del backend guardados:", formattedDocs.length);
            return;
          } else {
            // Si el backend devuelve array vacío, NO sobrescribir localStorage
            // En su lugar, cargar desde localStorage
            console.log("⚠️ Backend devolvió array vacío, cargando desde localStorage");
            if (savedDocs) {
              try {
                const localDocs = JSON.parse(savedDocs);
                const normalizedDocs = localDocs.map(doc => ({
                  ...doc,
                  name: doc.name || doc.filename || "Documento sin nombre",
                  date: doc.date || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("es-ES", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  }) : "Fecha desconocida")
                }));
                setDocuments(normalizedDocs);
                console.log("✅ Documentos cargados desde localStorage (backend vacío):", normalizedDocs.length);
                return;
              } catch (e) {
                console.error("Error al parsear documentos:", e);
              }
            }
            // Si no hay localStorage tampoco, dejar array vacío
            setDocuments([]);
            return;
          }
        }
      } catch (error) {
        console.log("Backend no disponible o error:", error);
      }
      
      // Si el backend no responde, cargar desde localStorage
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        try {
          const parsedDocs = JSON.parse(savedDocs);
          console.log("📦 Documentos cargados desde localStorage:", parsedDocs.length);
          // Asegurar que todos los documentos tengan name (puede ser filename o name)
          const normalizedDocs = parsedDocs.map(doc => ({
            ...doc,
            name: doc.name || doc.filename || "Documento sin nombre",
            date: doc.date || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("es-ES", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            }) : "Fecha desconocida")
          }));
          setDocuments(normalizedDocs);
          console.log("✅ Documentos normalizados y establecidos:", normalizedDocs.length);
        } catch (e) {
          console.error("Error al parsear documentos:", e);
          setDocuments([]);
        }
      } else {
        console.log("⚠️ No hay documentos en localStorage");
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
        createdAt: new Date().toISOString(), // Guardar fecha de creación para consistencia
        pages: data.document?.pages || 0,
        size: data.document?.textLength || 0,
        status: 'processed'
      };

      // Obtener documentos existentes de localStorage primero
      const existingDocs = localStorage.getItem("userDocuments");
      let currentDocs = [];
      if (existingDocs) {
        try {
          currentDocs = JSON.parse(existingDocs);
        } catch (e) {
          console.error("Error al parsear documentos existentes:", e);
        }
      }
      
      // Combinar con los documentos del estado actual
      const allDocs = [...documents, ...currentDocs];
      // Eliminar duplicados por ID
      const uniqueDocs = allDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      
      // Agregar el nuevo documento al inicio
      const updatedDocuments = [newDocument, ...uniqueDocs];
      setDocuments(updatedDocuments);
      
      // Guardar en localStorage para persistencia
      localStorage.setItem("userDocuments", JSON.stringify(updatedDocuments));
      console.log("✅ Documento guardado en localStorage:", newDocument);

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


  const handlePlay = async (docId, voiceType = null) => {
    console.log("handlePlay llamado para docId:", docId, "voiceType:", voiceType);
    
    try {
      // Si ya hay un audio reproduciéndose del mismo documento, pausar/reanudar
      if (playingAudio && playingAudio.docId === docId && audioRef.current) {
        // Usar reproductor HTML5 si está disponible
        if (audioRef.current.paused) {
          audioRef.current.play();
          setPlayingAudio(prev => ({ ...prev, isPaused: false }));
          return;
        } else {
          audioRef.current.pause();
          setPlayingAudio(prev => ({ ...prev, isPaused: true }));
          return;
        }
      }
      
      // Si hay otro audio reproduciéndose, detenerlo
      if (playingAudio && playingAudio.docId !== docId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        setPlayingAudio(null);
      }
      
      // Si no hay voz seleccionada para este documento, mostrar modal
      const selectedVoice = voiceType || documentVoices[docId];
      if (!selectedVoice) {
        setPendingDocId(docId);
        setShowVoiceModal(true);
        return;
      }
      
      // Mostrar indicador de carga
      setGeneratingAudio(docId);
      
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
        return;
      }
      
      // Usar gTTS para generar audio (permite control de posición)
      console.log("Generando audio con gTTS...");
      const ttsRes = await fetch('/api/v1/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: text.substring(0, 5000), 
          lang: 'es',
          voiceType: selectedVoice // Usar la voz seleccionada
        })
      });

      if (!ttsRes.ok) {
        const errorText = await ttsRes.text();
        console.error("Error del backend:", errorText);
        throw new Error('Error al generar el audio: ' + (errorText || ttsRes.statusText));
      }

      // Verificar que la respuesta sea audio
      const contentType = ttsRes.headers.get('content-type');
      console.log("Content-Type recibido:", contentType);
      
      if (!contentType || !contentType.includes('audio')) {
        const errorText = await ttsRes.text();
        console.error("El backend no devolvió audio, devolvió:", errorText);
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
      
      // Configurar reproductor HTML5
      if (!audioRef.current) {
        // Crear elemento audio si no existe
        const audio = document.createElement('audio');
        audioRef.current = audio;
      }
      
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playingAudio?.rate || 1.0;
      
      // Configurar eventos del reproductor
      audioRef.current.onloadedmetadata = () => {
        const duration = audioRef.current.duration;
        console.log("Audio cargado, duración:", duration, "segundos");
        
        setPlayingAudio({
          docId,
          progress: 0,
          isPaused: false,
          text: text,
          rate: playingAudio?.rate || 1.0,
          elapsedTime: 0,
          estimatedDuration: duration,
          audioUrl: audioUrl
        });
        
        // Limpiar el estado de generación cuando el audio está listo
        setGeneratingAudio(null);
      };
      
      audioRef.current.onplay = () => {
        console.log("Audio empezó a reproducirse");
        // Asegurar que el estado de generación esté limpio
        setGeneratingAudio(null);
      };
      
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && playingAudio && playingAudio.docId === docId) {
          const currentTime = audioRef.current.currentTime;
          const duration = audioRef.current.duration;
          const progress = (currentTime / duration) * 100;
          
          setPlayingAudio(prev => ({
            ...prev,
            progress: Math.round(progress),
            elapsedTime: currentTime
          }));
        }
      };
      
      audioRef.current.onended = () => {
        console.log("Audio terminado");
        setPlayingAudio(null);
        if (audioRef.current) {
          audioRef.current.src = '';
        }
        URL.revokeObjectURL(audioUrl);
      };
      
      audioRef.current.onerror = (error) => {
        console.error("Error en reproductor de audio:", error);
        alert("Error al reproducir el audio. Intenta de nuevo.");
        setPlayingAudio(null);
        setGeneratingAudio(null); // Limpiar estado de generación en caso de error
        URL.revokeObjectURL(audioUrl);
      };
      
      // Reproducir
      await audioRef.current.play();
      console.log("✅ Audio iniciado con reproductor HTML5");
      
    } catch (error) {
      console.error("Error al reproducir:", error);
      setGeneratingAudio(null); // Limpiar estado de generación en caso de error
      alert(error.message || "Error al reproducir el documento. Asegúrate de que el documento esté procesado.");
    }
  };

  const handlePills = (docId) => {
    navigate(`/dashboard/flashpills/${docId}`);
  };

  const handleVoiceSelect = (voiceType) => {
    if (pendingDocId) {
      // Guardar la preferencia de voz para este documento
      const newVoices = { ...documentVoices, [pendingDocId]: voiceType };
      setDocumentVoices(newVoices);
      localStorage.setItem("documentVoices", JSON.stringify(newVoices));
      
      // Cerrar modal y generar audio
      setShowVoiceModal(false);
      const docId = pendingDocId;
      setPendingDocId(null);
      
      // Generar audio con la voz seleccionada
      handlePlay(docId, voiceType);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este documento y sus audios? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      
      // Eliminar en el backend
      try {
        const res = await fetch(`/api/v1/documents/${docId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error("Error al eliminar documento en el backend");
        }
      } catch (error) {
        console.error("Error al eliminar documento en el backend:", error);
      }

      // Eliminar del localStorage
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        try {
          const docs = JSON.parse(savedDocs);
          const updatedDocs = docs.filter(doc => doc.id !== docId);
          localStorage.setItem("userDocuments", JSON.stringify(updatedDocs));
        } catch (error) {
          console.error("Error al actualizar localStorage:", error);
        }
      }
      
      // Eliminar del estado
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
      
      // Si el documento eliminado estaba reproduciéndose, detenerlo
      if (playingAudio && playingAudio.docId === docId) {
        setPlayingAudio(null);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      }
      
      if (generatingAudio === docId) {
        setGeneratingAudio(null);
      }

      alert("Documento eliminado exitosamente.");
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      alert("Error al eliminar documento. Intenta de nuevo.");
    }
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
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate("/dashboard/accessibility"); }}>
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48.44-85.25-64,40a8,8,0,0,1-8.17-11.5L160,128,104.28,97.25a8,8,0,0,1,8.17-11.5l64,40A8,8,0,0,1,176.44,130.75Z"></path>
            </svg>
            <span>Modo Accesibilidad</span>
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
                <div 
                  className="document-content"
                  onClick={() => navigate(`/dashboard/player/${doc.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="document-icon">
                    <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">
                      <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                    </svg>
                  </div>
                  <div className="document-info">
                    <p className="document-name">{doc.name || doc.filename || "Documento sin nombre"}</p>
                    <p className="document-date">Procesado el {doc.date}</p>
                  </div>
                  <div className="document-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn btn--play"
                      onClick={() => handlePlay(doc.id)}
                      disabled={generatingAudio === doc.id}
                    >
                      {generatingAudio === doc.id ? (
                        <>
                          <div className="spinner"></div>
                          <span>Generando...</span>
                        </>
                      ) : playingAudio && playingAudio.docId === doc.id && !playingAudio.isPaused ? (
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
                    <button 
                      className="btn btn--delete"
                      onClick={() => handleDeleteDocument(doc.id)}
                      title="Eliminar documento y sus audios"
                      style={{ 
                        background: 'transparent', 
                        color: '#ff4444',
                        border: '1px solid #ff4444',
                        padding: '8px 12px',
                        minWidth: 'auto'
                      }}
                    >
                      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
                {playingAudio && playingAudio.docId === doc.id && (
                  <div className="document-progress">
                    <div className="progress-header">
                      <span>En escucha</span>
                      <span>{playingAudio.progress}%</span>
                    </div>
                    <div 
                      className="progress-bar progress-bar--interactive"
                      onClick={(e) => {
                        if (!audioRef.current) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        const duration = audioRef.current.duration || playingAudio.estimatedDuration || 0;
                        const newTime = percentage * duration;
                        
                        // Cambiar posición sin pausar
                        audioRef.current.currentTime = newTime;
                        
                        // Actualizar estado
                        const progress = (newTime / duration) * 100;
                        setPlayingAudio(prev => ({
                          ...prev,
                          elapsedTime: newTime,
                          progress: Math.round(progress)
                        }));
                      }}
                    >
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

      {/* Modal para seleccionar tipo de voz */}
      {showVoiceModal && (
        <div className="voice-modal-overlay" onClick={() => {
          setShowVoiceModal(false);
          setPendingDocId(null);
        }}>
          <div className="voice-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Selecciona el tipo de voz</h3>
            <p>Elige el tipo de voz para generar el audio de este documento</p>
            <div className="voice-modal-buttons">
              <button
                className="voice-modal-btn"
                onClick={() => handleVoiceSelect('femenina')}
              >
                <span className="material-symbols-outlined">person</span>
                <span>Voz Femenina</span>
              </button>
              <button
                className="voice-modal-btn"
                onClick={() => handleVoiceSelect('masculina')}
              >
                <span className="material-symbols-outlined">person</span>
                <span>Voz Masculina</span>
              </button>
            </div>
            <button
              className="voice-modal-cancel"
              onClick={() => {
                setShowVoiceModal(false);
                setPendingDocId(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

