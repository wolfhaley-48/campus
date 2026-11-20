import { Link } from "../navigation";

export function LogoMark({ size = 38 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M20 47V17h9v11.4L41.4 17H52L37.4 32.2 52.8 47H41.3L29 35.1V47z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Brand({ href = "/", subtitle = true }) {
  return (
    <Link to={href} className="sidebar-brand" aria-label="кампус, на главную">
      <LogoMark />
      <span>
        <span className="brand-word">кампус</span>
        {subtitle && <span className="brand-sub">цифровой деканат</span>}
      </span>
    </Link>
  );
}
