import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        user: {
            id: string;
        } & DefaultSession["user"];
    }

    interface User {
        accessToken?: string;
        refreshToken?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        id?: string;
    }
}