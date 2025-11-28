'use client';

import { useState, useEffect } from 'react';
import { Mail, CheckCircle, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { verifyEmail, resendVerificationEmail } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import Link from "next/link";

interface VerifyEmailPageProps {
    token?: string | null;
    email?: string | null;
}

export default function VerifyEmailPage({ token, email }: VerifyEmailPageProps) {
    const router = useRouter();

    const [isResending, setIsResending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(!!token);
    const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!token) return;

        (async () => {
            setIsVerifying(true);
            setErrorMessage('');

            const result = await verifyEmail(token);

            if (result.success) {
                setVerifyStatus('success');
                setTimeout(() => router.push('/auth/login'), 3000);
            } else {
                setVerifyStatus('error');
                setErrorMessage(result.error || 'Link inválido ou expirado.');
            }

            setIsVerifying(false);
        })();
    }, [token, router]);

    const handleResendEmail = async () => {
        if (!email) return;
        setIsResending(true);
        setResendStatus('idle');
        setErrorMessage('');

        const result = await resendVerificationEmail(email);

        if (result.success) {
            setResendStatus('success');
            setTimeout(() => setResendStatus('idle'), 5000);
        } else {
            setResendStatus('error');
            setErrorMessage(result.error || 'Erro ao reenviar email');
        }
        setIsResending(false);
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center py-36">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                                <div className="relative bg-main p-4 rounded-full">
                                    <Mail className="w-12 h-12 text-[#fff]" strokeWidth={2} />
                                </div>
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Verifique seu email
                            </h1>
                            {email ? (
                                <>
                                    <p className="text-gray-600">
                                        Enviamos um link de verificação para
                                    </p>
                                    <p className="font-semibold text-blue-700">
                                        {email}
                                    </p>
                                </>
                            ) : (
                                <p className="text-gray-600">Verifique sua caixa de entrada.</p>
                            )}
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <p className="text-sm text-gray-700 text-center">
                                Clique no link enviado para ativar sua conta. O link expira em 24 horas.
                            </p>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-gray-500">
                                Não recebeu? Verifique o Spam ou Lixeira.
                            </p>
                        </div>

                        {email && (
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
                                            Reenviar verificação de email
                                        </>
                                    )}
                                </button>

                                {resendStatus === 'success' && (
                                    <div className="flex items-center gap-2 text-green-600 text-sm justify-center bg-green-50 py-2 rounded-lg border border-green-100">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Email reenviado com sucesso!</span>
                                    </div>
                                )}

                                {resendStatus === 'error' && errorMessage && (
                                    <div className="flex items-center gap-2 text-red-600 text-sm justify-center bg-red-50 py-2 rounded-lg border border-red-100">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-center mt-4">
                            <Link
                                href="/auth/login"
                                className="text-sm text-main hover:underline"
                            >
                                Voltar para o Login
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

                    {isVerifying || verifyStatus === 'idle' ? (
                        <>
                            <div className="flex justify-center">
                                <div className="relative w-16 h-16">
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-main border-r-main animate-spin"></div>
                                </div>
                            </div>
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Validando token...
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    Estamos ativando sua conta.
                                </p>
                            </div>
                        </>
                    ) : verifyStatus === 'success' ? (
                        <>
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
                                    Conta Ativada!
                                </h1>
                                <p className="text-gray-600">
                                    Tudo pronto. Você será redirecionado.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-center">
                                <div className="relative bg-red-100 p-4 rounded-full">
                                    <AlertCircle className="w-12 h-12 text-red-600" strokeWidth={2} />
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Link Inválido
                                </h1>
                                <p className="text-gray-600">
                                    {errorMessage}
                                </p>
                            </div>

                            <button
                                onClick={() => router.push('/verify')}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md"
                            >
                                Solicitar novo link
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}