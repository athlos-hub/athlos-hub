"use client";

import { usePathname, useRouter } from "next/navigation";
import { Users, Building2, Trophy, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Usuários e Organizações",
    path: "/admin",
    icon: <Users className="w-4 h-4" />,
  },
  {
    label: "Competições",
    path: "/admin/competitions",
    icon: <Trophy className="w-4 h-4" />,
  },
  {
    label: "Modalidades",
    path: "/admin/modalities",
    icon: <Tag className="w-4 h-4" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Painel Administrativo</h2>
          </div>
          <nav className="flex gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push(item.path)}
                  className="flex items-center gap-2"
                >
                  {item.icon}
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
