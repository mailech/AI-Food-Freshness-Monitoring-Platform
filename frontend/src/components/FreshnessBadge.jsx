const LABEL_STYLES = {
  fresh: { text: "Fresh", className: "badge badge-fresh" },
  good: { text: "Good", className: "badge badge-good" },
  acceptable: { text: "Acceptable", className: "badge badge-acceptable" },
  near_spoilage: { text: "Near Spoilage", className: "badge badge-near-spoilage" },
  spoiled: { text: "Spoiled", className: "badge badge-spoiled" },
};

export default function FreshnessBadge({ label }) {
  const style = LABEL_STYLES[label] || { text: label || "Unknown", className: "badge" };
  return <span className={style.className}>{style.text}</span>;
}
