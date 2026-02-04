"use client";

import { useState, useEffect } from "react";
import { Plus, Tag, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listModalities } from "@/actions/modalities";
import { CreateModalityDialog } from "./create-modality-dialog";
import type { Modality } from "@/types/modality";

interface ModalitiesSectionProps {
  orgCode: string;
  isAdmin: boolean;
  isPending: boolean;
}

export function ModalitiesSection({ orgCode, isAdmin, isPending }: ModalitiesSectionProps) {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!isPending) {
      loadModalities();
    }
  }, [isPending]);

  async function loadModalities() {
    try {
      setIsLoading(true);
      const data = await listModalities(0, 100, orgCode);
      setModalities(data);
    } catch (error) {
      console.error("Erro ao carregar modalidades:", error);
      toast.error("Erro ao carregar modalidades");
    } finally {
      setIsLoading(false);
    }
  }

  function handleModalityCreated() {
    loadModalities();
    setIsCreateDialogOpen(false);
  }

  if (isPending && isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Modalidades
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>A criação de modalidades estará disponível após a aprovação da organização.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Modalidades
              </CardTitle>
              <CardDescription>
                {modalities.length > 0
                  ? `${modalities.length} modalidade(s) cadastrada(s)`
                  : "Nenhuma modalidade criada ainda"}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Modalidade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : modalities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Nenhuma modalidade ainda</p>
              {isAdmin && (
                <p className="text-sm mt-2">Clique em "Nova Modalidade" para criar a primeira</p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {modalities.map((modality) => (
                <Card
                  key={modality.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      {modality.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateModalityDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgCode={orgCode}
        onSuccess={handleModalityCreated}
      />
    </>
  );
}
