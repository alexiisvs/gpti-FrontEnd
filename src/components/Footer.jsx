export default function Footer() {
    return (
      <footer id="contacto" className="footer">
        <div className="container footer__inner">
          <div className="footer__link">Política de privacidad</div>
          <div className="footer__link">Términos de servicio</div>
          <div className="footer__link">Contacto</div>
          <div className="footer__copy">
            © {new Date().getFullYear()} AudIA. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    );
  }
  