"use client";

import Link from "next/link";
import AvatarInput from '@/components/forms/avatar-input'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/actions/auth';
import { toast } from 'sonner';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const signupSchema = z
  .object({
    first_name: z.string().min(1, { message: 'Nome é obrigatório' }),
    last_name: z.string().optional(),
    email: z.string().email({ message: 'Email inválido' }),
    username: z.string().optional(),
    password: z.string().min(6, { message: 'Senha deve ter ao menos 6 caracteres' }),
    confirm_password: z.string().min(6, { message: 'Confirme a senha' }),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'As senhas não coincidem',
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function CadastroPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
    });

    async function onSubmit(values: SignupFormValues, e?: React.BaseSyntheticEvent) {
        setError(null);
        setIsSubmitting(true);

        try {
            const formEl = e?.target as HTMLFormElement | undefined;
            const formData = formEl ? new FormData(formEl) : new FormData();

            formData.set('first_name', values.first_name);
            if (values.last_name) formData.set('last_name', values.last_name);
            formData.set('email', values.email);
            formData.set('username', (values.username && values.username.length > 0) ? values.username : values.email.split('@')[0]);
            formData.set('password', values.password);

            await registerUser(formData);
            toast.success('Conta criada. Verifique seu email para ativar a conta.');
            router.push('/verify');
            return;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err ?? 'Erro ao criar conta');
            setError(message);
            toast.error(message);
        }

        setIsSubmitting(false);
    }

    return (
        <div className="flex flex-col items-center gap-8 py-16 w-full max-w-[37.5rem] mx-auto">
            <span className="text-2xl text-center font-medium">Cadastre-se no AthlosHub</span>

            <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                    <div className="mb-2">
                        <AvatarInput name="avatar" />
                    </div>

                    <div className="flex gap-4 flex-1">
                        <div>
                            <label className="text-lg font-medium text-[#7C838A]">Nome</label>
                            <input
                                type="text"
                                {...register('first_name')}
                                placeholder="Nome"
                                className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border ${errors.first_name ? 'border-red-300' : 'border-[#B0BAC340]'} focus:border-zinc-500 focus:outline-none`}
                            />
                            {errors.first_name && <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>}
                        </div>

                        <div>
                            <label className="text-lg font-medium text-[#7C838A]">Sobrenome</label>
                            <input
                                type="text"
                                {...register('last_name')}
                                placeholder="Sobrenome"
                                className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border border-[#B0BAC340] focus:border-zinc-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Email</label>
                        <input
                            type="email"
                            {...register('email')}
                            placeholder="Insira seu email"
                            className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border ${errors.email ? 'border-red-300' : 'border-[#B0BAC340]'} focus:border-zinc-500 focus:outline-none`}
                        />
                        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Senha</label>
                        <input
                            type="password"
                            {...register('password')}
                            placeholder="Insira sua senha"
                            className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border ${errors.password ? 'border-red-300' : 'border-[#B0BAC340]'} focus:border-zinc-500 focus:outline-none`}
                        />
                        {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Confirmar senha</label>
                        <input
                            type="password"
                            {...register('confirm_password')}
                            placeholder="Confirme sua senha"
                            className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border ${errors.confirm_password ? 'border-red-300' : 'border-[#B0BAC340]'} focus:border-zinc-500 focus:outline-none`}
                        />
                        {errors.confirm_password && <p className="text-sm text-red-600 mt-1">{errors.confirm_password.message}</p>}
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-main text-white py-3 cursor-pointer font-medium text-lg rounded-lg focus:outline-none hover:bg-main/90 transition-colors duration-200 disabled:opacity-50"
                >
                    {isSubmitting ? 'Criando conta...' : 'Criar conta'}
                </button>
            </form>
            <span className="text-[#7C838A]">
                Já possui conta? <Link href="/auth/login" className="text-main hover:underline">Entrar</Link>
            </span>
        </div>
    )
}
