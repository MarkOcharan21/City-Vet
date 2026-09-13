export default function LoadingSpinner({
  text = "Loading...",
  fullPage = true,
}) {
  return (
    <div
      className={
        fullPage
          ? "loading-container"
          : "loading-inline"
      }
    >
      <div className="spinner"></div>

      <p>{text}</p>
    </div>
  );
}