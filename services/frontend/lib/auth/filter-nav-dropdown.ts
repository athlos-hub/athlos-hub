import type { MainSection } from "@/types/components/header";

/**
 * Remove itens `requiresAuth` do mega menu quando não há sessão.
 * Remove seções que ficarem sem nenhum link.
 */
export function filterNavDropdownSections(
  mainSections: MainSection[],
  isAuthenticated: boolean
): MainSection[] {
  return mainSections
    .map((section) => ({
      ...section,
      subItems: section.subItems.filter(
        (item) => !item.requiresAuth || isAuthenticated
      ),
    }))
    .filter((section) => section.subItems.length > 0);
}
