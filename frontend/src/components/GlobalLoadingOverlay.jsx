export default function GlobalLoadingOverlay({ visible, message = "Loading..." }) {
  if (!visible) return null;

  return (
    <div className="global-loading-overlay">
      <div className="global-loading-content">
        <div className="global-loading-logo-wrap">
          <img
            src="/cityvet-logo.jpg"
            alt="CityVet Logo"
            className="global-loading-logo"
          />
        </div>
        <p className="global-loading-message">{message}</p>
      </div>
    </div>
  );
}
