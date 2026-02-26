"use client";

import { useState } from "react";

export default function DonationCard() {
  const [showEmail, setShowEmail] = useState(false);

  return (
    <div className="w-full p-4 rounded-none border-2 border-bauhaus-yellow/20 transition-all hover:border-l-4 hover:border-l-bauhaus-yellow"
      style={{ background: "rgba(234, 179, 8, 0.03)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">💛</span>
          <div>
            <div className="font-bold text-sm text-bauhaus-yellow uppercase tracking-wider">
              Support This Project
            </div>
            <div className="text-text-secondary text-xs font-light">
              Free forever — donations keep it running
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowEmail(!showEmail)}
          className="text-xs font-mono text-text-dim hover:text-bauhaus-yellow transition-colors uppercase tracking-wider"
        >
          {showEmail ? "Hide" : "Contact"}
        </button>
      </div>
      {showEmail && (
        <div className="mt-3 pt-3 border-t border-text-dim/10 text-xs text-text-secondary font-mono">
          Want to donate or sponsor? Reach out at{" "}
          <a
            href="mailto:donate@medphysquiz.com"
            className="text-bauhaus-yellow hover:underline"
          >
            donate@medphysquiz.com
          </a>
        </div>
      )}
    </div>
  );
}
