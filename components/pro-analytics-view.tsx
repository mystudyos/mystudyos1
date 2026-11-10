"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { TrendingUp, BarChart2, Target, Trophy, Loader2 } from "lucide-react"
import { fetchRecentQuizResults, fetchLeaderboard, type UserStats } from "@/lib/user-stats"
import type { User as FirebaseUser } from "firebase/auth"

interface ProAnalyticsViewProps {
  user: FirebaseUser | null
  stats: UserStats | null
}

export function ProAnalyticsView({ user, stats }: ProAnalyticsViewProps) {
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])
  const [globalRank, setGlobalRank] = useState<number | null>(null)
  const [topAverage, setTopAverage] = useState<number>(0)

  useEffect(() => {
    if (!user) return

    async function loadAnalytics() {
      try {
        // Fetch recent quizzes for the trend chart
        const results = await fetchRecentQuizResults(user!.uid, 15)
        
        // Format for Recharts (reverse to get chronological order)
        const formattedData = results.reverse().map((r, i) => ({
          name: `Q${i + 1}`,
          accuracy: r.accuracy,
          score: r.score
        }))
        setChartData(formattedData)

        // Fetch leaderboard to calculate standing
        const board = await fetchLeaderboard(500) // Get top 500 for accurate ranking
        
        const rankIndex = board.findIndex(entry => entry.uid === user!.uid)
        if (rankIndex !== -1) {
          setGlobalRank(rankIndex + 1)
        }
        
        // Calculate top 10 average accuracy
        if (board.length > 0) {
          const top10 = board.slice(0, 10)
          const avg = top10.reduce((acc, curr) => acc + curr.accuracy, 0) / top10.length
          setTopAverage(Math.round(avg))
        }

      } catch (err) {
        console.error("Failed to load analytics:", err)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [user])

  if (loading || !stats) {
    return (
      <div className="px-5 mb-5 animate-pulse">
        <div className="glass rounded-2xl h-48 flex items-center justify-center">
           <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  // Process subject breakdown for the UI
  const subjects = Object.entries(stats.subjectBreakdown || {})
    .map(([name, data]) => {
      const subjectAccuracy = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
      return { name, answered: data.answered, correct: data.correct, accuracy: subjectAccuracy }
    })
    .sort((a, b) => b.answered - a.answered) // Sort by most practiced

  return (
    <div className="px-5 mb-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pro Insights</h2>
      </div>

      {/* 1. Performance Trend Chart */}
      <div className="glass rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-foreground">Performance Trend</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last 15 Sessions</p>
          </div>
          <TrendingUp className="w-4 h-4 text-primary opacity-80" />
        </div>
        
        {chartData.length > 1 ? (
          <div className="h-40 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted-foreground)" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} tickMargin={8} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--color-popover-foreground)', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="var(--color-chart-1)" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--color-chart-1)", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--color-foreground)", stroke: "var(--color-chart-1)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 w-full flex items-center justify-center text-xs text-muted-foreground/60 border border-dashed border-white/10 rounded-xl">
            Take more quizzes to see your trend.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 2. Global Standing Widget */}
        <div className="glass rounded-2xl p-4 border border-white/5 flex flex-col justify-between relative overflow-hidden">
           <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
           <div>
            <Trophy className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Global Rank</p>
           </div>
           <div className="mt-2">
             <p className="text-2xl font-black text-foreground">
               {globalRank ? `#${globalRank}` : "Top 100+"}
             </p>
             <p className="text-[10px] text-muted-foreground/80 leading-tight mt-1">
               {globalRank ? "You are dominating!" : "Keep pushing to enter the Top 100."}
             </p>
           </div>
        </div>

        {/* 3. Top Tier Comparison */}
        <div className="glass rounded-2xl p-4 border border-white/5 flex flex-col justify-between relative overflow-hidden">
           <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
           <div>
            <Target className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Vs. Top 10</p>
           </div>
           <div className="mt-2">
             <p className="text-2xl font-black text-foreground">{topAverage}%</p>
             <p className="text-[10px] text-muted-foreground/80 leading-tight mt-1">
               Average accuracy of the top 10 scholars.
             </p>
           </div>
        </div>
      </div>

      {/* 4. Subject Mastery Matrix */}
      <div className="glass rounded-2xl p-4 border border-white/5">
        <p className="text-sm font-bold text-foreground mb-4">Subject Mastery</p>
        
        {subjects.length > 0 ? (
          <div className="space-y-4">
            {subjects.map((subj) => {
              // Color code based on accuracy
              let color = "bg-primary"; // > 80%
              let bg = "bg-primary/20";
              if (subj.accuracy < 50) { color = "bg-rose-500"; bg = "bg-rose-500/20"; }
              else if (subj.accuracy < 70) { color = "bg-amber-400"; bg = "bg-amber-400/20"; }

              return (
                <div key={subj.name}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-semibold text-foreground truncate mr-2">{subj.name}</span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums shrink-0">{subj.accuracy}%</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${bg}`}>
                    <div 
                      className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`} 
                      style={{ width: `${Math.max(5, subj.accuracy)}%` }} // Give at least 5% width so it's visible
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 text-center py-4 border border-dashed border-white/10 rounded-xl">
            No subject data yet.
          </p>
        )}
      </div>

    </div>
  )
}
