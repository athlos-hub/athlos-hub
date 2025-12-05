import PlayerHeader from "@/components/layout/player/header";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/login");
    }

    return (
        <div className="max-w-[80rem] mx-auto w-full px-[2.5rem]">
            <PlayerHeader session={session} />
            {children}
        </div>
    );
}