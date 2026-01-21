export interface SubItem {
    label: string;
    description?: string;
    href: string;
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