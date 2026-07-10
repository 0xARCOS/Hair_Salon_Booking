"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Client } from "@irene/supabase";

interface ClientSearchListProps {
  clients: Pick<Client, "id" | "full_name" | "phone" | "active_treatment_phase">[];
}

export function ClientSearchList({ clients }: ClientSearchListProps) {
  const [query, setQuery] = useState("");

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.full_name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          placeholder="Buscar por nombre o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 space-y-2">
          {clients.length === 0 ? (
            <>
              <p>Aún no hay fichas de clientas.</p>
              <Link href="/clientes/nueva" className="text-primary font-medium hover:underline">
                Crear la primera ficha
              </Link>
            </>
          ) : (
            <p>Sin resultados para «{query.trim()}».</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div>
                <p className="font-medium">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
              {c.active_treatment_phase && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {c.active_treatment_phase}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
