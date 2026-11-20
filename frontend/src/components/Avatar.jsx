import { initials } from "../utils";

export function Avatar({ user, size = "md", dark = false, className = "" }) {
  const name = user?.fullName || user?.name || "";
  const sizeClass = size === "sm" ? " avatar-sm" : size === "lg" ? " avatar-lg" : "";
  return (
    <span
      className={`avatar${sizeClass}${className ? ` ${className}` : ""}`}
      style={{ "--hue": user?.avatarHue ?? 218 }}
      data-dark={dark ? "true" : undefined}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
