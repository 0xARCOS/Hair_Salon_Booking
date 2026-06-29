import Link from "next/link";
import { Scissors } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { LogoutButton } from "./LogoutButton";

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary" />
          </div>
          Irene <span className="text-primary">Hair</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Mi panel
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
