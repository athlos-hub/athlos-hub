"use client"

import { useState } from 'react';
import { Mail, CheckCircle, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import Link from "next/link";

interface VerifyEmailPageProps {
    token?: string | null;
}

export default function VerifyEmailPage({ token }: VerifyEmailPageProps) {
    const [isResending, setIsResending] = useState(false);
    const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const userEmail = "usuario@exemplo.com";

    const handleResendEmail = async () => {
        setIsResending(true);
        setResendStatus('idle');

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            setResendStatus('success');
            setTimeout(() => setResendStatus('idle'), 5000);
        } catch (error) {
            setResendStatus('error');
        } finally {
            setIsResending(false);
        }
    };

    if (!token) {
        return (
            <div className="h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">

                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                                <div className="relative bg-main p-4 rounded-full">
                                    <Mail className="w-12 h-12 text-white" strokeWidth={2} />
                                </div>
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Verifique seu email
                            </h1>
                            <p className="text-gray-600">
                                Enviamos um link de verificação para
                            </p>
                            <p className="font-semibold text-blue-600">
                                {userEmail}
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <p className="text-sm text-gray-700 text-center">
                                Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
                            </p>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-gray-500">
                                Não recebeu o email? Verifique sua pasta de spam ou lixo eletrônico
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleResendEmail}
                                disabled={isResending || resendStatus === 'success'}
                                className="w-full bg-main text-white py-3 px-4 rounded-lg font-medium
                                         hover:bg-main/90 cursor-pointer transition-all duration-200
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Reenviando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-5 h-5" />
                                        Reenviar email de verificação
                                    </>
                                )}
                            </button>

                            {resendStatus === 'success' && (
                                <div className="flex items-center gap-2 text-green-600 text-sm justify-center bg-green-50 py-2 rounded-lg">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Email reenviado com sucesso!</span>
                                </div>
                            )}

                            {resendStatus === 'error' && (
                                <div className="flex items-center gap-2 text-red-600 text-sm justify-center bg-red-50 py-2 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>Erro ao reenviar. Tente novamente.</span>
                                </div>
                            )}
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

                    {/* Ícone de Sucesso */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                            <div className="relative bg-[#008548] p-4 rounded-full">
                                <CheckCircle className="w-12 h-12 text-white" strokeWidth={2} />
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Email verificado com sucesso!
                        </h1>
                        <p className="text-gray-600">
                            Sua conta foi ativada e está pronta para uso
                        </p>
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                        <p className="text-sm text-gray-700 text-center">
                            Você já pode fazer login na sua conta e aproveitar todos os recursos da plataforma.
                        </p>
                    </div>

                    <button
                        onClick={() => window.location.href = '/auth/login'}
                        className="w-full bg-[#008548] cursor-pointer text-white py-3 px-4 rounded-lg font-medium
                                 hover:bg-[#007741] transition-all duration-200
                                 shadow-md hover:shadow-lg"
                    >
                        Ir para o login
                    </button>
                </div>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-600">
                        <Link href="/" className="text-[#008548] hover:[#00854890] font-medium">
                            Voltar para página inicial
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}