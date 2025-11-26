import Link from "next/link";
import {FcGoogle} from "react-icons/fc";

export default function LoginPage() {
    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-[37.5rem] mx-auto">
            <span className="text-2xl text-center font-medium">Entrar no AthlosHub</span>
            <form action="" className="w-full flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-lg font-medium text-[#7C838A]">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            placeholder="Insira seu email"
                            className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none border border-[#B0BAC340] focus:border-zinc-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-lg font-medium text-[#7C838A]">Senha</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            placeholder="Insira sua senha"
                                className="w-full px-3 bg-[#B0BAC340] py-3 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none border border-[#B0BAC340] focus:border-zinc-500"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    className="w-full bg-main text-white py-3 cursor-pointer font-medium text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-main/90 transition-colors duration-200"
                >
                    Entrar
                </button>
            </form>
            <span className="text-[#7C838A]">Não tem conta? <Link href="/auth/cadastro" className="text-main">Cadastre-se</Link> </span>
            <span className="text-xl text-[#7C838A] font-medium">- OU -</span>
            <a href="#" className="rounded-xl bg-[#fff] text-[#474747] font-medium px-10 py-4 shadow-md flex items-center gap-2">
                <FcGoogle size={26} />
                Fazer login com Google
            </a>
        </div>
    )
}