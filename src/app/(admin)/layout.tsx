import { redirect } from "next/navigation";
import Link from "next/link";
import { Scissors, LayoutGrid, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { logout } from "@/actions/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const role = await getUserRole(supabase);

  if (role !== "staff") redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Scissors className="w-4 h-4 text-primary" />
              <span className="text-sm">
                Irene <span className="text-primary">Hair</span>
              </span>
            </Link>
            <div className="w-px h-4 bg-border" />
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              Panel Staff
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Mi panel
            </Link>
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
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
