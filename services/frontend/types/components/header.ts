export interface SubItem {
    label: string;
    description?: string;
    href: string;
    /** Se true, o item só aparece para usuário autenticado (alinha ao middleware). */
    requiresAuth?: boolean;
}

export interface MainSection {
    icon: React.ReactNode;
    label: string;
    description: string;
    subItems: SubItem[];
}

export interface DropdownData {
    categoryName: string;
    mainSections: MainSection[];
}