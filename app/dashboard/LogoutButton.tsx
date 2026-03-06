"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 border border-red-200 rounded-lg bg-red-50 text-[0.6875rem] md:text-xs font-semibold text-red-600 cursor-pointer transition-colors hover:bg-red-100 active:scale-95"
        >
            <span className="material-icons-outlined text-sm md:text-base">logout</span>
            <span className="hidden sm:inline">Logout</span>
        </button>
    );
}
