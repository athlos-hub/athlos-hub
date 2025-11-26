import VerifyEmailPage from "@/components/pages/verify-page";


interface VerifyEmailProps {
    params: Promise<{
        token: string;
    }>;
}

export default async function VerifyEmail({ params }: VerifyEmailProps) {
    const resolvedParams = await params;

    console.log(resolvedParams)

    return <VerifyEmailPage token={resolvedParams.token} />;
}