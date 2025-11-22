import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validación básica
    if (!formData.email || !formData.password) {
      setError("Por favor completa todos los campos");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // Login exitoso - guardar datos en localStorage
      if (data.success && data.user && data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Redirigir al dashboard
        navigate("/dashboard");
      } else {
        setError("Error inesperado en la respuesta del servidor");
      }
    } catch (err) {
      console.error("Error de login:", err);
      setError("Error de conexión. Verifica que el backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="login-icon">
              <span className="brand__icon" />
            </div>
            <h1 className="login-title">Bienvenido a AudIA</h1>
            <p className="login-subtitle">
              Inicia sesión para acceder a todas las funcionalidades
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox" />
                <span>Recordarme</span>
              </label>
              <a href="#" className="link-forgot">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button 
              type="submit" 
              className="btn btn--login"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer">
            <p>
              ¿No tienes una cuenta?{" "}
              <Link to="/features" className="link-register">
                Regístrate aquí
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="divider">
            <span>o continúa con</span>
          </div>

          {/* Social Login */}
          <div className="social-login">
            <button className="btn-social">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 0C4.477 0 0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.879V12.89h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.989C16.343 19.128 20 14.991 20 10c0-5.523-4.477-10-10-10z" />
              </svg>
              Facebook
            </button>
            <button className="btn-social">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.2 0C4.6 0 0 4.6 0 10.2c0 4.5 2.9 8.3 7 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.7 1 .8-.2 1.6-.3 2.4-.3.8 0 1.6.1 2.4.3 1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.6 1 2.7 0 3.8-2.3 4.7-4.6 4.9.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4.1-1.4 7-5.2 7-9.7C20.4 4.6 15.8 0 10.2 0z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


