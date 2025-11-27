import { cookies } from "next/headers";
import VerifyEmailPage from "@/components/pages/verify-page";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VerifyTokenPage({ searchParams }: PageProps) {
    const query = await searchParams;

    const token = typeof query.token === "string" ? query.token : null;

    let email = null;
    if (!token) {
        const cookieStore = await cookies();
        const emailCookie = cookieStore.get("pending_verification_email");
        email = emailCookie?.value || null;
    }

    return <VerifyEmailPage token={token} email={email} />;
}