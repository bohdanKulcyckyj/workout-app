"use client";

import { useEffect } from "react";
import { migrateInlineExercises } from "@/lib/migration";

export function MigrationRunner({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    migrateInlineExercises();
  }, []);

  return <>{children}</>;
}
