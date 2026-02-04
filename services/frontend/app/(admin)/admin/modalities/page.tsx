"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { listModalities, createModality } from "@/actions/modalities";
import type { Modality, ModalityCreate } from "@/types/modality";

export default function ModalitiesPage() {
  const router = useRouter();
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newModality, setNewModality] = useState<ModalityCreate>({
    name: "",
    organization_slug: "",
  });

  useEffect(() => {
    loadModalities();
  }, []);

  async function loadModalities() {
    try {
      setIsLoading(true);
      const data = await listModalities(0, 100);
      setModalities(data);
    } catch (error) {
      console.error("Erro ao carregar modalidades:", error);
      toast.error("Erro ao carregar modalidades");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateModality() {
    if (!newModality.name || !newModality.organization_slug) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      setIsCreating(true);
      await createModality(newModality);
      toast.success("Modalidade criada com sucesso!");
      setIsCreateDialogOpen(false);
      setNewModality({ name: "", organization_slug: "" });
      loadModalities();
    } catch (error) {
      console.error("Erro ao criar modalidade:", error);
      toast.error("Erro ao criar modalidade");
    } finally {
      setIsCreating(false);
    }
  }

  const filteredModalities = modalities.filter((mod) =>
    mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mod.organization_slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Modalidades</h1>
          <p className="text-gray-600">Gerencie todas as modalidades esportivas</p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Modalidade
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Modalidades</CardTitle>
          <CardDescription>
            {modalities.length} modalidade(s) cadastrada(s)
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou slug da organização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredModalities.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? "Nenhuma modalidade encontrada"
                  : "Nenhuma modalidade cadastrada ainda"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredModalities.map((modality) => (
                <Card
                  key={modality.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      {modality.name}
                    </CardTitle>
                    <CardDescription>
                      Organização: {modality.organization_slug}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Modalidade</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova modalidade esportiva
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Modalidade *</Label>
              <Input
                id="name"
                value={newModality.name}
                onChange={(e) => setNewModality({ ...newModality, name: e.target.value })}
                placeholder="Ex: Futsal, Vôlei, Basquete"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization_slug">Slug da Organização *</Label>
              <Input
                id="organization_slug"
                value={newModality.organization_slug}
                onChange={(e) => setNewModality({ ...newModality, organization_slug: e.target.value })}
                placeholder="Ex: minha-organizacao"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateModality} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
