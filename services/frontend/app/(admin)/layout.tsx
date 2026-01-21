import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminHeader from "@/components/layout/admin/admin-header";

function extractRolesFromToken(accessToken: string): string[] {
    try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        return payload?.realm_access?.roles || [];
    } catch {
        return [];
    }
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        redirect("/auth/login");
    }

    const roles = extractRolesFromToken(session.accessToken);
    const isAdmin = roles.includes('admin');

    if (!isAdmin) {
        redirect("/");
    }

    return (
        <div className="max-w-7xl mx-auto w-full py-32">
            <AdminHeader />
            {children}
        </div>
    );
}
