"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const resetPasswordSchema = z.object({
  new_password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "As senhas não coincidem.",
  path: ["confirm_password"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordPageProps {
  token?: string | null;
  email?: string | null;
}

export default function ResetPasswordPage({ token, email }: ResetPasswordPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    if (!token) {
      setError("Token de redefinição ausente ou inválido.");
    }
  }, [token]);

  async function onSubmit(values: ResetPasswordFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`/api/auth/reset-password?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: values.new_password }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSuccess(true);
        toast.success("Senha redefinida com sucesso! Faça login.");
        setTimeout(() => router.push("/auth/login"), 2000);
      } else {
        setError(data.error || "Erro ao redefinir senha.");
      }
    } catch (e) {
      setError("Erro inesperado ao redefinir senha.");
    } finally {
      setIsSubmitting(false);
      reset();
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center max-w-150 mx-auto min-h-screen justify-center">
        <span className="text-2xl text-center font-medium text-green-600">Senha redefinida com sucesso!</span>
        <span>Redirecionando para login...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center max-w-150 mx-auto min-h-screen justify-center">
      <span className="text-2xl text-center font-medium mb-8">Redefinir senha</span>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="new_password" className="text-lg font-medium text-[#7C838A]">
              Nova senha
            </label>
            <input
              type="password"
              id="new_password"
              {...register("new_password")}
              placeholder="Digite a nova senha"
              className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none border ${errors.new_password ? "border-red-300" : "border-[#B0BAC340]"} focus:border-zinc-500`}
            />
            {errors.new_password && <p className="text-sm text-red-600 mt-1">{errors.new_password.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirm_password" className="text-lg font-medium text-[#7C838A]">
              Confirmar nova senha
            </label>
            <input
              type="password"
              id="confirm_password"
              {...register("confirm_password")}
              placeholder="Confirme a nova senha"
              className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none border ${errors.confirm_password ? "border-red-300" : "border-[#B0BAC340]"} focus:border-zinc-500`}
            />
            {errors.confirm_password && <p className="text-sm text-red-600 mt-1">{errors.confirm_password.message}</p>}
          </div>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{error}</div>}
        <button
          type="submit"
          disabled={isSubmitting || !token}
          className="w-full bg-main text-white py-3 cursor-pointer font-medium text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-main/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
        </button>
      </form>
    </div>
  );
}
