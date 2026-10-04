// ?inline embeds the logo as a base64 data URI inside the JS bundle, so the
// loading marker always renders its image even with zero internet connection.
import LOADING_LOGO from "../assets/loading-logo.jpg?inline";

export default function GlobalLoadingOverlay({ visible, message = "Loading..." }) {
  if (!visible) return null;

  return (
    <div className="global-loading-overlay">
      <div className="global-loading-content">
        <div className="global-loading-logo-wrap">
          <img
            src={LOADING_LOGO}
            alt="CityVet Logo"
            className="global-loading-logo"
          />
        </div>
        <p className="global-loading-message">{message}</p>
      </div>
    </div>
  );
}
