"use client"

import { ArrowLeft, Play, Award, CheckCircle, HelpCircle } from "lucide-react"
import { SURVEYS, type Survey } from "@/lib/surveys"
import { type UserStats } from "@/lib/user-stats"

interface SurveysViewProps {
  stats: UserStats | null
  onBack: () => void
  onPlaySurvey: (survey: Survey) => void
}

export function SurveysView({ stats, onBack, onPlaySurvey }: SurveysViewProps) {
  const surveyResults = stats?.surveyResults || {}

  // Determine if there are uncompleted surveys
  const getSurveyStatus = (surveyId: string) => {
    return surveyResults[surveyId] || null
  }

  return (
    <div className="flex flex-col min-h-full w-full max-w-lg mx-auto px-5 pt-12 lg:pt-6 pb-8 animate-in fade-in duration-300">
      {/* Sticky Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mini-Games & Surveys</p>
          <h1 className="text-lg font-bold text-foreground">Trivia Challenges</h1>
        </div>
      </div>

      <div className="glass rounded-[1.75rem] p-5 border border-white/10 mb-6 bg-primary/5">
        <p className="text-xs text-foreground/80 leading-relaxed font-medium">
          Welcome to StudyOS Trivia! Test your knowledge on app history, tips, and school subjects. 
          Each trivia quiz can only be played <span className="font-bold text-primary">once</span>, and your score will be proudly displayed on your student profile!
        </p>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Available Trivia Games ({SURVEYS.length})
      </h2>

      <div className="space-y-4">
        {SURVEYS.map((survey) => {
          const result = getSurveyStatus(survey.id)
          const isCompleted = !!result && result.total === survey.questions.length

          return (
            <div 
              key={survey.id}
              className="glass rounded-2xl border border-white/10 p-5 flex flex-col relative overflow-hidden transition-all duration-300 hover:border-white/20"
            >
              {/* Completed background stamp */}
              {isCompleted && (
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-emerald-500/5 flex items-center justify-center pointer-events-none">
                  <CheckCircle className="w-8 h-8 text-emerald-500/10" />
                </div>
              )}

              <div className="flex justify-between items-start gap-4 mb-2">
                <h3 className="text-sm font-bold text-foreground leading-tight">
                  {survey.title}
                </h3>
                {isCompleted ? (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                    Done • {result.score}/{result.total}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/25 shrink-0">
                    Not Played
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
                {survey.description}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50" /> {survey.questions.length} Questions
                </span>

                {isCompleted ? (
                  <div className="text-[11px] font-semibold text-muted-foreground/40 italic flex items-center gap-1">
                    Played on {new Date(result.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                ) : (
                  <button
                    onClick={() => onPlaySurvey(survey)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground shadow-md bg-linear-to-r from-primary to-primary/80 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Play Trivia
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
