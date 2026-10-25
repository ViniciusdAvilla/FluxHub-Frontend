"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

export type PublicSellerIdentity = {
  account_id: number;
  nickname: string;
  display_name: string;
  picture_url: string | null;
};

/** Reject foreign URLs even if the API is misconfigured. */
export function trustedSellerAvatar(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password ||
        (u.hostname !== "mlstatic.com" && !u.hostname.endsWith(".mlstatic.com")) ||
        u.port) return null;
    return u.toString();
  } catch { return null; }
}

export function sellerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts.at(-1)![0] :
    parts[0]?.slice(0, 2) || "ML").toLocaleUpperCase("pt-BR");
}

/** Public only: the access token stays in FastAPI and is never sent to this component. */
export default function MercadoLivreIdentity({
  accountId, fallbackName = "Minha loja", variant = "card",
}: {
  accountId?: number;
  fallbackName?: string;
  variant?: "card" | "header";
}) {
  const [seller, setSeller] = useState<PublicSellerIdentity | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const url = accountId
      ? `/api/platform/mercado-livre/identity?account_id=${accountId}`
      : "/api/platform/mercado-livre/identity";
    fetch(url, {cache:"no-store",credentials:"same-origin",signal:controller.signal})
      .then(response => response.ok ? response.json() : null)
      .then((value: unknown) => {
        if (controller.signal.aborted || !value || typeof value !== "object") return;
        const record = value as Partial<PublicSellerIdentity>;
        if (!Number.isSafeInteger(record.account_id) ||
            typeof record.display_name !== "string" ||
            typeof record.nickname !== "string") return;
        setSeller(record as PublicSellerIdentity);
        setImageFailed(false);
      }).catch(() => {});
    return () => controller.abort();
  }, [accountId]);
  const name = seller?.display_name?.trim() || (variant === "header" ? "Minha conta" : fallbackName);
  const picture = !imageFailed ? trustedSellerAvatar(seller?.picture_url) : null;
  return <span className={`fh-ml-identity fh-ml-identity-${variant}`}>
    <span className="fh-ml-avatar" aria-hidden="true">
      {picture ? <img src={picture} alt="" loading="lazy" referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}/> :
        variant === "header" && !seller ? <UserRound size={17}/> :
        <span>{sellerInitials(name)}</span>}
    </span>
    <span className="fh-ml-identity-text">
      <strong title={name}>{name}</strong>
      <small>{seller?.nickname && seller.nickname !== name ? seller.nickname :
        variant === "header" ? seller ? "Conta Mercado Livre" : "FluxHub" : "Vendedor Mercado Livre"}</small>
    </span>
  </span>;
}
