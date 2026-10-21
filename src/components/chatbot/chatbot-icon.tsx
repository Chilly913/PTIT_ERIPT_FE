/**
 * ERIPT assistant mark: a rounded speech bubble with a four-point spark (AI) inside.
 * Flat solid shapes only (design system: no gradients); colour follows `currentColor`.
 */
export function ChatbotIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" className={className}>
      {/* bubble */}
      <path
        d="M6 6.5A3.5 3.5 0 0 1 9.5 3h13A3.5 3.5 0 0 1 26 6.5v10a3.5 3.5 0 0 1-3.5 3.5H15l-5.2 4.6a.8.8 0 0 1-1.3-.6V20h-1A3.5 3.5 0 0 1 6 16.5v-10Z"
        fill="currentColor"
      />
      {/* spark cut-out */}
      <path d="M16 7.2c.35 2.9 1.7 4.25 4.6 4.6-2.9.35-4.25 1.7-4.6 4.6-.35-2.9-1.7-4.25-4.6-4.6 2.9-.35 4.25-1.7 4.6-4.6Z" fill="var(--chatbot-spark, var(--primary-foreground))" />
      {/* small satellite spark */}
      <path d="M22.4 14.2c.15 1.2.7 1.75 1.9 1.9-1.2.15-1.75.7-1.9 1.9-.15-1.2-.7-1.75-1.9-1.9 1.2-.15 1.75-.7 1.9-1.9Z" fill="var(--chatbot-spark, var(--primary-foreground))" opacity=".85" />
    </svg>
  );
}
