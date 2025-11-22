import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function CalendarError() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    // Redirigir al dashboard después de 5 segundos
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
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
          ❌
        </div>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>
          Error al conectar Google Calendar
        </h1>
        <p style={{ margin: '0 0 20px 0', opacity: 0.9 }}>
          {error ? decodeURIComponent(error) : 'Ocurrió un error al intentar conectar tu cuenta de Google Calendar.'}
        </p>
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#f5576c',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
          >
            Volver al Dashboard
          </button>
        </div>
        <p style={{ margin: '20px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
          Redirigiendo automáticamente en 5 segundos...
        </p>
      </div>
    </div>
  );
}

