"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { updateJoinPolicy } from "@/actions/organizations";
import { OrganizationResponse, OrganizationJoinPolicy } from "@/types/organization";
import { toast } from "sonner";

interface SettingsDialogProps {
    organization: OrganizationResponse;
}

export function SettingsDialog({ organization }: SettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [allowInvite, setAllowInvite] = useState(false);
    const [allowRequest, setAllowRequest] = useState(false);
    const [allowLink, setAllowLink] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!organization.join_policy) return;
        
        const policy = organization.join_policy;
        setAllowInvite(
            policy === OrganizationJoinPolicy.INVITE_ONLY ||
            policy === OrganizationJoinPolicy.INVITE_AND_REQUEST ||
            policy === OrganizationJoinPolicy.INVITE_AND_LINK ||
            policy === OrganizationJoinPolicy.ALL
        );
        setAllowRequest(
            policy === OrganizationJoinPolicy.REQUEST_ONLY ||
            policy === OrganizationJoinPolicy.INVITE_AND_REQUEST ||
            policy === OrganizationJoinPolicy.REQUEST_AND_LINK ||
            policy === OrganizationJoinPolicy.ALL
        );
        setAllowLink(
            policy === OrganizationJoinPolicy.LINK_ONLY ||
            policy === OrganizationJoinPolicy.INVITE_AND_LINK ||
            policy === OrganizationJoinPolicy.REQUEST_AND_LINK ||
            policy === OrganizationJoinPolicy.ALL
        );
    }, [organization.join_policy]);

    const getPolicyFromOptions = (): OrganizationJoinPolicy => {
        if (allowInvite && allowRequest && allowLink) return OrganizationJoinPolicy.ALL;
        if (allowInvite && allowRequest) return OrganizationJoinPolicy.INVITE_AND_REQUEST;
        if (allowInvite && allowLink) return OrganizationJoinPolicy.INVITE_AND_LINK;
        if (allowRequest && allowLink) return OrganizationJoinPolicy.REQUEST_AND_LINK;
        if (allowInvite) return OrganizationJoinPolicy.INVITE_ONLY;
        if (allowRequest) return OrganizationJoinPolicy.REQUEST_ONLY;
        if (allowLink) return OrganizationJoinPolicy.LINK_ONLY;
        return OrganizationJoinPolicy.INVITE_ONLY;
    };

    const handleSubmit = async () => {
        if (!allowInvite && !allowRequest && !allowLink) {
            toast.error("Selecione pelo menos uma forma de entrada");
            return;
        }

        setIsLoading(true);
        try {
            const policy = getPolicyFromOptions();
            await updateJoinPolicy(organization.slug, policy);
            toast.success("Configurações atualizadas com sucesso!");
            setOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao atualizar configurações");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Configurações da Organização</DialogTitle>
                    <DialogDescription>
                        Configure como novos membros podem entrar na organização
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between space-x-4 rounded-lg border p-4">
                                <div className="space-y-0.5 flex-1">
                                    <Label htmlFor="invite" className="text-base font-medium">
                                        Convite
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Organizadores podem convidar pessoas específicas
                                    </p>
                                </div>
                                <Switch
                                    id="invite"
                                    checked={allowInvite}
                                    onCheckedChange={setAllowInvite}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="flex items-start justify-between space-x-4 rounded-lg border p-4">
                                <div className="space-y-0.5 flex-1">
                                    <Label htmlFor="request" className="text-base font-medium">
                                        Solicitação
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Usuários podem solicitar entrada (requer aprovação)
                                    </p>
                                </div>
                                <Switch
                                    id="request"
                                    checked={allowRequest}
                                    onCheckedChange={setAllowRequest}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="flex items-start justify-between space-x-4 rounded-lg border p-4">
                                <div className="space-y-0.5 flex-1">
                                    <Label htmlFor="link" className="text-base font-medium">
                                        Link de Convite
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Qualquer pessoa com o link pode entrar
                                    </p>
                                </div>
                                <Switch
                                    id="link"
                                    checked={allowLink}
                                    onCheckedChange={setAllowLink}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading} className="bg-main hover:bg-main/90 text-white">
                        {isLoading ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
