import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function CalendarSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');

  useEffect(() => {
    // Guardar el userId en localStorage
    if (userId) {
      localStorage.setItem('userEmail', userId);
      console.log('✅ Google Calendar conectado para:', userId);
      console.log('✅ userId guardado en localStorage como userEmail');
    } else {
      console.warn('⚠️ No se recibió userId en la URL');
    }

    // Redirigir al dashboard después de 2 segundos
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [userId, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '20px'
        }}>
          ✅
        </div>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>
          ¡Google Calendar conectado!
        </h1>
        <p style={{ margin: '0 0 20px 0', opacity: 0.9 }}>
          Tu cuenta de Google Calendar ha sido conectada exitosamente.
          Ahora puedes programar repasos de Flash Pills.
        </p>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
          Redirigiendo al dashboard...
        </p>
      </div>
    </div>
  );
}

