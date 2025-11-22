import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AccessibilityMode.css";

export default function AccessibilityMode() {
  const navigate = useNavigate();
  const [step, setStep] = useState('documents'); // 'documents', 'voice', 'mode', 'reading', 'chat'
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null); // 'masculina' | 'femenina'
  const [selectedMode, setSelectedMode] = useState(null); // 'reading' | 'pills'
  const [userInput, setUserInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const readingIntervalRef = useRef(null);
  const [readingTime, setReadingTime] = useState(0);

  // Cargar documentos al montar
  useEffect(() => {
    loadDocuments();
    initializeSpeechRecognition();
    
    return () => {
      // Cleanup
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (readingIntervalRef.current) {
        clearInterval(readingIntervalRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Iniciar el flujo cuando se cargan los documentos
  useEffect(() => {
    console.log("🔄 useEffect - step:", step, "documents.length:", documents.length);
    if (step === 'documents' && documents.length > 0) {
      console.log("✅ Iniciando speakDocumentsList con", documents.length, "documentos");
      speakDocumentsList();
    } else if (step === 'documents' && documents.length === 0) {
      console.log("⏳ Esperando documentos...");
    }
  }, [step, documents]);

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/v1/documents", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      let docs = [];
      if (res.ok) {
        const data = await res.json();
        docs = data.documents || [];
        console.log("📦 Documentos cargados del backend:", docs.length);
      }

      // Si no hay documentos en el backend, cargar desde localStorage
      if (docs.length === 0) {
        const savedDocs = localStorage.getItem("userDocuments");
        if (savedDocs) {
          docs = JSON.parse(savedDocs);
          console.log("📦 Documentos cargados de localStorage:", docs.length);
        }
      }

      console.log("✅ Total de documentos cargados:", docs.length);
      setDocuments(docs);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      // Intentar desde localStorage
      const savedDocs = localStorage.getItem("userDocuments");
      if (savedDocs) {
        const docs = JSON.parse(savedDocs);
        console.log("📦 Documentos cargados de localStorage (fallback):", docs.length);
        setDocuments(docs);
      } else {
        console.log("⚠️ No hay documentos disponibles");
        setDocuments([]);
      }
    }
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        // Cancelar timeout si se detectó algo
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }

        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        console.log("🎤 Texto reconocido:", transcript);
        
        // Extraer números del texto
        const numbers = transcript.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          console.log("✅ Número detectado:", numbers[0]);
          handleVoiceInput(numbers[0]);
          return;
        }

        // Mapeo de palabras a números en español
        const numberWords = {
          'uno': '1', 'un': '1', 'una': '1',
          'dos': '2',
          'tres': '3',
          'cuatro': '4',
          'cinco': '5',
          'seis': '6',
          'siete': '7',
          'ocho': '8',
          'nueve': '9',
          'diez': '10'
        };

        // Buscar palabras de números en el transcript
        for (const [word, num] of Object.entries(numberWords)) {
          if (transcript.includes(word)) {
            console.log(`✅ Número detectado (palabra "${word}"):`, num);
            handleVoiceInput(num);
            return;
          }
        }

        // Manejar respuestas de sí/no
        if (transcript.includes('sí') || transcript.includes('si') || transcript.includes('yes')) {
          if (step === 'chat') {
            handleChatQuestion();
            return;
          }
        }
        
        if (transcript.includes('no') || transcript.includes('not')) {
          if (step === 'chat') {
            continueReading();
            return;
          }
        }

        // Si no se detectó nada útil, informar al usuario
        console.log("⚠️ No se pudo detectar un número válido");
        speak("No pude detectar el número. Por favor, intenta de nuevo. Di el número claramente.", () => {
          setTimeout(() => {
            startListening();
          }, 500);
        });
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Error en reconocimiento de voz:", event.error);
        setIsListening(false);
        
        // Cancelar timeout si hay error
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }

        // Informar al usuario del error
        if (event.error === 'no-speech') {
          speak("No detecté ningún sonido. Por favor, intenta de nuevo.", () => {
            setTimeout(() => {
              startListening();
            }, 500);
          });
        } else if (event.error === 'audio-capture') {
          speak("No se pudo acceder al micrófono. Por favor, verifica los permisos.", () => {
            // No reiniciar automáticamente si hay problema con el micrófono
            console.log("❌ Problema con el micrófono, no se reiniciará automáticamente");
          });
        } else if (event.error === 'not-allowed') {
          speak("No se permitió el acceso al micrófono. Por favor, verifica los permisos del navegador.", () => {
            // No reiniciar automáticamente si no hay permisos
            console.log("❌ Sin permisos de micrófono, no se reiniciará automáticamente");
          });
        } else {
          speak("Hubo un error con el reconocimiento de voz. Por favor, intenta de nuevo.", () => {
            setTimeout(() => {
              startListening();
            }, 500);
          });
        }
      };

      recognitionRef.current.onend = () => {
        console.log("🔚 Reconocimiento terminó");
        setIsListening(false);
        
        // Si el timeout sigue activo, significa que no se detectó nada
        // Pero solo mostrar el mensaje si realmente no se procesó nada
        // (el timeout se cancela cuando se detecta algo en onresult)
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
          // Solo mostrar mensaje si no se procesó nada (el timeout se cancela en onresult si hay resultado)
          console.log("⏱️ Reconocimiento terminó sin resultado");
          // No reiniciar automáticamente aquí, el timeout ya maneja el mensaje
        }
      };
    }
  };

  const speak = (text, callback) => {
    // Cancelar cualquier síntesis de voz anterior y reconocimiento
    window.speechSynthesis.cancel();
    
    // Detener reconocimiento si está activo
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignorar errores al detener
      }
      setIsListening(false);
    }
    
    // Limpiar timeout si existe
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    
    // Esperar un momento para que se cancele completamente
    setTimeout(() => {
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      let callbackExecuted = false;

      utterance.onend = () => {
        setIsSpeaking(false);
        // Esperar un momento antes de ejecutar el callback para asegurar que el estado se actualice
        if (!callbackExecuted && callback) {
          callbackExecuted = true;
          setTimeout(() => {
            callback();
          }, 300); // Aumentar a 300ms para dar más tiempo
        }
      };

      utterance.onerror = (error) => {
        console.error("Error en síntesis de voz:", error);
        setIsSpeaking(false);
        // Solo ejecutar callback si no fue por interrupción
        if (!callbackExecuted && callback && error.error !== 'interrupted') {
          callbackExecuted = true;
          setTimeout(() => {
            callback();
          }, 300);
        }
      };

      window.speechSynthesis.speak(utterance);
    }, 200);
  };

  const speakDocumentsList = () => {
    console.log("📋 speakDocumentsList - documentos disponibles:", documents.length);
    if (documents.length === 0) {
      speak("No hay documentos disponibles. Por favor, sube un documento primero.", () => {
        setTimeout(() => navigate("/dashboard"), 2000);
      });
      return;
    }

    let text = "¿Qué documento quieres ver? ";
    documents.forEach((doc, index) => {
      const docName = (doc.name || doc.filename || "Documento sin nombre").replace(/\.pdf$/i, "");
      text += `Documento ${index + 1}: ${docName}. `;
    });
    text += `Di el número del documento que quieres ver, del 1 al ${documents.length}.`;
    console.log("🔊 Texto a pronunciar:", text);

    speak(text, () => {
      startListening();
    });
  };

  const startListening = () => {
    // Esperar más tiempo para asegurar que el speech synthesis haya terminado completamente
    setTimeout(() => {
      // Verificar que no esté hablando
      if (isSpeaking) {
        console.log("⚠️ Aún está hablando, esperando...");
        setTimeout(() => startListening(), 500);
        return;
      }

      if (recognitionRef.current) {
        // Verificar si ya está escuchando
        if (isListening) {
          console.log("⚠️ Ya está escuchando, no iniciar de nuevo");
          return;
        }

        // Detener cualquier reconocimiento anterior que pueda estar activo
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorar errores al detener
        }

        // Esperar un momento después de detener
        setTimeout(() => {
          setIsListening(true);
          
          // Limpiar timeout anterior si existe
          if (recognitionTimeoutRef.current) {
            clearTimeout(recognitionTimeoutRef.current);
          }
          
          // Configurar timeout de 10 segundos
          recognitionTimeoutRef.current = setTimeout(() => {
            console.log("⏱️ Timeout de 10 segundos alcanzado");
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                console.log("Error al detener reconocimiento:", e);
              }
            }
            setIsListening(false);
            const timeoutId = recognitionTimeoutRef.current;
            recognitionTimeoutRef.current = null;
            
          // Solo mostrar mensaje si el timeout sigue siendo el mismo (no fue cancelado)
          if (timeoutId) {
            speak("No detecté el número que dijiste después de 10 segundos. Por favor, intenta de nuevo. Di el número claramente o escríbelo en el campo de texto.", () => {
              // Reiniciar el reconocimiento automáticamente después del mensaje
              console.log("🔄 Reiniciando reconocimiento después del timeout");
              setTimeout(() => {
                startListening();
              }, 500);
            });
          }
          }, 10000); // 10 segundos
          
          try {
            // Verificar el estado antes de iniciar
            if (recognitionRef.current) {
              recognitionRef.current.start();
              console.log("🎤 Iniciando reconocimiento de voz...");
            }
          } catch (error) {
            console.error("Error al iniciar reconocimiento:", error);
            setIsListening(false);
            if (recognitionTimeoutRef.current) {
              clearTimeout(recognitionTimeoutRef.current);
              recognitionTimeoutRef.current = null;
            }
            // No mostrar mensaje de error si es porque ya está iniciado
            if (!error.message || !error.message.includes('already started')) {
              speak("No se pudo iniciar el reconocimiento de voz. Por favor, usa el campo de texto para escribir el número.", () => {
                // No hacer nada más
              });
            }
          }
        }, 200);
      } else {
        // Fallback: usar input de teclado
        setUserInput('');
        speak("El reconocimiento de voz no está disponible. Por favor, usa el campo de texto para escribir el número.", () => {
          // No hacer nada más
        });
      }
    }, 800); // Esperar 800ms después de que termine de hablar
  };

  const handleVoiceInput = (input) => {
    console.log("🔍 handleVoiceInput llamado con:", input, "step:", step, "documents.length:", documents.length);
    const number = parseInt(input);
    console.log("🔢 Número parseado:", number, "isNaN:", isNaN(number));
    
    if (step === 'documents') {
      if (!isNaN(number) && number >= 1 && number <= documents.length) {
        const doc = documents[number - 1];
        console.log("✅ Documento seleccionado:", doc);
        if (doc) {
          setSelectedDocument(doc);
          speak(`Has seleccionado el documento ${number}: ${(doc.name || doc.filename || "Documento").replace(/\.pdf$/i, "")}. `, () => {
            setStep('voice');
            setTimeout(() => askVoiceType(), 1000);
          });
        } else {
          console.error("❌ Documento no encontrado en índice:", number - 1);
          const maxDoc = documents.length;
          speak(`Error: No se encontró el documento ${number}. Por favor, di un número del 1 al ${maxDoc}.`, () => {
            startListening();
          });
        }
      } else {
        const maxDoc = documents.length;
        console.error("❌ Número inválido:", number, "rango esperado: 1 a", maxDoc);
        speak(`Número inválido. Por favor, di un número del 1 al ${maxDoc}.`, () => {
          startListening();
        });
      }
    } else if (step === 'voice') {
      if (number === 1) {
        setSelectedVoice('masculina');
        speak("Has seleccionado voz masculina.", () => {
          setStep('mode');
          setTimeout(() => askMode(), 1000);
        });
      } else if (number === 2) {
        setSelectedVoice('femenina');
        speak("Has seleccionado voz femenina.", () => {
          setStep('mode');
          setTimeout(() => askMode(), 1000);
        });
      } else {
        speak("Por favor, di 1 para voz masculina o 2 para voz femenina.", () => {
          startListening();
        });
      }
    } else if (step === 'mode') {
      if (number === 1) {
        setSelectedMode('reading');
        speak("Has seleccionado lectura normal. Iniciando la lectura del documento.", () => {
          setStep('reading');
          setTimeout(() => startReading(), 1000);
        });
      } else if (number === 2) {
        setSelectedMode('pills');
        speak("Has seleccionado flash pills. Redirigiendo a flash pills.", () => {
          navigate(`/dashboard/flashpills/${selectedDocument.id}`);
        });
      } else {
        speak("Por favor, di 1 para lectura normal o 2 para flash pills.", () => {
          startListening();
        });
      }
    } else if (step === 'chat') {
      if (number === 1 || input.toLowerCase().includes('sí') || input.toLowerCase().includes('si')) {
        handleChatQuestion();
      } else if (number === 2 || input.toLowerCase().includes('no')) {
        continueReading();
      } else {
        speak("Por favor, di 1 o sí para hacer una pregunta, o di 2 o no para continuar.", () => {
          startListening();
        });
      }
    }
  };

  const askVoiceType = () => {
    speak("¿Quieres voz femenina o masculina? Di 1 si masculina, di 2 si femenina.", () => {
      startListening();
    });
  };

  const askMode = () => {
    speak("¿Quieres proceder con la lectura normal o leer los flash pills? Di 1 para lectura normal, di 2 para flash pills.", () => {
      startListening();
    });
  };

  const startReading = async () => {
    if (!selectedDocument) return;

    try {
      const token = localStorage.getItem("authToken");
      
      // Obtener el texto del documento
      let text = selectedDocument.text;
      if (!text) {
        const res = await fetch(`/api/v1/documents/${selectedDocument.id}/text`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          text = data.text;
        }
      }

      if (!text) {
        speak("No se pudo obtener el texto del documento.", () => {
          setStep('documents');
          setTimeout(() => speakDocumentsList(), 1000);
        });
        return;
      }

      // Generar audio con el backend
      const ttsRes = await fetch('/api/v1/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text.substring(0, 5000),
          lang: 'es',
          voiceType: selectedVoice
        })
      });

      if (!ttsRes.ok) {
        throw new Error('Error al generar audio');
      }

      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Reproducir audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();

      // Iniciar contador de tiempo
      setReadingTime(0);
      readingIntervalRef.current = setInterval(() => {
        setReadingTime(prev => {
          const newTime = prev + 1;
          // Cada 1 minuto (60 segundos), ofrecer hacer preguntas
          if (newTime % 60 === 0 && newTime > 0) {
            audio.pause();
            speak("Han pasado " + (newTime / 60) + " minutos. ¿Quieres hacer una pregunta al asistente? Di sí para hacer una pregunta o di no para continuar.", () => {
              setStep('chat');
              startListening();
            });
          }
          return newTime;
        });
      }, 1000);

      audio.onended = () => {
        if (readingIntervalRef.current) {
          clearInterval(readingIntervalRef.current);
        }
        speak("Lectura completada. ¿Quieres hacer una pregunta al asistente o volver al inicio? Di 1 para hacer una pregunta, di 2 para volver al inicio.", () => {
          setStep('chat');
          startListening();
        });
      };

      audio.onerror = () => {
        if (readingIntervalRef.current) {
          clearInterval(readingIntervalRef.current);
        }
        speak("Error al reproducir el audio.", () => {
          setStep('documents');
          setTimeout(() => speakDocumentsList(), 1000);
        });
      };

    } catch (error) {
      console.error("Error al iniciar lectura:", error);
      speak("Error al iniciar la lectura. Por favor, intenta de nuevo.", () => {
        setStep('documents');
        setTimeout(() => speakDocumentsList(), 1000);
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && userInput.trim()) {
      const number = parseInt(userInput.trim());
      if (!isNaN(number)) {
        handleVoiceInput(number.toString());
        setUserInput('');
      }
    }
  };

  const handleChatQuestion = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (readingIntervalRef.current) {
      clearInterval(readingIntervalRef.current);
    }
    speak("Redirigiendo al chat para hacer tu pregunta.", () => {
      navigate(`/dashboard/chat/${selectedDocument.id}`);
    });
  };

  const continueReading = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setStep('reading');
      speak("Continuando con la lectura.", () => {
        // No hacer nada más, solo continuar
      });
    } else {
      setStep('documents');
      setTimeout(() => speakDocumentsList(), 1000);
    }
  };

  return (
    <div className="accessibility-mode">
      <div className="accessibility-container">
        <h1 className="accessibility-title">Modo de Accesibilidad</h1>
        
        <div className="accessibility-status">
          <p className="status-text">
            <strong>Estado:</strong> {
              step === 'documents' && 'Seleccionando documento'
            }
            {step === 'voice' && 'Seleccionando voz'}
            {step === 'mode' && 'Seleccionando modo'}
            {step === 'reading' && 'Leyendo documento'}
            {step === 'chat' && 'Esperando pregunta'}
          </p>
          
          {isListening && (
            <p className="listening-indicator">
              <span className="indicator-icon">🎤</span> Escuchando...
            </p>
          )}
          {isSpeaking && (
            <p className="speaking-indicator">
              <span className="indicator-icon">🔊</span> Hablando...
            </p>
          )}
        </div>

        {step === 'reading' && (
          <div className="reading-info">
            <p>Tiempo de lectura: {Math.floor(readingTime / 60)} minutos {readingTime % 60} segundos</p>
          </div>
        )}

        <div className="accessibility-input">
          <p className="input-label">
            <strong>También puedes escribir el número aquí:</strong>
          </p>
          <input
            type="number"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe el número"
            min="1"
            max={documents.length}
            disabled={isSpeaking || isListening}
          />
        </div>

        <button 
          className="btn-exit"
          onClick={() => {
            window.speechSynthesis.cancel();
            if (audioRef.current) {
              audioRef.current.pause();
            }
            navigate("/dashboard");
          }}
        >
          <span>Salir del modo de accesibilidad</span>
        </button>
      </div>
    </div>
  );
}

