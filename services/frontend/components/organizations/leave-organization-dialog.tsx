"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { leaveOrganization } from "@/actions/organizations";
import { toast } from "sonner";

interface LeaveOrganizationDialogProps {
    organizationSlug: string;
    organizationName: string;
    isOwner: boolean;
    isOrganizer?: boolean;
}

export function LeaveOrganizationDialog({ 
    organizationSlug, 
    organizationName,
    isOwner,
    isOrganizer = false
}: LeaveOrganizationDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLeave = async () => {
        setIsLoading(true);
        try {
            const result = await leaveOrganization(organizationSlug);
            
            if (result.success) {
                toast.success("Você saiu da organização");
                router.push("/organizations");
                router.refresh();
            } else {
                toast.error(result.error || "Erro ao sair da organização");
            }
        } catch (error) {
            toast.error("Erro ao sair da organização");
        } finally {
            setIsLoading(false);
            setOpen(false);
        }
    };

    if (isOwner) {
        return (
            <Button
                variant="destructive"
                disabled
                className="w-full"
            >
                <LogOut className="h-4 w-4 mr-2" />
                Proprietário não pode sair
            </Button>
        );
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair da Organização
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sair da Organização</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja sair da organização <strong>{organizationName}</strong>?
                        <br /><br />
                        {isOrganizer && (
                            <>
                                Você perderá seu cargo de <strong>organizador</strong> e o acesso a todos os recursos administrativos.
                                <br /><br />
                            </>
                        )}
                        Você perderá acesso a todos os recursos e competições desta organização.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleLeave}
                        disabled={isLoading}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isLoading ? "Saindo..." : "Sair da Organização"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
