"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { inviteUserToOrganization } from "@/actions/organizations";
import { getUsers } from "@/actions/users";
import { User } from "@/types/user";

const formSchema = z.object({
    email: z.string().email("Email inválido"),
    role: z.enum(["member", "organizer"]),
});

type FormData = z.infer<typeof formSchema>;

interface InviteMemberDialogProps {
    organizationSlug: string;
    onSuccess?: () => void;
}

export function InviteMemberDialog({ organizationSlug, onSuccess }: InviteMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const router = useRouter();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            role: "member",
        },
    });

    useEffect(() => {
        if (open) {
            getUsers().then(setUsers).catch(console.error);
        }
    }, [open]);

    async function onSubmit(data: FormData) {
        setIsLoading(true);
        try {
            const user = users.find(u => u.email === data.email);
            if (!user) {
                toast.error("Usuário não encontrado");
                return;
            }

            const result = await inviteUserToOrganization(organizationSlug, user.id);
            
            if (result.success) {
                toast.success(result.message || "Convite enviado com sucesso!");
                setOpen(false);
                form.reset();
                onSuccess?.();
                router.refresh();
            } else {
                toast.error(result.error || "Erro ao enviar convite");
            }
        } catch (error) {
            toast.error("Erro ao enviar convite");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-main hover:bg-main/90 text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Convidar Membro
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Convidar Membro</DialogTitle>
                    <DialogDescription>
                        Envie um convite para alguém se juntar à organização
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="email@exemplo.com"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Função</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a função" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="member">Membro</SelectItem>
                                            <SelectItem value="organizer">Organizador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-main hover:bg-main/90 text-white">
                                {isLoading ? "Enviando..." : "Enviar Convite"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
