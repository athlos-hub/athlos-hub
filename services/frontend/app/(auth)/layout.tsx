import Image from "next/image";

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen">
            <div className="flex items-stretch w-full min-h-screen bg-[#e6f3ed]">
                <div className="hidden lg:flex flex-shrink-0 min-w-[391px] max-w-[531px] items-center justify-center p-8 relative z-10">
                    <Image
                        src="/auth.png"
                        alt=""
                        width={453}
                        height={615}
                        className="w-full h-auto"
                    />
                </div>
                <div className="bg-[#FCFEFF] py-16 flex-1 min-w-0 flex items-center justify-center flex-col gap-6 px-6 lg:-ml-16 rounded-tl-3xl rounded-bl-3xl">
                    {children}
                </div>
            </div>
        </div>
    );
}