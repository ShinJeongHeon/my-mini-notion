"use client";

import { useState } from "react";

const COVER_ENDPOINT = "https://cataas.com/cat/cute";

function cacheBustToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function PostCover() {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  const [src] = useState(() => `${COVER_ENDPOINT}?t=${cacheBustToken()}`);

  if (status === "error") return null;

  return (
    <div className="detail-cover" data-testid="detail-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="detail-cover__img"
        data-testid="cover-image"
        src={src}
        alt=""
        data-loaded={status === "loaded"}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status !== "loaded" && (
        <div
          className="detail-cover__skeleton"
          data-testid="cover-skeleton"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
