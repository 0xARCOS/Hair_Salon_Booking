import { redirect } from "next/navigation";
import Link from "next/link";
import { Scissors, CalendarDays, Users, Settings, LogOut } from "lucide-react";
import { createClient } from "@irene/supabase/server";
import { logout } from "@/actions/auth";
import { BackupReminder } from "@/components/local/BackupReminder";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agenda" className="flex items-center gap-2 font-bold">
              <Scissors className="w-4 h-4 text-primary" />
              <span className="text-sm">
                Irene <span className="text-primary">Hair</span>
              </span>
            </Link>
            <div className="w-px h-4 bg-border" />
            <nav className="flex items-center gap-3 text-sm">
              <Link
                href="/agenda"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Citas
              </Link>
              <Link
                href="/clientes"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Clientas
              </Link>
              <Link
                href="/ajustes"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Ajustes
              </Link>
            </nav>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </form>
        </div>
      </header>

      <BackupReminder />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
