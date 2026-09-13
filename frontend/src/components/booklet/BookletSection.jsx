export default function BookletSection({ id, number, icon, title, subtitle, accent, count, children, className = "" }) {
  return (
    <section
      id={id}
      className={`booklet-section ${accent ? `booklet-section--${accent}` : ""} ${className}`}
    >
      <header className="booklet-section__head">
        <span className="booklet-section__number">{String(number).padStart(2, "0")}</span>
        <span className="booklet-section__icon">{icon}</span>
        <div className="booklet-section__title-wrap">
          <h2 className="booklet-section__title">{title}</h2>
          {subtitle && <p className="booklet-section__subtitle">{subtitle}</p>}
        </div>
        {typeof count === "number" && count > 0 && (
          <span className="booklet-section__count">
            {count} record{count !== 1 ? "s" : ""}
          </span>
        )}
      </header>
      <div className="booklet-section__body">{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, note }) {
  return (
    <div className="booklet-empty">
      <div className="booklet-empty__icon">{icon}</div>
      <div className="booklet-empty__title">{title}</div>
      {note && <div className="booklet-empty__note">{note}</div>}
    </div>
  );
}