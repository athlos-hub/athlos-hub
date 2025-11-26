"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

export default function CadastroPage() {
    const [preview, setPreview] = useState<string | null>(null)

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) setPreview(URL.createObjectURL(file))
    }

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-[37.5rem] mx-auto">
            <span className="text-2xl text-center font-medium">
                Cadastre-se no AthlosHub
            </span>
            <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-full overflow-hidden border shadow bg-gray-100 relative">
                    {preview ? (
                        <Image
                            src={preview}
                            alt="Prévia do avatar"
                            fill
                            unoptimized
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            Foto
                        </div>
                    )}
                </div>
                <label className="cursor-pointer text-main font-medium">
                    Selecionar avatar
                    <input
                        type="file"
                        accept="image/*"
                        name="avatar"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </label>
            </div>

            <form
                action=""
                className="w-full flex flex-col gap-8"
                encType="multipart/form-data"
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 w-full">

                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-lg font-medium text-[#7C838A]">Nome</label>
                            <input
                                type="text"
                                name="first_name"
                                required
                                placeholder="Insira seu nome"
                                className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border border-[#B0BAC340] focus:border-zinc-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-lg font-medium text-[#7C838A]">Sobrenome</label>
                            <input
                                type="text"
                                name="last_name"
                                required
                                placeholder="Insira seu sobrenome"
                                className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border border-[#B0BAC340] focus:border-zinc-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="Insira seu email"
                            className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border border-[#B0BAC340] focus:border-zinc-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Senha</label>
                        <input
                            type="password"
                            name="password"
                            required
                            placeholder="Insira sua senha"
                            className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border border-[#B0BAC340] focus:border-zinc-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-lg font-medium text-[#7C838A]">Confirmar senha</label>
                        <input
                            type="password"
                            name="confirm_password"
                            required
                            placeholder="Confirme sua senha"
                            className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg border border-[#B0BAC340] focus:border-zinc-500 focus:outline-none"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    className="w-full bg-main text-white py-3 cursor-pointer font-medium text-lg rounded-lg
                               focus:outline-none hover:bg-main/90 transition-colors duration-200"
                >
                    Criar conta
                </button>
            </form>
            <span className="text-[#7C838A]">
                Já possui conta? <Link href="/auth/login" className="text-main">Entrar</Link>
            </span>
        </div>
    )
}
