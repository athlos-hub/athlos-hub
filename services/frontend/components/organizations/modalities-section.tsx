"use client";

import { useState, useEffect } from "react";
import { Plus, Tag, Loader2, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { listModalities, updateModality, deleteModality } from "@/actions/modalities";
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
  const [editingModality, setEditingModality] = useState<Modality | null>(null);
  const [editedModalityName, setEditedModalityName] = useState("");
  const [isSavingModality, setIsSavingModality] = useState(false);
  const [modalityToDelete, setModalityToDelete] = useState<Modality | null>(null);

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

  async function handleSaveModality() {
    if (!editingModality) return;
    const name = editedModalityName.trim();
    if (!name) {
      toast.error("Informe o nome da modalidade");
      return;
    }
    setIsSavingModality(true);
    try {
      await updateModality(editingModality.id, { name });
      toast.success("Modalidade atualizada com sucesso");
      setEditingModality(null);
      setEditedModalityName("");
      await loadModalities();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar modalidade";
      toast.error(message);
    } finally {
      setIsSavingModality(false);
    }
  }

  async function handleConfirmDeleteModality() {
    if (!modalityToDelete) return;
    try {
      await deleteModality(modalityToDelete.id);
      toast.success("Modalidade excluída com sucesso");
      setModalityToDelete(null);
      await loadModalities();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao excluir modalidade";
      toast.error(message);
    }
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
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="bg-main hover:bg-main/90 text-white">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {modalities.map((modality) => (
                <Card
                  key={modality.id}
                  className="group border-border/70 bg-linear-to-br from-card to-card/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-main/35 hover:shadow-md"
                >
                  <CardHeader className="p-4">
                    <CardTitle className="flex items-center justify-between gap-2.5 text-base font-semibold">
                      <span className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-main/10 text-main transition-colors group-hover:bg-main/15">
                        <Tag className="h-4 w-4" />
                      </span>
                      <span className="truncate">{modality.name}</span>
                      </span>
                      {isAdmin && (
                        <span className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingModality(modality);
                              setEditedModalityName(modality.name);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setModalityToDelete(modality)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </span>
                      )}
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

      <Dialog
        open={!!editingModality}
        onOpenChange={(open) => {
          if (!open) {
            setEditingModality(null);
            setEditedModalityName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar modalidade</DialogTitle>
            <DialogDescription>Atualize o nome da modalidade.</DialogDescription>
          </DialogHeader>
          <Input
            value={editedModalityName}
            onChange={(e) => setEditedModalityName(e.target.value)}
            placeholder="Nome da modalidade"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingModality(null);
                setEditedModalityName("");
              }}
              disabled={isSavingModality}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveModality}
              disabled={isSavingModality}
              className="bg-main hover:bg-main/90 text-white"
            >
              {isSavingModality ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!modalityToDelete}
        onOpenChange={(open) => {
          if (!open) setModalityToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modalidade</AlertDialogTitle>
            <AlertDialogDescription>
              {`Tem certeza que deseja excluir a modalidade "${modalityToDelete?.name ?? ""}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteModality}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
