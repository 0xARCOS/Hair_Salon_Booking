import { redirect } from "next/navigation";
import Link from "next/link";
import { Scissors, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Scissors className="w-4 h-4 text-primary" />
              <span className="text-sm">
                Irene <span className="text-primary">Hair</span>
              </span>
            </Link>
            <div className="w-px h-4 bg-border" />
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Mi Panel
            </span>
          </div>

          <div className="flex items-center gap-4">
            {profile?.role === "staff" && (
              <Link
                href="/admin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Panel Admin
              </Link>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.full_name}
            </span>
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
