import { de } from "@/i18n/de";

export default function StartPage() {
  return (
    <div className="start">
      <p className="eyebrow">{de.shell.pilotBadge}</p>
      <h1>{de.start.heading}</h1>
      <p className="lead">{de.start.intro}</p>
      <ul className="start-list">
        {de.start.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <section aria-labelledby="zugang-heading" className="notice">
        <h2 id="zugang-heading">{de.start.statusHeading}</h2>
        <p>{de.start.statusBody}</p>
      </section>
    </div>
  );
}
