"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { KeyRound, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "As senhas não coincidem.",
    path: ["confirm_password"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordPageProps {
  token?: string | null;
  email?: string | null;
}

export default function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      setError("Token de redefinição ausente ou inválido.");
    }
  }, [token]);

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: values.new_password }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/auth/login"), 3000);
      } else {
        setError(data.error || "Erro ao redefinir senha.");
      }
    } catch {
      setError("Erro inesperado ao redefinir senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
            <div className="flex justify-center">
              <div className="relative bg-red-100 p-4 rounded-full">
                <AlertCircle className="w-12 h-12 text-red-600" strokeWidth={2} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Link inválido</h1>
              <p className="text-gray-600">
                {error || "Não foi possível redefinir a senha sem um link válido."}
              </p>
            </div>
            <Link
              href="/auth/login/forgot-password"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-main py-3 px-4 font-medium text-white shadow-md transition-all hover:bg-main/90"
            >
              Solicitar novo link
            </Link>
            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-main hover:underline">
                Voltar para o login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-400 opacity-30 blur-xl animate-pulse" />
                <div className="relative rounded-full bg-[#008548] p-4">
                  <CheckCircle className="h-12 w-12 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Senha redefinida</h1>
              <p className="text-gray-600">Tudo certo. Você será redirecionado para o login.</p>
            </div>
            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-main hover:underline">
                Ir para o login agora
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 blur-xl animate-pulse" />
              <div className="relative rounded-full bg-main p-4">
                <KeyRound className="h-12 w-12 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Redefinir senha</h1>
            <p className="text-gray-600">Escolha uma nova senha para acessar o AthlosHub.</p>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-center text-sm text-gray-700">
              Use pelo menos 6 caracteres. Se o link expirou, solicite um novo em “Esqueci minha
              senha” no login.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-sm font-medium text-gray-800">
                Nova senha
              </Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                placeholder="Digite a nova senha"
                className={`h-11 ${errors.new_password ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                {...register("new_password")}
              />
              {errors.new_password && (
                <p className="text-sm text-red-600">{errors.new_password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-sm font-medium text-gray-800">
                Confirmar nova senha
              </Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirme a nova senha"
                className={`h-11 ${errors.confirm_password ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                {...register("confirm_password")}
              />
              {errors.confirm_password && (
                <p className="text-sm text-red-600">{errors.confirm_password.message}</p>
              )}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 py-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-main py-3 px-4 font-medium text-white shadow-md transition-all duration-200 hover:bg-main/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                "Redefinir senha"
              )}
            </button>
          </form>

          <div className="text-center">
            <Link href="/auth/login" className="text-sm text-main hover:underline">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
