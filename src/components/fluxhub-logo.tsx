import type { CSSProperties } from "react";

export default function FluxHubLogo({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={"fluxhub-logo " + className} style={style} aria-label="FluxHub">
      <svg className="fluxhub-symbol" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <path d="M8 38 40 5 33 35Z" fill="#ffe25c" />
        <path d="M40 5 56 58 34 43Z" fill="#e8a800" />
        <path d="M8 38 34 43 56 58Z" fill="#ffcc29" />
        <path d="m8 38 15-17 11 22Z" fill="#ffdf51" />
        <path d="m23 21 17-16-7 30Z" fill="#ffc21f" />
      </svg>
      <strong>Flux<span>Hub</span></strong>
    </span>
  );
}
