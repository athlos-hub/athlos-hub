"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FilterPanel({ title = "Filtros", icon, children, className }: FilterPanelProps) {
  return (
    <Card className={cn("rounded-2xl border border-gray-200 shadow-sm p-6", className)}>
      <div className="flex flex-wrap items-center gap-4">
        {(icon || title) && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            {icon}
            <span>{title}</span>
          </div>
        )}
        {children}
      </div>
    </Card>
  );
}

