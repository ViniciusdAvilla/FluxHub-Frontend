import type { ReactNode } from "react";

export default function SortHeading({ label, direction, onClick }: {
  label: ReactNode;
  direction?: "asc" | "desc";
  onClick: () => void;
}) {
  return <button type="button" className={"fh-smart-column " + (direction ? "is-active" : "")}
    onClick={onClick}>
    {label}<span aria-hidden="true">{direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}</span>
  </button>;
}
