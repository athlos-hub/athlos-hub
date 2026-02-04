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
            allowedOrigins: ['localhost:8100', 'localhost:3000'],
        },
    },
    async rewrites() {
        const isProd = process.env.ENV === 'prod';
    
        if (!isProd) {
            return [
                {
                    source: '/api/v1/auth/:path*',
                    destination: 'http://localhost:8000/api/v1/auth/:path*',
                },
                {
                    source: '/api/social/:path*',
                    destination: 'http://localhost:8083/api/social/:path*',
                },
            ];
        }
        
        return [];
  },
};

export default nextConfig;
