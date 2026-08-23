"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/provider";

const navItems = [
  { href: "/", label: "Plans" },
  { href: "/exercise", label: "Exercises" },
];

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // The login route renders outside the app shell.
  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="flex items-center gap-4 border-b pb-3 mb-6">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/" || pathname.startsWith("/plan")
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}

      {user && (
        <div className="ml-auto flex items-center gap-3 min-w-0">
          <span className="text-sm text-muted-foreground truncate">
            {user.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer shrink-0"
            onClick={async () => {
              await signOut();
              router.replace("/login");
              router.refresh();
            }}
          >
            Sign out
          </Button>
        </div>
      )}
    </nav>
  );
}
