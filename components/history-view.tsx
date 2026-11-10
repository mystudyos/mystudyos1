"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Calendar, Clock } from "lucide-react"
import { type User as FirebaseUser } from "firebase/auth"
import { fetchRecentQuizResults, type QuizResult } from "@/lib/user-stats"

interface HistoryViewProps {
  user: FirebaseUser | null
  onBack: () => void
  onSelectResult: (result: QuizResult & { id: string }) => void
}

export function HistoryView({ user, onBack }: HistoryViewProps) {
  const [history, setHistory] = useState<(QuizResult & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const loadHistory = async () => {
      try {
        const data = await fetchRecentQuizResults(user.uid, 20)
        setHistory(data)
      } catch (err) {
        console.error("Failed to load history:", err)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [user])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—"
    let date: Date
    try {
      if (timestamp && typeof timestamp.toDate === "function") {
        date = timestamp.toDate()
      } else if (timestamp && typeof timestamp.seconds === "number") {
        date = new Date(timestamp.seconds * 1000)
      } else {
        date = new Date(timestamp)
      }
      if (isNaN(date.getTime())) {
        return "—"
      }
    } catch (e) {
      return "—"
    }

    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (e) {
      return "—"
    }
  }


  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-5 pt-12 pb-5">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Activity History</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Your past performance</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl glass animate-pulse" />
          ))
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">No history yet</p>
            <p className="text-sm text-muted-foreground max-w-50 mt-1">
              Complete your first quiz or training to see results here!
            </p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="w-full glass rounded-2xl p-5 border border-white/5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.subjects.map((s) => (
                      <span key={s} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{formatDate(item.answeredAt)}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="text-xl font-bold text-foreground leading-tight">{item.score}/{item.total}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${item.accuracy >= 70 ? "text-emerald-400" : item.accuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {item.accuracy}% Accuracy
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
