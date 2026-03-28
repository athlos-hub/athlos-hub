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
            allowedOrigins: process.env.NEXT_ALLOWED_ORIGINS?.split(',') || ['localhost:8100', 'localhost:3000'],
        },
    },
    async rewrites() {
        const isProd = process.env.ENV === 'prod';
    
        if (!isProd) {
            return [
                {
                    source: '/api/auth/:path*',
                    destination: `${process.env.AUTH_API_URL || 'http://localhost:8000'}/api/auth/:path*`,
                },
                {
                    source: '/api/social/:path*',
                    destination: `${process.env.SOCIAL_SERVICE_URL || 'http://localhost:8083'}/api/social/:path*`,
                },
            ];
        }
        
        return [];
  },
};

export default nextConfig;
