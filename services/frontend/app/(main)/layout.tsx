import PlayerHeader from "@/components/layout/player/header";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="max-w-[80rem] mx-auto w-full px-[2.5rem]">
            <PlayerHeader session={null} />
            {children}
        </div>
    );
}