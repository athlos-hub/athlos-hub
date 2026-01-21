"use client";

import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { checkPendingVerification } from "@/actions/auth-checks";
import { publicGet } from "@/lib/api";
import { toast } from "sonner";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter ao menos 6 caracteres" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      });

      setIsLoading(false);

      if (!res || res.error) {
        const isVerificationNeeded = await checkPendingVerification();

        if (isVerificationNeeded) {
          toast.success('Conta criada. Verifique seu email para ativar sua conta.');
          router.push("/verify");
          return;
        }

        setServerError("Email ou senha incorretos.");
        return;
      }

      const session = await getSession();
      if (!session) {
        setServerError("Email ou senha incorretos.");
        return;
      }

      toast.success('Login efetuado com sucesso.');
      router.push("/");
      router.refresh();
    } catch {
      setServerError("Ocorreu um erro inesperado.");
      setIsLoading(false);
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const resp = await publicGet<{ auth_url: string }>(`/auth/google/url`);
      window.location.href = resp.data.auth_url;
    } catch {
      setServerError("Erro ao conectar com Google.");
      toast.error('Erro ao conectar com Google. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-16 gap-8 w-full max-w-[37.5rem] mx-auto">
      <span className="text-2xl text-center font-medium">Entrar no AthlosHub</span>

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
              placeholder="Insira seu email"
              className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none border ${
                errors.email ? "border-red-300" : "border-[#B0BAC340]"
              } focus:border-zinc-500`}
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-lg font-medium text-[#7C838A]">
              Senha
            </label>
            <input
              type="password"
              id="password"
              {...register("password")}
              placeholder="Insira sua senha"
              className={`w-full px-3 bg-[#B0BAC340] py-3 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none border ${
                errors.password ? "border-red-300" : "border-[#B0BAC340]"
              } focus:border-zinc-500`}
            />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>
        </div>

        {serverError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-main text-white py-3 cursor-pointer font-medium text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-main/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Entrando..." : "Entrar"}
        </button>
      </form>


      <span className="text-[#7C838A] flex flex-col gap-1 items-center">
        <span>
          Não tem conta?{" "}
          <Link href="/auth/cadastro" className="text-main hover:underline">
            Cadastre-se
          </Link>
        </span>
        <Link href="/auth/login/forgot-password" className="text-main hover:underline text-sm mt-2">
          Esqueci minha senha
        </Link>
      </span>

      <span className="text-xl text-[#7C838A] font-medium">- OU -</span>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="rounded-xl bg-[#fff] cursor-pointer text-[#474747] font-medium px-10 py-4 shadow-md flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <FcGoogle size={26} />
        Fazer login com Google
      </button>
    </div>
  );
}