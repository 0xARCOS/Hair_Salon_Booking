export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/10 pointer-events-none" />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
