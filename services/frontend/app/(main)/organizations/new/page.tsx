import { OrganizationForm } from "@/components/organizations/organization-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewOrganizationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full">
        <div className="mb-8">
          <Link
            href="/organizations"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para organizações
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Criar Nova Organização
          </h1>
          <p className="text-lg text-gray-600">
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
