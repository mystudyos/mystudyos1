"use client"

import { ShieldAlert, LogOut, Mail } from "lucide-react"
import { ADMIN_EMAIL, BAN_MESSAGE_TEMPLATE } from "@/lib/constants"

interface BannedViewProps {
  onLogout: () => void
}

export function BannedView({ onLogout }: BannedViewProps) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#0d0f1e]">
      <div className="w-full max-w-sm glass rounded-[2.5rem] p-8 shadow-2xl border border-destructive/20 relative overflow-hidden">
        {/* Warning Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-destructive/20 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6 mx-auto border border-destructive/20">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-3 tracking-tight">Access Suspended</h2>
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account has been suspended due to <span className="text-destructive font-bold">Inaccurate School Affiliation</span>.
          </p>
          
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-muted-foreground text-left leading-relaxed">
            <p className="font-bold text-white mb-1 uppercase tracking-wider">Policy Reminder:</p>
            StudyOS maintains strict partnerships with collaborated schools. Providing false information violates our Terms of Service.
          </div>

          <div className="pt-4 space-y-3">
            <a 
              href={`mailto:${ADMIN_EMAIL}?subject=Appeal Suspension&body=Name: [Your Name]%0AEmail: [Your Registered Email]%0AReason for Appeal: `}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/5 text-sm font-bold text-white hover:bg-white/10 transition-all"
            >
              <Mail className="w-4 h-4" />
              Appeal Suspension
            </a>

            <button
              onClick={onLogout}
              className="w-full py-4 rounded-2xl bg-destructive text-white font-bold text-sm shadow-lg shadow-destructive/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
          
          <p className="text-[10px] text-muted-foreground pt-4">
            If you belong to a partnered school, please re-register with your genuine details.
          </p>
        </div>
      </div>
    </div>
  )
}
