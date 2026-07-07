import { ThemeToggle } from "@/components/theme-toggle";

// Centered auth layout — no sidebar. Theme toggle pinned top-right (NFR-7).
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <main className="mx-4 w-full max-w-[400px]">{children}</main>
    </div>
  );
}
