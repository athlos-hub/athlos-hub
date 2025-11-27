"use server";

import { cookies } from "next/headers";

export async function checkPendingVerification() {
    const cookieStore = await cookies();

    return cookieStore.has("pending_verification_email");
}