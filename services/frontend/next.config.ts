import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
