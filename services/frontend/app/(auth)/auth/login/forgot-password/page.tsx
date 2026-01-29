"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const resp = await fetch("/api/v1/auth/request-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSuccess(true);
        toast.success("Email de redefinição enviado! Verifique sua caixa de entrada.");
        reset();
      } else {
        setServerError(data.error || "Erro ao solicitar redefinição de senha.");
      }
    } catch (e) {
      setServerError("Erro inesperado ao solicitar redefinição de senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center py-16 gap-8 w-full max-w-150 mx-auto">
        <span className="text-2xl text-center font-medium text-green-600">Email enviado!</span>
        <span>Verifique sua caixa de entrada para redefinir sua senha.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-16 gap-8 w-full max-w-150 mx-auto">
      <span className="text-2xl text-center font-medium">Esqueci minha senha</span>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-lg font-medium text-[#7C838A]">
              Email
            </label>
            <input
              type="email"
              id="email"
              {...register("email")}
              placeholder="Digite seu email"
              className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none border ${errors.email ? "border-red-300" : "border-[#B0BAC340]"} focus:border-zinc-500`}
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>
        </div>
        {serverError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{serverError}</div>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-main text-white py-3 cursor-pointer font-medium text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-main/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
        </button>
      </form>
    </div>
  );
}
