import { Link } from "../navigation";

function Surface({ as: Tag = "div", className, children, flags = {} }) {
  return (
    <Tag
      className={`reactive-surface ${className}`}
      data-unread={flags["data-unread"]}
      data-overdue={flags["data-overdue"]}
      data-status={flags["data-status"]}
      data-category={flags["data-category"]}
    >
      {children}
    </Tag>
  );
}
export function ReactiveLink({ className, children, ...props }) {
  return (
    <Link
      {...props}
      className={`reactive-target ${className.split(" ")[0]}-target`}
    >
      <Surface className={className} flags={props}>
        {children}
      </Surface>
    </Link>
  );
}
export function ReactiveButton({ className, children, ...props }) {
  return (
    <button
      {...props}
      className={`reactive-target ${className.split(" ")[0]}-target`}
    >
      <Surface as="span" className={className} flags={props}>
        {children}
      </Surface>
    </button>
  );
}
export function ReactivePanel({ className, children, ...props }) {
  return (
    <div className={`reactive-target reactive-panel ${className}-target`}>
      <section {...props} className={`reactive-surface ${className}`}>
        {children}
      </section>
    </div>
  );
}
