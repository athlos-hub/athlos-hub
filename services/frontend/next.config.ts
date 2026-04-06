import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "athloshub-media.s3.us-east-2.amazonaws.com",
            },
        ],
        dangerouslyAllowSVG: true,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "8mb",
            allowedOrigins: process.env.NEXT_ALLOWED_ORIGINS?.split(',') || ['localhost:8100', 'localhost:3000'],
        },
    },
    async redirects() {
        return [
            {
                source: "/jogos/agendados",
                destination: "/jogos?status=scheduled",
                permanent: false,
            },
            {
                source: "/jogos/ao-vivo",
                destination: "/jogos?status=live",
                permanent: false,
            },
            {
                source: "/jogos/resultados",
                destination: "/jogos?status=finished",
                permanent: false,
            },
            {
                source: "/partidas/:matchId",
                destination: "/jogos",
                permanent: false,
            },
        ];
    },
    async rewrites() {
        const isProd = process.env.ENV === "prod";

        if (!isProd) {
            // Não reescrever /api/auth/* — NextAuth usa /api/auth/session, csrf, etc. no próprio Next.
            // Rotas BFF ficam em app/api/auth/* (refresh-token, register, ...).
            const socialBase =
                process.env.SOCIAL_SERVICE_URL || "http://localhost:8100";
            return [
                {
                    source: "/api/social/:path*",
                    destination: `${socialBase.replace(/\/$/, "")}/api/social/:path*`,
                },
            ];
        }

        return [];
    },
};

export default nextConfig;
