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
  const [showVoiceCustomModal, setShowVoiceCustomModal] = useState(false); // Modal para estilos personalizados
  const voiceStyles = {
    profesor: {
      name: "Profesor Estricto",
      description: "Voz masculina adulta en español, autoritaria y formal, con tono claro y preciso, articulación perfecta, ritmo moderado y enfático, como un profesor universitario estricto que explica conceptos importantes.",
      icon: "school",
      voiceType: "masculina", // Automáticamente masculina
      getIntroduction: (docName) => `Hola, quiero concentración máxima. El día de hoy vamos a ver el siguiente contenido: "${docName}".`
    },
    podcast: {
      name: "Podcast Animador",
      description: "Voz masculina adulta en español, muy dinámica, extrovertida y entusiasta, con tono muy amigable, conversacional y energético, ritmo variado y muy expresivo, como un presentador de podcast muy animado y carismático que mantiene la atención del oyente con gran energía.",
      icon: "podcasts",
      voiceType: "masculina", // Automáticamente masculina
      getIntroduction: (docName) => `Hola a todos y todas, ¿cómo están? En el capítulo de hoy vamos a hablar sobre el texto: "${docName}". Empecemos.`
    },
    cuentos: {
      name: "Cuentos para Dormir",
      description: "Voz femenina adulta en español, suave y relajante, con tono cálido y acogedor, ritmo lento y pausado, como una narradora de cuentos que ayuda a relajarse y conciliar el sueño.",
      icon: "bedtime",
      voiceType: "femenina", // Automáticamente femenina
      getIntroduction: (docName) => `Hola, empecemos esta sesión para conciliar el sueño. Relájate y acomódate. El texto del día de hoy es "${docName}".`
    }
  };
  const [showText, setShowText] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [showChat, setShowChat] = useState(false); // Estado para mostrar/ocultar chat
  const [chatMessages, setChatMessages] = useState([]); // Mensajes del chat
  const [chatInput, setChatInput] = useState(""); // Input del chat
  const [chatLoading, setChatLoading] = useState(false); // Loading del chat
  const [chatModel, setChatModel] = useState('gemini-2.5-flash'); // Modelo de Gemini a usar
  const [textPosition, setTextPosition] = useState(0); // Posición actual en el texto (en caracteres)
  const [currentVoiceStyle, setCurrentVoiceStyle] = useState(null); // Estilo de voz actual para sincronización
  const currentAudioUrlRef = useRef(null); // Para limpiar URLs de blob anteriores
  const audioContextRef = useRef(null); // Web Audio API context
  const sourceNodeRef = useRef(null); // Audio source node para aplicar pitch
  const gainNodeRef = useRef(null); // Gain node para control de volumen
  const messagesEndRef = useRef(null); // Para scroll automático en chat
  const textContainerRef = useRef(null); // Para scroll automático del texto

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
    
    // Cleanup: detener audio cuando el componente se desmonte
    return () => {
      console.log("🛑 Deteniendo audio al salir del Player");
      // Detener audio HTML5
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        // Limpiar event listeners
        audioRef.current.onloadedmetadata = null;
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onplay = null;
      }
      
      // Limpiar Web Audio API
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {
          // Ignorar errores si ya está detenido
        }
        sourceNodeRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      
      // Limpiar URL de blob
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
      
      // Limpiar estados
      setIsPlaying(false);
      setGeneratingAudio(false);
    };
  }, [documentId]);
  
  // Cargar historial de chat guardado cuando se abre el chat o cambia el documento
  useEffect(() => {
    if (showChat && documentId) {
      const chatHistoryKey = `chat_history_${documentId}`;
      const savedHistory = localStorage.getItem(chatHistoryKey);
      
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          // Convertir timestamps de string a Date
          const messagesWithDates = parsedHistory.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setChatMessages(messagesWithDates);
          console.log(`✅ Historial de chat cargado: ${messagesWithDates.length} mensajes`);
        } catch (error) {
          console.error("Error al cargar historial de chat:", error);
          // Si hay error, mostrar mensaje de bienvenida
          if (documentData) {
            setChatMessages([{
              id: "welcome",
              role: "assistant",
              content: `¡Hola! Soy tu asistente de AudIA. Puedo ayudarte a entender el contenido del documento "${documentData?.name || documentData?.filename || 'este documento'}". ¿Sobre qué te gustaría preguntar?`,
              timestamp: new Date()
            }]);
          }
        }
      } else if (documentData) {
        // Si no hay historial, mostrar mensaje de bienvenida
        setChatMessages([{
          id: "welcome",
          role: "assistant",
          content: `¡Hola! Soy tu asistente de AudIA. Puedo ayudarte a entender el contenido del documento "${documentData?.name || documentData?.filename || 'este documento'}". ¿Sobre qué te gustaría preguntar?`,
          timestamp: new Date()
        }]);
      }
    } else if (!showChat) {
      // Limpiar mensajes cuando se cierra el chat (pero mantener en localStorage)
      // No limpiar aquí, solo cuando se cierra completamente
    }
  }, [showChat, documentId, documentData]);
  
  // Guardar historial en localStorage cada vez que cambien los mensajes
  useEffect(() => {
    if (documentId && chatMessages.length > 0) {
      const chatHistoryKey = `chat_history_${documentId}`;
      try {
        localStorage.setItem(chatHistoryKey, JSON.stringify(chatMessages));
        console.log(`💾 Historial de chat guardado: ${chatMessages.length} mensajes`);
      } catch (error) {
        console.error("Error al guardar historial de chat:", error);
      }
    }
  }, [chatMessages, documentId]);
  
  // Scroll automático en chat
  useEffect(() => {
    if (showChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);
  
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

  const generateAudio = async (voiceTypeToUse = null, voiceStyleToUse = null) => {
    if (!documentData || !documentData.text) return;
    
    // Usar el voiceType pasado como parámetro, o el estado actual si no se proporciona
    const finalVoiceType = voiceTypeToUse !== null ? voiceTypeToUse : voiceType;
    const finalVoiceStyle = voiceStyleToUse || null;
    const styleConfig = finalVoiceStyle ? voiceStyles[finalVoiceStyle] : null;
    
    console.log(`🎵 Generando audio con voz: ${finalVoiceType}${finalVoiceStyle ? `, estilo: ${finalVoiceStyle} - ${styleConfig?.name}` : ''}`);
    
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
      
      let lang = "es"; // Español por defecto
      
      // Preparar el texto con introducción si hay un estilo personalizado
      let textToSend = documentData.text.substring(0, 5000);
      let introductionLength = 0;
      
      if (finalVoiceStyle && styleConfig) {
        // Guardar el estilo actual para sincronización
        setCurrentVoiceStyle(finalVoiceStyle);
        
        // Obtener el nombre del documento sin extensión
        const docName = (documentData.name || documentData.filename || "documento")
          .replace(/\.pdf$/i, "")
          .trim();
        
        // Generar la introducción personalizada
        const introduction = styleConfig.getIntroduction(docName);
        introductionLength = introduction.length + 1; // +1 por el espacio
        
        // Combinar introducción + texto del documento
        // Asegurar que no exceda 5000 caracteres en total
        const maxTextLength = 5000 - introductionLength - 10; // 10 caracteres de margen
        const documentText = documentData.text.substring(0, Math.max(0, maxTextLength));
        textToSend = `${introduction} ${documentText}`;
        
        console.log(`📝 Texto con introducción: "${introduction.substring(0, 50)}..." + documento (${textToSend.length} caracteres totales, intro: ${introductionLength})`);
      } else {
        // Si no hay estilo personalizado, limpiar el estilo guardado
        setCurrentVoiceStyle(null);
      }
      
      const requestBody = {
        text: textToSend, 
        lang: lang,
        voiceType: finalVoiceType
      };
      
      // Si hay un estilo personalizado, agregarlo
      if (finalVoiceStyle && styleConfig) {
        requestBody.voiceStyle = finalVoiceStyle;
        requestBody.voiceDescription = styleConfig.description;
      }
      
      console.log(`📤 Enviando request TTS: textLength=${textToSend.length}, lang=${lang}, voiceType=${finalVoiceType}${finalVoiceStyle ? `, voiceStyle=${finalVoiceStyle}` : ''}`);
      
      const ttsRes = await fetch('/api/v1/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
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
        
        // Resetear posición del texto al inicio cuando se carga nuevo audio
        if (documentData?.text) {
          setTextPosition(0);
        }
        
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
        if (audioRef.current && audioRef.current.duration) {
          const newTime = audioRef.current.currentTime;
          const currentDuration = audioRef.current.duration;
          setCurrentTime(newTime);
          
          // Actualizar duración si cambió
          if (currentDuration !== duration) {
            setDuration(currentDuration);
          }
          
          // Actualizar posición en el texto basándose en el progreso del audio
          if (documentData?.text && currentDuration > 0 && !isNaN(currentDuration)) {
            const progress = Math.min(Math.max(newTime / currentDuration, 0), 1); // Asegurar entre 0 y 1
            
            // Si hay un estilo personalizado con introducción, necesitamos ajustar el cálculo
            // porque el audio incluye la introducción pero el texto mostrado no
            let textLength = documentData.text.length;
            let newPosition = 0;
            
            if (currentVoiceStyle && voiceStyles[currentVoiceStyle]) {
              // Calcular la longitud total del audio (introducción + texto)
              const docName = (documentData.name || documentData.filename || "documento")
                .replace(/\.pdf$/i, "")
                .trim();
              const introduction = voiceStyles[currentVoiceStyle].getIntroduction(docName);
              const introductionLength = introduction.length + 1; // intro + espacio
              const totalAudioLength = introductionLength + textLength; // intro + texto
              
              // Estimar la duración de la introducción basándose en la duración total del audio
              // Asumimos que la velocidad de lectura es constante
              const introductionDurationRatio = introductionLength / totalAudioLength;
              const introductionDuration = currentDuration * introductionDurationRatio;
              
              // Si estamos en la parte de la introducción, posición = 0
              if (newTime < introductionDuration) {
                newPosition = 0; // Aún en la introducción
              } else {
                // Estamos en la parte del documento, calcular posición relativa
                // Tiempo que ha pasado desde que empezó el documento
                const documentTime = newTime - introductionDuration;
                // Duración del documento (sin introducción)
                const documentDuration = currentDuration - introductionDuration;
                // Progreso dentro del documento (0 a 1)
                const documentProgress = documentTime / documentDuration;
                // Calcular posición en el texto
                newPosition = Math.min(Math.max(Math.floor(documentProgress * textLength), 0), textLength);
              }
            } else {
              // Sin introducción, cálculo normal
              newPosition = Math.min(Math.max(Math.floor(progress * textLength), 0), textLength);
            }
            
            // Actualizar posición (sin throttling para movimiento suave)
            setTextPosition(newPosition);
            
            // Scroll automático para mantener visible el texto actual (solo si está visible y reproduciendo)
            if (showText && textContainerRef.current && isPlaying) {
              // Throttle el scroll para mejor rendimiento (cada ~800ms)
              if (!textContainerRef.current._lastScrollTime || Date.now() - textContainerRef.current._lastScrollTime > 800) {
                textContainerRef.current._lastScrollTime = Date.now();
                requestAnimationFrame(() => {
                  try {
                    // Calcular posición aproximada del texto actual en el contenedor
                    const scrollPosition = (newPosition / textLength) * textContainerRef.current.scrollHeight;
                    
                    // Scroll suave hacia la posición actual
                    textContainerRef.current.scrollTo({
                      top: scrollPosition - textContainerRef.current.clientHeight / 2,
                      behavior: 'smooth'
                    });
                  } catch (e) {
                    // Ignorar errores de scroll
                  }
                });
              }
            }
          }
        }
      };
      
      audioRef.current.onended = () => {
        console.log("Audio terminó");
        setIsPlaying(false);
        setCurrentTime(0);
        // Resetear posición del texto al final
        if (documentData?.text) {
          setTextPosition(documentData.text.length);
        }
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
      
      // Actualizar posición en el texto cuando se adelanta/retrocede
      if (documentData?.text && duration > 0) {
        const progress = Math.min(newTime / duration, 1);
        let textLength = documentData.text.length;
        let newPosition = 0;
        
        // Ajustar cálculo si hay introducción
        if (currentVoiceStyle && voiceStyles[currentVoiceStyle]) {
          const docName = (documentData.name || documentData.filename || "documento")
            .replace(/\.pdf$/i, "")
            .trim();
          const introduction = voiceStyles[currentVoiceStyle].getIntroduction(docName);
          const introductionLength = introduction.length + 1;
          const totalAudioLength = introductionLength + textLength;
          
          // Estimar duración de introducción
          const introductionDurationRatio = introductionLength / totalAudioLength;
          const introductionDuration = duration * introductionDurationRatio;
          
          if (newTime < introductionDuration) {
            newPosition = 0;
          } else {
            const documentTime = newTime - introductionDuration;
            const documentDuration = duration - introductionDuration;
            const documentProgress = documentTime / documentDuration;
            newPosition = Math.min(Math.max(Math.floor(documentProgress * textLength), 0), textLength);
          }
        } else {
          newPosition = Math.min(Math.max(Math.floor(progress * textLength), 0), textLength);
        }
        
        setTextPosition(newPosition);
        
        // Scroll automático para mantener visible el texto actual
        if (showText && textContainerRef.current) {
          setTimeout(() => {
            try {
              const textLength = documentData.text.length;
              const scrollPosition = (newPosition / textLength) * textContainerRef.current.scrollHeight;
              textContainerRef.current.scrollTo({
                top: scrollPosition - textContainerRef.current.clientHeight / 2,
                behavior: 'smooth'
              });
            } catch (e) {
              // Ignorar errores de scroll
            }
          }, 150);
        }
      }
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.min(Math.max(clickX / rect.width, 0), 1); // Asegurar entre 0 y 1
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Actualizar posición en el texto cuando se hace click en la barra
    if (documentData?.text && duration > 0) {
      let textLength = documentData.text.length;
      let newPosition = 0;
      
      // Ajustar cálculo si hay introducción
      if (currentVoiceStyle && voiceStyles[currentVoiceStyle]) {
        const docName = (documentData.name || documentData.filename || "documento")
          .replace(/\.pdf$/i, "")
          .trim();
        const introduction = voiceStyles[currentVoiceStyle].getIntroduction(docName);
        const introductionLength = introduction.length + 1;
        const totalAudioLength = introductionLength + textLength;
        
        // Estimar duración de introducción
        const introductionDurationRatio = introductionLength / totalAudioLength;
        const introductionDuration = duration * introductionDurationRatio;
        const clickedTime = percentage * duration;
        
        if (clickedTime < introductionDuration) {
          newPosition = 0;
        } else {
          const documentTime = clickedTime - introductionDuration;
          const documentDuration = duration - introductionDuration;
          const documentProgress = documentTime / documentDuration;
          newPosition = Math.min(Math.max(Math.floor(documentProgress * textLength), 0), textLength);
        }
      } else {
        newPosition = Math.min(Math.max(Math.floor(percentage * textLength), 0), textLength);
      }
      
      setTextPosition(newPosition);
      
      // Scroll automático para mantener visible el texto actual
      if (showText && textContainerRef.current) {
        setTimeout(() => {
          try {
            const scrollPosition = (newPosition / textLength) * textContainerRef.current.scrollHeight;
            textContainerRef.current.scrollTo({
              top: scrollPosition - textContainerRef.current.clientHeight / 2,
              behavior: 'smooth'
            });
          } catch (e) {
            // Ignorar errores de scroll
          }
        }, 150);
      }
    }
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

  const handleVoiceStyleSelect = async (voiceStyle) => {
    console.log(`🎨 Seleccionando estilo de voz personalizada: ${voiceStyle}`);
    
    const styleConfig = voiceStyles[voiceStyle];
    if (!styleConfig) {
      console.error(`Estilo ${voiceStyle} no encontrado`);
      return;
    }
    
    // Actualizar el voiceType automáticamente según el estilo
    const newVoiceType = styleConfig.voiceType;
    console.log(`🔄 Cambiando voz a ${newVoiceType} automáticamente para estilo ${voiceStyle}`);
    
    // Guardar preferencia de voz
    const savedVoices = localStorage.getItem("documentVoices");
    const voices = savedVoices ? JSON.parse(savedVoices) : {};
    voices[documentId] = newVoiceType;
    localStorage.setItem("documentVoices", JSON.stringify(voices));
    
    // Actualizar el estado
    setVoiceType(newVoiceType);
    
    // Cerrar el modal
    setShowVoiceCustomModal(false);
    
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
    
    // Regenerar audio con el estilo personalizado (usando el voiceType del estilo)
    console.log(`🎵 Regenerando audio con estilo personalizado ${voiceStyle} (voz: ${newVoiceType})...`);
    await generateAudio(newVoiceType, voiceStyle); // Pasar el voiceType del estilo y el nuevo estilo
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

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      
      // Preparar historial de conversación (últimos 5 mensajes)
      const conversationHistory = chatMessages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const res = await fetch(`/api/v1/documents/${documentId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: chatInput,
          conversationHistory: conversationHistory,
          model: chatModel
        })
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("DOCUMENT_NOT_FOUND");
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al obtener respuesta");
      }

      const data = await res.json();
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Lo siento, no pude procesar tu pregunta.",
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      let errorContent = "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.";
      
      if (error.message === "DOCUMENT_NOT_FOUND") {
        errorContent = "⚠️ Este documento solo existe en localStorage. Por favor, súbelo nuevamente desde el Dashboard para poder usar el asistente.";
      } else if (error.message) {
        errorContent = `Error: ${error.message}`;
      }
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
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
    <div className={`player-container ${showChat ? 'player-with-chat' : ''}`}>
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
        <div className={`player-content ${showChat ? 'player-content-with-chat' : ''}`}>
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
                <div className="text-preview-container" ref={textContainerRef}>
                  <div className="text-preview">
                    {documentData.text ? (
                      <div className="text-with-progress">
                        {documentData.text.split('').map((char, index) => {
                          // Calcular opacidad y peso según la posición
                          let opacity = 0.3; // Opacidad base (medio transparente)
                          let fontWeight = 400; // Peso base
                          
                          if (index < textPosition) {
                            // Texto ya leído: opacidad completa y peso normal
                            opacity = 1.0;
                            fontWeight = 400;
                          } else if (index === textPosition) {
                            // Posición actual: destacar con mayor opacidad y peso
                            opacity = 1.0;
                            fontWeight = 700;
                          } else {
                            // Texto no leído: mantener opacidad baja
                            opacity = 0.3;
                            fontWeight = 400;
                          }
                          
                          return (
                            <span
                              key={index}
                              style={{
                                opacity: opacity,
                                fontWeight: fontWeight,
                                transition: 'opacity 0.1s ease, font-weight 0.1s ease'
                              }}
                            >
                              {char === ' ' ? '\u00A0' : char}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p>No hay texto disponible</p>
                    )}
                  </div>
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
            <button 
              className="action-btn"
              onClick={() => setShowVoiceCustomModal(true)}
            >
              <span className="material-symbols-outlined">tune</span>
              <span>Voz personalizada</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate(`/dashboard/flashpills/${documentId}`)}
            >
              <span className="material-symbols-outlined">auto_stories</span>
              <span>Flash Pills</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => {
                setShowChat(!showChat);
                // El historial se carga automáticamente en el useEffect cuando showChat cambia
              }}
            >
              <span className="material-symbols-outlined">chat</span>
              <span>{showChat ? "Cerrar chat" : "Conversa con AudIA"}</span>
            </button>
          </div>
        </div>
        
        {/* Modal de voz personalizada */}
        {showVoiceCustomModal && (
          <div className="voice-modal-overlay" onClick={() => setShowVoiceCustomModal(false)}>
            <div className="voice-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Selecciona un estilo de voz personalizada</h3>
              <p>Elige el estilo que mejor se adapte a tu contenido</p>
              <div className="voice-modal-buttons" style={{ flexDirection: 'column', gap: '12px' }}>
                {Object.entries(voiceStyles).map(([key, style]) => (
                  <button
                    key={key}
                    className="voice-modal-btn"
                    onClick={() => handleVoiceStyleSelect(key)}
                    disabled={generatingAudio}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', textAlign: 'left', padding: '16px' }}
                  >
                    <span className="material-symbols-outlined" style={{ marginRight: '12px', flexShrink: 0 }}>{style.icon}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', marginBottom: '4px', fontSize: '16px' }}>{style.name}</strong>
                      <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, lineHeight: '1.4' }}>{style.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                className="voice-modal-cancel"
                onClick={() => setShowVoiceCustomModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {showChat && (
          <div className="player-chat-panel">
            <div className="chat-panel-header">
              <div>
                <h3>Conversa con AudIA</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(234, 231, 246, 0.7)', fontWeight: 'normal' }}>
                    Modelo:
                  </span>
                  <select
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value)}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(124, 77, 255, 0.3)',
                      background: 'rgba(124, 77, 255, 0.1)',
                      color: 'var(--text, #eae7f6)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-pro">gemini-pro</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="close-chat-btn"
                  onClick={() => {
                    const chatHistoryKey = `chat_history_${documentId}`;
                    const confirmClear = window.confirm("¿Deseas limpiar el historial de conversación?");
                    if (confirmClear) {
                      localStorage.removeItem(chatHistoryKey);
                      setChatMessages([{
                        id: "welcome",
                        role: "assistant",
                        content: `¡Hola! Soy tu asistente de AudIA. Puedo ayudarte a entender el contenido del documento "${documentData?.name || documentData?.filename || 'este documento'}". ¿Sobre qué te gustaría preguntar?`,
                        timestamp: new Date()
                      }]);
                    }
                  }}
                  title="Limpiar historial"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
                <button 
                  className="close-chat-btn"
                  onClick={() => setShowChat(false)}
                  title="Cerrar chat"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            
            <div className="chat-panel-messages">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message chat-message--${message.role}`}
                >
                  <div className="chat-message-content">
                    <p>{message.content}</p>
                  </div>
                  <div className="chat-message-time">
                    {message.timestamp.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="chat-message chat-message--assistant">
                  <div className="chat-message-content">
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
            
            <div className="chat-panel-input">
              <textarea
                className="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleChatKeyPress}
                placeholder="Escribe tu pregunta aquí..."
                rows={1}
                disabled={chatLoading}
              />
              <button
                className="chat-send-btn"
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

