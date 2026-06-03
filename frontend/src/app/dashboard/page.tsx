"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FiGithub, FiCode, FiZap, FiLogOut, FiUser, FiGlobe } from "react-icons/fi";
import { FiLinkedin } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface User {
  id: number; email: string; name: string; mobile: string;
  user_type: string; website: string; linkedin: string; onboarding_completed: boolean;
}

const typeColor: Record<string, string> = {
  Freelancer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Student: "bg-green-500/10 text-green-400 border-green-500/20",
  Enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    api.dashboard(token)
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Nav */}
      <nav className="border-b border-border px-8 py-4 flex items-center justify-between">
        <span className="text-crimson font-bold tracking-tight">OpenSourceMate</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <button onClick={logout} className="text-muted-foreground hover:text-white transition-colors">
            <FiLogOut size={16} />
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-3xl font-bold mb-1">Welcome back, {user.name?.split(" ")[0]} 👋</h1>
              <p className="text-muted-foreground">Ready to make your next open source contribution?</p>
            </div>
            <Badge className={`text-xs border ${typeColor[user.user_type] || "bg-muted"}`}>{user.user_type}</Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: <FiGithub size={18} />, label: "Contributions", value: "0" },
              { icon: <FiCode size={18} />, label: "Issues Matched", value: "0" },
              { icon: <FiZap size={18} />, label: "AI Suggestions", value: "0" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i + 0.2 }}
                className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 hover:border-crimson/20 transition-all">
                <div className="text-crimson bg-crimson/10 rounded-lg p-2">{s.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Profile card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><FiUser size={15} className="text-crimson" /> Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Name", value: user.name },
                { label: "Email", value: user.email },
                { label: "Mobile", value: user.mobile },
                { label: "Type", value: user.user_type },
              ].map((row, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">{row.label}</span>
                  <span className="text-white">{row.value}</span>
                </div>
              ))}
            </div>
            {(user.website || user.linkedin) && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                {user.website && (
                  <a href={user.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-crimson transition-colors">
                    <FiGlobe size={13} /> Website
                  </a>
                )}
                {user.linkedin && (
                  <a href={user.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-crimson transition-colors">
                    <FiLinkedin size={13} /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
