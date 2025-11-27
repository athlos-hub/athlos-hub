import PlayerHeader from "@/components/layout/player/header";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
    const session = await getServerSession(authOptions);

    return (
        <div className="max-w-[80rem] mx-auto w-full px-[2.5rem]">
            <PlayerHeader session={session} />
            {children}
        </div>
    );
}