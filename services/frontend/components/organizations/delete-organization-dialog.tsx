"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteOrganization } from "@/actions/organizations";
import { toast } from "sonner";

interface DeleteOrganizationDialogProps {
    organizationName: string;
    organizationSlug: string;
}

export function DeleteOrganizationDialog({ 
    organizationName, 
    organizationSlug 
}: DeleteOrganizationDialogProps) {
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const isConfirmValid = confirmText === organizationName;

    async function handleDelete() {
        if (!isConfirmValid) {
            toast.error("Digite o nome correto da organização");
            return;
        }

        setIsLoading(true);
        try {
            const result = await deleteOrganization(organizationSlug);
            
            if (result.success) {
                toast.success("Organização deletada com sucesso!");
                setOpen(false);
                router.push("/organizations");
                router.refresh();
            } else {
                toast.error(result.error || "Erro ao deletar organização");
            }
        } catch (error) {
            toast.error("Erro ao deletar organização");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Organização
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>Deletar Organização</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        Esta ação é <span className="font-bold text-destructive">permanente e irreversível</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
                        <p className="text-sm font-medium">O que será deletado:</p>
                        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                            <li>Todos os dados da organização</li>
                            <li>Todos os membros serão removidos</li>
                            <li>Todas as competições associadas</li>
                            <li>Todo o histórico e configurações</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm">
                            Digite <span className="font-mono font-bold">{organizationName}</span> para confirmar:
                        </Label>
                        <Input
                            id="confirm"
                            placeholder={organizationName}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        {confirmText && !isConfirmValid && (
                            <p className="text-sm text-destructive">
                                O nome não corresponde
                            </p>
                        )}
                    </div>

                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                        <p className="text-sm text-yellow-600 dark:text-yellow-500">
                            ⚠️ <span className="font-medium">Atenção:</span> Esta ação não pode ser desfeita. 
                            Todos os dados serão permanentemente perdidos.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setOpen(false);
                            setConfirmText("");
                        }}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!isConfirmValid || isLoading}
                    >
                        {isLoading ? "Deletando..." : "Deletar Permanentemente"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
