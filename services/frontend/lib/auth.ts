import { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiPost, axiosAPI, APIException } from "./api";
import { cookies } from "next/headers";

interface BackendLoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user?: BackendUserResponse;
}

interface BackendUserResponse {
    id: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email_verified?: boolean;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                code: { label: "Code", type: "text" },
                redirectUri: { label: "Redirect URI", type: "text" },
                loginType: { label: "Type", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials) return null;

                try {
                    if (credentials.loginType === "keycloak" && credentials.code) {
                        try {
                            const dataResp = await apiPost<BackendLoginResponse>('/auth/keycloak/callback', {
                                code: credentials.code,
                                redirect_uri: credentials.redirectUri,
                            }, false);

                            const data = dataResp.data;

                            if (!data || !(data as BackendLoginResponse).access_token) {
                                return null;
                            }

                            const userData = (data as BackendLoginResponse).user;

                            return {
                                id: String(userData?.id),
                                name: userData?.first_name || userData?.username,
                                email: userData?.email,
                                image: userData?.avatar_url || userData?.avatarUrl,
                                accessToken: (data as BackendLoginResponse).access_token,
                                refreshToken: (data as BackendLoginResponse).refresh_token,
                            } as User;

                        } catch {
                            return null;
                        }
                    }

                    if (!credentials.email || !credentials.password) return null;

                    let tokens: BackendLoginResponse;
                    try {
                        const response = await apiPost<BackendLoginResponse>(`/auth/login`, {
                            username: credentials.email,
                            password: credentials.password,
                        }, false);

                        tokens = response.data;

                        if (!tokens || !tokens.access_token) {
                            return null;
                        }
                    } catch (err) {
                        if (err instanceof APIException) {
                            const code = err.code ?? "";
                            const isVerificationIssue = String(code).includes("ACCOUNT_NOT_VERIFIED") || String(code).includes("ACCOUNT_DISABLED");

                            const cookieStore = await cookies();

                            if (isVerificationIssue) {
                                cookieStore.set("pending_verification_email", credentials.email, {
                                    httpOnly: true,
                                    secure: process.env.NODE_ENV === "production",
                                    path: "/",
                                    sameSite: "lax",
                                    maxAge: 60 * 15,
                                });

                                throw new Error("ACCOUNT_NOT_VERIFIED");
                            }

                            cookieStore.delete("pending_verification_email");
                            return null;
                        }

                        throw err;
                    }

                    let userProfile: BackendUserResponse | null = null;

                    try {
                        const meResp = await axiosAPI<BackendUserResponse>({ endpoint: '/auth/me', method: 'GET', withAuth: true, bearerToken: tokens.access_token });

                        userProfile = meResp.data;
                    } catch {
                    }

                    if (!userProfile || !userProfile.id) {
                        return null;
                    }

                    return {
                        id: String(userProfile.id),
                        email: userProfile.email,
                        name: userProfile.firstName || userProfile.username,
                        image: userProfile.avatarUrl,
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                    } as User;

                } catch (error: unknown) {
                    const errMsg = (error instanceof Error) ? error.message : String(error ?? "");

                    if (errMsg === "ACCOUNT_NOT_VERIFIED") {
                        throw new Error(errMsg);
                    }

                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.refreshToken = token.refreshToken as string;
            session.user = {
                ...session.user,
                id: token.id as string,
            };
            return session;
        },
    },
    pages: { signIn: "/login", error: "/login" },
    session: { strategy: "jwt" },
    events: {
        async signOut({ token }) {
            if (!token?.refreshToken) return;
            try {
                await apiPost('/auth/logout', { refresh_token: token.refreshToken }, false);
            } catch {
            }
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};