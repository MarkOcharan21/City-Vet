export default function FullScreenLoader({ text = "Processing..." }) {
  return (
    <div className="fullscreen-loader-overlay" role="status" aria-live="polite">
      <div className="loading-logo-wrap">
        <img
          src="/cityvet-logo.jpg"
          alt="CityVet Cabuyao"
          className="loading-logo"
        />
        <div className="loading-logo-ring" />
      </div>
      <p className="loading-text">{text}</p>
    </div>
  );
}