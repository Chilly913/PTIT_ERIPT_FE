export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">{children}</main>;
}
