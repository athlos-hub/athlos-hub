import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRealmRolesFromAccessToken } from "@/lib/auth/access-token-roles";
import AdminHeader from "@/components/layout/admin/admin-header";
import { privateAreaMetadata } from "@/lib/seo/site";

export const metadata: Metadata = privateAreaMetadata(
  "Administração",
  "Painel administrativo do AthlosHub."
);

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        redirect("/auth/login");
    }

    const roles = getRealmRolesFromAccessToken(session.accessToken);
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
