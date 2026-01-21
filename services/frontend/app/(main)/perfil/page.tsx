"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AvatarInput from '@/components/forms/avatar-input';
import { updateUserProfile, getUserProfile } from '@/actions/auth';

const profileSchema = z.object({
    first_name: z.string().min(1, { message: 'Nome é obrigatório' }),
    last_name: z.string().optional(),
    username: z.string().min(3, { message: 'Username deve ter ao menos 3 caracteres' }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserProfile {
    id: string;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    enabled: boolean;
    email_verified: boolean;
}

export default function PerfilPage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const { register, handleSubmit, formState: { errors }, setValue } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
    });

    useEffect(() => {
        async function loadUserProfile() {
            if (!session) {
                return;
            }

            try {
                const profile = await getUserProfile();
                setUserProfile(profile);

                const sessionFullName = session.user?.name ?? '';

                let firstNameToSet = profile.first_name ?? '';
                let lastNameToSet = profile.last_name ?? '';

                if ((!lastNameToSet || lastNameToSet.trim() === '') && sessionFullName) {
                    const parts = sessionFullName.trim().split(/\s+/);
                    if (parts.length > 1) {
                        if (!firstNameToSet || firstNameToSet.trim() === '') {
                            firstNameToSet = parts.shift() || '';
                        }
                        lastNameToSet = parts.join(' ');
                    } else if (!firstNameToSet) {
                        firstNameToSet = sessionFullName;
                    }
                }

                setValue('first_name', firstNameToSet || '');
                setValue('last_name', lastNameToSet || '');
                setValue('username', profile.username || session.user?.name || '');
            } catch (error) {
                toast.error('Erro ao carregar dados do perfil');
            } finally {
                setIsLoading(false);
            }
        }

        loadUserProfile();
    }, [session, router, setValue]);

    async function onSubmit(values: ProfileFormValues, e?: React.BaseSyntheticEvent) {
        setIsSubmitting(true);

        try {
            const formEl = e?.target as HTMLFormElement | undefined;
            const formData = formEl ? new FormData(formEl) : new FormData();

            formData.set('first_name', values.first_name || '');
            formData.set('last_name', values.last_name || '');
            formData.set('username', values.username || '');

            const updatedUser = await updateUserProfile(formData);

            const freshProfile = await getUserProfile();
            setUserProfile(freshProfile);

            setValue('first_name', freshProfile.first_name || '');
            setValue('last_name', freshProfile.last_name || '');
            setValue('username', freshProfile.username || '');

            await update({
                user: {
                    ...session?.user,
                    name: freshProfile.first_name || freshProfile.username,
                    image: freshProfile.avatar_url,
                }
            });

            toast.success('Perfil atualizado com sucesso!');

            router.refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err ?? 'Erro ao atualizar perfil');
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center">
                <div className="text-lg text-gray-500">Carregando...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center gap-8 w-full max-w-150 h-screen mx-auto">
            <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                    <div className="mb-2">
                        <AvatarInput 
                            name="avatar" 
                            currentAvatar={userProfile?.avatar_url || session.user?.image}
                        />
                    </div>

                    <div className="flex gap-4 flex-1">
                        <div className="flex-1">
                            <label className="text-lg font-medium text-[#7C838A]">Nome</label>
                            <input
                                type="text"
                                {...register('first_name')}
                                placeholder="Nome"
                                className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border ${
                                    errors.first_name ? 'border-red-300' : 'border-[#B0BAC340]'
                                } focus:border-zinc-500 focus:outline-none`}
                            />
                            {errors.first_name && (
                                <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
                            )}
                        </div>

                        <div className="flex-1">
                            <label className="text-lg font-medium text-[#7C838A]">Sobrenome</label>
                            <input
                                type="text"
                                {...register('last_name')}
                                placeholder="Sobrenome"
                                className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border border-[#B0BAC340] focus:border-zinc-500 focus:outline-none"
                            />
                            {errors.last_name && (
                                <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Usuário</label>
                        <input
                            type="text"
                            {...register('username')}
                            placeholder="Username"
                            className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border ${
                                errors.username ? 'border-red-300' : 'border-[#B0BAC340]'
                            } focus:border-zinc-500 focus:outline-none`}
                        />
                        {errors.username && (
                            <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Email</label>
                        <input
                            type="email"
                            value={session.user?.email || ''}
                            disabled
                            className="w-full px-3 bg-gray-200 py-3 rounded-lg border border-gray-300 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-sm text-gray-500 mt-1">O email não pode ser alterado</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-main text-white py-3 cursor-pointer font-medium text-lg rounded-lg focus:outline-none hover:bg-main/90 transition-colors duration-200 disabled:opacity-50"
                >
                    {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                </button>
            </form>
        </div>
    );
}
