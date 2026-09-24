export default function LoadingSpinner({
  text = "Loading...",
  fullPage = true,
}) {
  return (
    <div className={fullPage ? "loading-container" : "loading-inline"}>
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
