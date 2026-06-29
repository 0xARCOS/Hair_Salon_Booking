"use client";

import { logout } from "@/actions/auth";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
      >
        Salir
      </button>
    </form>
  );
}
