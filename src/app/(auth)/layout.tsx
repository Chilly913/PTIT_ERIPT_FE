export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8 sm:px-6 bg-cover bg-center relative" style={{ backgroundImage: `url('/images/auth-campus.png?v=4')` }}>
      {/* Flat dark overlay (design system: no gradients) */}
      <div className="absolute inset-0" style={{ background: "var(--overlay)" }} />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
