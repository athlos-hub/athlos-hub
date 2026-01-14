"use client"

import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AdminHeader() {
    const handleLogout = () => {
        signOut({ callbackUrl: "/auth/login" });
    };

    return (
        <div className="w-full fixed top-0 left-0 z-50 bg-white shadow-md">
            <div className="w-full flex items-center justify-between py-4 bg-white">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <Link href="/admin">
                        <Image
                            src="/logo.svg"
                            alt="Logo Oficial do AthlosHub"
                            width={180}
                            height={46}
                            priority
                        />
                    </Link>
                    <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair
                    </Button>
                </div>
            </div>
        </div>
    );
}
