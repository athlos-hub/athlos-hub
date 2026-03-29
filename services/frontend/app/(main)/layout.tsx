import PlayerHeader from "@/components/layout/player/header";
import { MainContentPadding } from "@/components/layout/main-content-padding";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
    const session = await getServerSession(authOptions);
    return (
        <div className="max-w-7xl mx-auto w-full min-w-0">
            <PlayerHeader session={session} />
            <MainContentPadding>{children}</MainContentPadding>
        </div>
    );
}