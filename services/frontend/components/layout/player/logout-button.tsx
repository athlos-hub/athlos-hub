"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="text-red-600 w-full text-left px-2 py-1.5"
        >
            Sair
        </button>
    );
}