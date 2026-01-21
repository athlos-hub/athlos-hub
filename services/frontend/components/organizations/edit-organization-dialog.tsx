"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Upload, X } from "lucide-react";
import { updateOrganization } from "@/actions/organizations";
import { OrganizationResponse, OrganizationPrivacy, OrganizationJoinPolicy } from "@/types/organization";
import { toast } from "sonner";

const formSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(255),
    description: z.string().optional(),
    privacy: z.nativeEnum(OrganizationPrivacy),
    join_policy: z.nativeEnum(OrganizationJoinPolicy).optional(),
    logo: z.instanceof(File).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface EditOrganizationDialogProps {
    organization: OrganizationResponse;
}

export function EditOrganizationDialog({ organization }: EditOrganizationDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(organization.logo_url);
    const router = useRouter();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: organization.name,
            description: organization.description || "",
            privacy: organization.privacy,
            join_policy: organization.join_policy || OrganizationJoinPolicy.INVITE_ONLY,
            logo: null,
        },
    });

    async function onSubmit(data: FormData) {
        setIsLoading(true);
        try {
            const formData = new FormData();
            
            if (data.name) formData.append("name", data.name);
            if (data.description) formData.append("description", data.description);
            if (data.privacy) formData.append("privacy", data.privacy);
            if (data.logo) formData.append("logo", data.logo);

            await updateOrganization(organization.slug, formData);
            
            toast.success("Organização atualizada com sucesso!");
            setOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao atualizar organização");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setValue("logo", file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        form.setValue("logo", null);
        setLogoPreview(organization.logo_url);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Organização</DialogTitle>
                    <DialogDescription>
                        Atualize as informações da sua organização
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="logo"
                            render={({ field: { value, onChange, ...field } }) => (
                                <FormItem>
                                    <FormLabel>Logo</FormLabel>
                                    <FormControl>
                                        <div className="space-y-4">
                                            {logoPreview && (
                                                <div className="relative w-32 h-32 mx-auto">
                                                    <Image
                                                        src={logoPreview}
                                                        alt="Logo preview"
                                                        fill
                                                        className="object-cover rounded-lg"
                                                    />
                                                    {form.watch("logo") && (
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute -top-2 -right-2 h-6 w-6"
                                                            onClick={removeLogo}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    {...field}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoChange}
                                                    className="hidden"
                                                    id="logo-upload"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => document.getElementById("logo-upload")?.click()}
                                                    className="w-full"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    {logoPreview ? "Alterar Logo" : "Upload Logo"}
                                                </Button>
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome da organização" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva sua organização"
                                            className="resize-none"
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="privacy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Privacidade</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a privacidade" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={OrganizationPrivacy.PUBLIC}>
                                                Pública - Visível para todos
                                            </SelectItem>
                                            <SelectItem value={OrganizationPrivacy.PRIVATE}>
                                                Privada - Apenas membros
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Organizações públicas aparecem nas buscas. Privadas são visíveis apenas para membros.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-main hover:bg-main/90 text-white">
                                {isLoading ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
