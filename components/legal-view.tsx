"use client"
 
import { ArrowLeft, ShieldCheck, FileText, Cookie } from "lucide-react"
 
interface LegalViewProps {
  type: "terms" | "privacy" | "cookies"
  onBack: () => void
}
 
export function LegalView({ type, onBack }: LegalViewProps) {
  const getHeaderTitle = () => {
    if (type === "privacy") return "Privacy Policy"
    if (type === "terms") return "Terms of Service"
    return "Cookie Policy"
  }
 
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky Apple-like header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-3xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground/80" />
          </button>
          <p className="text-sm font-medium tracking-wide text-foreground/80">
            {getHeaderTitle()}
          </p>
          <div className="w-10 h-10" /> {/* Balancer */}
        </div>
      </div>
 
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-20 scrollbar-hide max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6 border border-border">
            {type === "privacy" && <ShieldCheck className="w-8 h-8 text-primary" strokeWidth={1.5} />}
            {type === "terms" && <FileText className="w-8 h-8 text-primary" strokeWidth={1.5} />}
            {type === "cookies" && <Cookie className="w-8 h-8 text-primary" strokeWidth={1.5} />}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
            {getHeaderTitle()}
          </h1>
          <p className="text-sm text-foreground/50 tracking-wide">
            Last updated: May 27, 2026
          </p>
        </div>
 
        <div className="prose prose-sm max-w-none text-foreground/90 space-y-8 pb-12 leading-relaxed tracking-wide">
          {type === "privacy" && (
            <>
              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">1. Information We Collect</h2>
                <p>
                  StudyOS collects details necessary to provide our BECE preparation platform. This includes your name, email address, profile photo, and school selection or submission. We also record study streaks, earned medals, performance statistics, and responses to past question materials to generate smart dashboard analytics.
                </p>
              </section>
              
              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">2. Real-Time Chat & Community Features</h2>
                <p>
                  To encourage community-oriented study prep, StudyOS displays leaderboard listings and online presence statuses. When active, other members can view your online flag (based on your latest activity timestamp). Real-time message logs from the Global Chat are stored securely in Firestore, subject to our conduct guidelines.
                </p>
              </section>

              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">3. Information Usage & Disclosure</h2>
                <p>
                  We use your information strictly to support personal progress, manage streaks, and power leaderboards. StudyOS does not rent or sell student data to any advertising agencies. All financial data for Pro upgrades is processed safely by third-party checkout partners.
                </p>
              </section>
              
              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">4. Data Control & Rights</h2>
                <p>
                  You are the owner of your educational data. You can inspect or request total deletion of your credentials, stats, and records at any point. Contact our privacy team at <strong>support.studyos@gmail.com</strong> or call <strong>08052495541</strong> for request processing.
                </p>
              </section>
            </>
          )}

          {type === "terms" && (
            <>
              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">1. Acceptance of Terms</h2>
                <p>
                  By establishing a user profile or accessing study materials on StudyOS, you agree to comply with these terms, our community guidelines, and all applicable educational user laws.
                </p>
              </section>
              
              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">2. User Behavior & Chat Code of Conduct</h2>
                <p>
                  Students must maintain a respectful environment. Global Chat submissions are filtered for profanity and restricted terms. Any attempts to bypass content restrictions, spam other learners, upload harmful code, or disrupt leaderboards will lead to immediate account suspension or a permanent ban.
                </p>
              </section>

              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">3. StudyOS Pro Subscriptions</h2>
                <p>
                  Premium features, unlimited test formats, and advanced analytics are offered under our paid Pro Tier. Subscriptions are billed on a recurring billing cycle. You can cancel your subscription at any time; however, partial months of subscription service are non-refundable.
                </p>
              </section>

              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">4. Educational Disclaimer</h2>
                <p>
                  StudyOS is an auxiliary training tool built for JSS3 BECE preparation. While our past question databases and AI systems aim for academic precision, we do not guarantee specific scores, test results, or official examination outcomes.
                </p>
              </section>

              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">5. Customer Support & Disputes</h2>
                <p>
                  For billing concerns, subscription support, or platform disputes, please reach out to our administration team directly at <strong>support.studyos@gmail.com</strong> or phone <strong>08052495541</strong>.
                </p>
              </section>
            </>
          )}

          {type === "cookies" && (
            <>
              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">1. Introduction to Cookies</h2>
                <p>
                  StudyOS uses cookies and local browser storage to provide a stable, responsive, and secure user experience. This policy explains what cookies are and why we utilize them.
                </p>
              </section>
              
              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">2. Categories of Cookies We Use</h2>
                <p>
                  - <strong>Essential Session Cookies:</strong> Crucial to identify your active session, keep you logged into your dashboard, and preserve stats security.<br />
                  - <strong>Performance & Analytics:</strong> Measure screen transitions and load times to maintain fast Next.js page speeds.<br />
                  - <strong>Preference Cookies:</strong> Store local preferences such as subject selections, recent quiz states, and chat settings.
                </p>
              </section>

              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">3. Managing Your Preferences</h2>
                <p>
                  Most browsers allow you to block cookies via system options. Please note that disabling essential cookies will prevent you from signing in or saving quiz progress on our platform.
                </p>
              </section>

              <section>
                <h2 className="text-foreground text-base font-semibold mb-3 tracking-wide">4. Questions & Feedback</h2>
                <p>
                  If you require assistance or have inquiries regarding our cookie use, please contact us at <strong>support.studyos@gmail.com</strong> or call us at <strong>08052495541</strong>.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
