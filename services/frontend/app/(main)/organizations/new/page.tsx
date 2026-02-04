import { OrganizationForm } from "@/components/organizations/organization-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewOrganizationPage() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Criar Nova Organização
          </h1>
          <p className="text-gray-600">
            Crie uma organização para gerenciar suas competições, times e eventos.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
          <OrganizationForm />
        </div>
      </div>
    </div>
  );
}
