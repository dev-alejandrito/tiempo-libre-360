import { useSocials } from "../lib/social";

export default function SocialLinks({ className = "", empty = null, footer = false }) {
  const links = useSocials();
  if (!links.length) return empty;
  return (
    <ul className={"flex flex-wrap gap-2 " + className}>
      {links.map((s) => (
        <li key={s.key}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className={footer ? "inline-flex min-h-11 items-center rounded-full border border-white/40 px-4 text-sm font-semibold text-white hover:bg-white/10" : "btn btn-ghost min-h-11 text-sm"}>
            {s.label}<span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
