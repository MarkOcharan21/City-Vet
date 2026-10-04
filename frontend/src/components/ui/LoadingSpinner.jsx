// ?inline embeds the logo as a base64 data URI inside the JS bundle, so the
// loading marker always renders its image even with zero internet connection.
import LOADING_LOGO from "../../assets/loading-logo.jpg?inline";

export default function LoadingSpinner({
  text = "Loading...",
  fullPage = true,
}) {
  return (
    <div className={fullPage ? "loading-container" : "loading-inline"}>
      <div className="loading-logo-wrap">
        <img
          src={LOADING_LOGO}
          alt="CityVet Cabuyao"
          className="loading-logo"
        />
        <div className="loading-logo-ring" />
      </div>
      <p className="loading-text">{text}</p>
    </div>
  );
}
