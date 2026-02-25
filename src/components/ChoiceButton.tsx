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
  sectionColor = "#00e5a0",
}: ChoiceButtonProps) {
  const baseClasses =
    "w-full px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-all duration-200 border cursor-pointer select-none";

  let stateClasses = "";
  let style: React.CSSProperties = {};

  switch (state) {
    case "idle":
      stateClasses = "hover:-translate-y-0.5 active:scale-[0.98]";
      style = {
        background: `${sectionColor}08`,
        borderColor: `${sectionColor}26`,
        color: "#e8ecf4",
      };
      break;
    case "selected-correct":
      stateClasses = "animate-pulse-glow";
      style = {
        background: "rgba(0, 229, 160, 0.15)",
        borderColor: "#00e5a0",
        color: "#00e5a0",
      };
      break;
    case "selected-wrong":
      stateClasses = "animate-shake";
      style = {
        background: "rgba(239, 68, 68, 0.15)",
        borderColor: "#ef4444",
        color: "#ef4444",
      };
      break;
    case "reveal-correct":
      style = {
        background: "rgba(0, 229, 160, 0.1)",
        borderColor: "rgba(0, 229, 160, 0.4)",
        color: "#00e5a0",
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
