"use client";

interface ChoiceButtonProps {
  text: string;
  state: "idle" | "selected-correct" | "selected-wrong" | "reveal-correct" | "disabled";
  onClick: () => void;
  sectionColor?: string;
}

export default function ChoiceButton({
  text,
  state,
  onClick,
  sectionColor = "#2563eb",
}: ChoiceButtonProps) {
  const baseClasses =
    "w-full px-4 py-3.5 rounded-none text-left text-sm font-light transition-all duration-200 border-2 cursor-pointer select-none";

  let stateClasses = "";
  let style: React.CSSProperties = {};

  switch (state) {
    case "idle":
      stateClasses = "hover:border-l-4 hover:border-l-bauhaus-yellow active:scale-[0.98]";
      style = {
        background: `${sectionColor}08`,
        borderColor: `${sectionColor}26`,
        color: "#e8ecf4",
      };
      break;
    case "selected-correct":
      stateClasses = "animate-pulse-glow";
      style = {
        background: "rgba(22, 163, 74, 0.15)",
        borderColor: "#16a34a",
        color: "#16a34a",
      };
      break;
    case "selected-wrong":
      stateClasses = "animate-shake";
      style = {
        background: "rgba(220, 38, 38, 0.15)",
        borderColor: "#dc2626",
        color: "#dc2626",
      };
      break;
    case "reveal-correct":
      style = {
        background: "rgba(22, 163, 74, 0.1)",
        borderColor: "rgba(22, 163, 74, 0.4)",
        color: "#16a34a",
      };
      break;
    case "disabled":
      style = {
        background: "rgba(255, 255, 255, 0.02)",
        borderColor: "rgba(255, 255, 255, 0.04)",
        color: "#3d4756",
      };
      break;
  }

  return (
    <button
      className={`${baseClasses} ${stateClasses}`}
      style={style}
      onClick={onClick}
      disabled={state !== "idle"}
    >
      {text}
    </button>
  );
}
