import { initials } from "../utils";

export function Avatar({ user, size = "md", dark = false, className = "", eager = false }) {
  const name = user?.fullName || user?.name || "";
  const image = ["anna", "maksim"].includes(user?.login) ? `/avatars/${user.login}.svg` : null;
  const sizeClass = size === "sm" ? " avatar-sm" : size === "lg" ? " avatar-lg" : "";
  return (
    <span
      className={`avatar${sizeClass}${className ? ` ${className}` : ""}`}
      style={{ "--hue": user?.avatarHue ?? 218 }}
      data-dark={dark ? "true" : undefined}
      aria-hidden="true"
    >
      {image ? <img src={image} alt="" width="100" height="100" loading={eager ? "eager" : "lazy"} decoding="async" /> : initials(name)}
    </span>
  );
}
