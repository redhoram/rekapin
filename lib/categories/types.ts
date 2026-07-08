import type { CategoryType } from "./meta";

/**
 * Serializable category shape shared across server actions, queries, and client
 * components. Kept in a plain (non-"use server") module so client components can
 * import it freely.
 */
export interface CategoryDTO {
  id: string;
  name: string;
  type: CategoryType;
  isDefault: boolean;
  archivedAt: string | null; // ISO, null = active
}
