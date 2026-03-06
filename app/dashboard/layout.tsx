import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/dashboard/LogoutButton";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const sessionData = await getServerSession(authOptions);

    if (!sessionData) {
        redirect("/");
    }

    const sessionAlias = sessionData?.user?.name || "Tech";

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                rel="stylesheet"
            />
            <link
                href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
                rel="stylesheet"
            />

            <div className="min-h-screen bg-gray-100 font-[Inter,sans-serif]">

                {/* ── Navigation ── */}
                <nav className="w-full flex justify-between items-center px-3 md:px-8 h-14 md:h-16 bg-white border-b border-gray-100 sticky top-0 z-50">
                    {/* Left */}
                    <div className="flex items-center gap-3 md:gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs md:text-sm">
                                C
                            </div>
                            <span className="hidden sm:inline font-bold text-base md:text-lg tracking-tight text-gray-900">
                                CSEView <span className="text-[#3659b9]">is Back</span>
                            </span>
                        </div>

                        <div className="flex gap-3 md:gap-6 text-xs md:text-sm font-medium text-gray-500">
                            <Link href="/dashboard" className="text-gray-900 no-underline">Dashboard</Link>
                            <Link href="/dashboard/history" className="no-underline text-inherit">History</Link>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-1.5 md:gap-2 bg-gray-50 border border-gray-200 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-medium text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="max-w-[80px] md:max-w-none truncate">{sessionAlias}</span>
                        </div>
                        <LogoutButton />
                    </div>
                </nav>

                {/* ── Page Content ── */}
                <main className="max-w-[1400px] mx-auto px-3 py-3 md:px-8 md:py-6">
                    {children}
                </main>
            </div>
        </>
    );
}
