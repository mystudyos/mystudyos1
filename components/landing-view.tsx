"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  GraduationCap,
  Target,
  ArrowRight,
  Menu,
  X,
} from "lucide-react"

interface LandingViewProps {
  onContinueToAuth: (mode?: "signin" | "signup") => void
  onContinueToDashboard?: () => void
  firstName?: string | null
  isAuthenticated?: boolean
}

const CAPSULE_STUDENTS = {
  col1Top: {
    src: "/landing/student-blue.png",
    alt: "Junior secondary student smiling with notebooks",
    bg: "#1849c6",
  },
  col1Bottom: {
    src: "/landing/student-coral.png",
    alt: "Junior secondary student holding textbooks",
    bg: "#ea4c56",
  },
  col2Top: {
    src: "/landing/student-purple.png",
    alt: "Junior secondary student ready for class",
    bg: "#9f92c7",
  },
  col2Bottom: {
    src: "/landing/student-yellow.png",
    alt: "Junior secondary student with study notes",
    bg: "#efc026",
  },
  col3Center: {
    src: "/landing/student-green.png",
    alt: "Junior secondary student smiling",
    bg: "#53b852",
  },
}

const EXAM_BOARDS = [
  {
    name: "WAEC",
    subtitle: "WASSCE (Senior Secondary)",
    logo: "/exams/waec.png",
  },
  {
    name: "NECO",
    subtitle: "SSCE & National Exams",
    logo: "/exams/neco.png",
  },
  {
    name: "JAMB",
    subtitle: "UTME Tertiary Entrance",
    logo: "/exams/jamb.jpeg",
  },
  {
    name: "BECE",
    subtitle: "Junior Secondary",
    logo: "/exams/bece.png",
  },
  {
    name: "Post-UTME",
    subtitle: "University Screening",
    logo: "/exams/post-utme.png",
  },
  {
    name: "NABTEB",
    subtitle: "Technical & Business",
    logo: "/exams/nabteb.png",
  },
]

export function LandingView({
  onContinueToAuth,
  onContinueToDashboard,
  firstName,
  isAuthenticated = false,
}: LandingViewProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const mainCtaLabel = isAuthenticated
    ? `Continue as ${firstName}`
    : "Continue"

  const handleMainCta = () => {
    setMobileMenuOpen(false)
    if (isAuthenticated && onContinueToDashboard) {
      onContinueToDashboard()
    } else {
      onContinueToAuth("signin")
    }
  }

  const scrollToTop = () => {
    setMobileMenuOpen(false)
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-dvh w-full bg-white text-slate-900 overflow-y-auto overflow-x-hidden scroll-smooth select-none"
    >
      {/* Fixed Floating Responsive Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 px-4 sm:px-8 lg:px-14 pt-3 sm:pt-4 pointer-events-none"
      >
        <div className="max-w-7xl mx-auto pointer-events-auto rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Brand: Logo + StudyOS */}
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-2.5 text-left group"
            >
              <Image
                src="/icon-192-removebg-preview.png"
                alt="StudyOS logo"
                width={34}
                height={34}
                priority
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain"
              />
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Study<span className="text-primary">OS</span>
              </span>
            </button>

            {/* Center Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-12 text-sm font-normal text-slate-600">
              <button
                type="button"
                onClick={() => scrollToSection("about")}
                className="hover:text-primary transition-colors"
              >
                About
              </button>
            </nav>

            {/* Right Navbar CTA Buttons (Desktop) */}
            <div className="hidden md:flex items-center gap-2.5 sm:gap-3">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleMainCta}
                  className="px-6 py-2 rounded-full rounded-br-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
                >
                  {mainCtaLabel}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onContinueToAuth("signin")}
                    className="px-5 py-2 rounded-full rounded-bl-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => onContinueToAuth("signup")}
                    className="px-6 py-2 rounded-full rounded-br-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
                  >
                    Register
                  </button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Mobile Dropdown Menu with Smooth Framer Motion */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="md:hidden overflow-hidden"
              >
                <div className="pt-4 pb-2 mt-3 border-t border-slate-200/80 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection("about")}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-normal text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    About
                  </button>

                  {isAuthenticated ? (
                    <div className="pt-2 mt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleMainCta}
                        className="w-full py-2.5 rounded-full rounded-br-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-normal transition-colors text-center"
                      >
                        {mainCtaLabel}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 pt-2 mt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          onContinueToAuth("signin")
                        }}
                        className="w-full py-2.5 rounded-full rounded-bl-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-normal transition-colors text-center"
                      >
                        Log in
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          onContinueToAuth("signup")
                        }}
                        className="w-full py-2.5 rounded-full rounded-br-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-normal transition-colors text-center"
                      >
                        Register
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Main Dribbble Hero Canvas */}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 pt-28 sm:pt-32 pb-14 lg:pb-20">

        {/* Main Hero Grid */}
        <div className="mt-2 lg:mt-4 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Headline, Story, CTAs, Categories */}
          <div className="lg:col-span-6 flex flex-col items-start text-left z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.12] tracking-tight text-primary"
            >
              Your Modern
              <br />
              Study Hub
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-5 sm:mt-6 text-sm sm:text-base text-black font-normal leading-relaxed max-w-md"
            >
              [ StudyOS ] is an interactive exam preparation and learning hub built for Secondary students to master Exam past questions, build daily study streaks, and excel across every subject.
            </motion.p>

            {/* Primary CTA Row (Dribbble Start Today) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-7 sm:mt-8 flex flex-wrap items-center gap-4"
            >
              <button
                type="button"
                onClick={handleMainCta}
                className="px-7 py-2.5 rounded-full rounded-bl-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
              >
                Start Today
              </button>
            </motion.div>

            {/* Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-10 sm:mt-14 lg:mt-16 w-full"
            >
              <h2 className="text-lg sm:text-xl font-normal text-slate-900 mb-4 sm:mb-5">
                Categories
              </h2>
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs sm:text-sm font-normal text-slate-600">
                <p
                  className="hover:text-primary transition-colors text-sm"
                >
                  JSS1-3 (BECE Prep) 
                </p>
                                <p
                  className="hover:text-primary transition-colors text-sm"
                >
                  SSS1-3 (UTME, WAEC, NECO and Post-UTME) 
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Staggered 5-Capsule Vertical Collage (Junior Secondary Faces) */}
          <div className="lg:col-span-6 flex items-center justify-center lg:justify-end">
            <div className="grid grid-cols-3 gap-3 sm:gap-5 items-center max-w-md sm:max-w-lg w-full">
              {/* Capsule Column 1 (Blue Top + Coral Bottom) */}
              <div className="flex flex-col gap-3.5 sm:gap-6 mt-6 sm:mt-12">
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.15 }}
                  style={{ backgroundColor: CAPSULE_STUDENTS.col1Top.bg }}
                  className="relative w-full aspect-[1/2.05] rounded-full overflow-hidden"
                >
                  <Image
                    src={CAPSULE_STUDENTS.col1Top.src}
                    alt={CAPSULE_STUDENTS.col1Top.alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 30vw, 180px"
                    className="object-cover object-top"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.25 }}
                  style={{ backgroundColor: CAPSULE_STUDENTS.col1Bottom.bg }}
                  className="relative w-full aspect-[1/1.85] rounded-full overflow-hidden"
                >
                  <Image
                    src={CAPSULE_STUDENTS.col1Bottom.src}
                    alt={CAPSULE_STUDENTS.col1Bottom.alt}
                    fill
                    sizes="(max-width: 768px) 30vw, 180px"
                    className="object-cover object-top"
                  />
                </motion.div>
              </div>

              {/* Capsule Column 2 (Purple Top — Elevated + Yellow Bottom) */}
              <div className="flex flex-col gap-3.5 sm:gap-6 -mt-4 sm:-mt-10">
                <motion.div
                  initial={{ opacity: 0, y: -24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2 }}
                  style={{ backgroundColor: CAPSULE_STUDENTS.col2Top.bg }}
                  className="relative w-full aspect-[1/2.05] rounded-full overflow-hidden"
                >
                  <Image
                    src={CAPSULE_STUDENTS.col2Top.src}
                    alt={CAPSULE_STUDENTS.col2Top.alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 30vw, 180px"
                    className="object-cover object-top"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.3 }}
                  style={{ backgroundColor: CAPSULE_STUDENTS.col2Bottom.bg }}
                  className="relative w-full aspect-[1/1.95] rounded-full overflow-hidden"
                >
                  <Image
                    src={CAPSULE_STUDENTS.col2Bottom.src}
                    alt={CAPSULE_STUDENTS.col2Bottom.alt}
                    fill
                    sizes="(max-width: 768px) 30vw, 180px"
                    className="object-cover object-top"
                  />
                </motion.div>
              </div>

              {/* Capsule Column 3 (Green Middle-Right) */}
              <div className="flex flex-col justify-center mt-4 sm:mt-10">
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, delay: 0.35 }}
                  style={{ backgroundColor: CAPSULE_STUDENTS.col3Center.bg }}
                  className="relative w-full aspect-[1/2.05] rounded-full overflow-hidden"
                >
                  <Image
                    src={CAPSULE_STUDENTS.col3Center.src}
                    alt={CAPSULE_STUDENTS.col3Center.alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 30vw, 180px"
                    className="object-cover object-top"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 lg:mt-14 flex flex-col items-center justify-center text-center"
        >
          <button
            type="button"
            onClick={handleMainCta}
            className="inline-flex items-center justify-center gap-2.5 px-9 py-3.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base font-normal transition-colors"
          >
            <span>{mainCtaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-2.5 text-xs text-slate-500 font-normal">
            New or Returning? Tap Continue
          </p>
        </motion.div>
      </div>

      {/* Investor & Student Overview Sections: What StudyOS Is About, Who We Built It For, Benefits */}
      <div className="border-t border-slate-200/80 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-14 sm:py-16 lg:py-20 space-y-12 sm:space-y-16">
          {/* Section 1: About StudyOS, Who We Built It For, Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              id="about"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="scroll-mt-28 rounded-2xl bg-white border border-slate-200/80 p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">What&apos;s StudyOS About?</h3>
              <p className="text-sm text-black font-normal leading-relaxed">
                StudyOS is a dedicated digital exam preparation platform aggregating thousands of verified past questions across BECE, WAEC (WASSCE), NECO, JAMB (UTME), and Post-UTME for all secondary school subjects with step-by-step explanations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="scroll-mt-28 rounded-2xl bg-white border border-slate-200/80 p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Who We Built It For?</h3>
              <p className="text-sm text-black font-normal leading-relaxed">
                Purpose-built for Secondary School students (JSS 1–3 &amp; SSS 1–3 / Year 7–12) and partner schools preparing candidates for top performance across Junior and Senior national examinations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="scroll-mt-28 rounded-2xl bg-white border border-slate-200/80 p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Benefits for Students?</h3>
              <p className="text-sm text-black font-normal leading-relaxed">
                Students practice under real timed exam simulation conditions, build protected daily exam streaks, track subject mastery, compete on the National Ranking Leaderboard, and study together in peer rooms.
              </p>
            </motion.div>
          </div>

          {/* Section 2: Official Examination Boards Auto-Scrolling Marquee */}
          <div className="pt-2">
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
                Supported Examination Bodies
              </p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Built for Major Nigerian &amp; West African Exams
              </h3>
            </div>

            <div className="relative w-full overflow-hidden py-2">
              {/* Left & Right Soft Gradient Edge Fades */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 sm:w-20 bg-linear-to-r from-slate-50/95 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 sm:w-20 bg-linear-to-l from-slate-50/95 to-transparent" />

              <motion.div
                className="flex items-center gap-4 sm:gap-6 w-max"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  repeat: Infinity,
                  ease: "linear",
                  duration: 26,
                }}
              >
                {[...EXAM_BOARDS, ...EXAM_BOARDS].map((board, idx) => (
                  <div
                    key={`${board.name}-${idx}`}
                    className="shrink-0 w-56 sm:w-64 h-20 sm:h-22 rounded-2xl bg-white border border-slate-200/80 px-4 py-3 flex items-center gap-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                  >
                    <div className="shrink-0 w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center overflow-hidden">
                      <img
                        src={board.logo}
                        alt={`${board.name} official logo`}
                        className="w-full h-full object-contain shrink-0"
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                        {board.name}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                        {board.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Bottom Footer */}
      <footer className="border-t border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
            {/* Left: StudyOS Logo + All Rights Reserved */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2">
                <Image
                  src="/icon-192-removebg-preview.png"
                  alt="StudyOS logo"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-lg object-contain"
                />
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  Study<span className="text-primary">OS</span>
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300">•</span>
              <p className="w-full sm:w-auto text-xs sm:text-sm text-black font-normal">
                &copy; {new Date().getFullYear()} StudyOS. All rights reserved.
              </p>
            </div>

            {/* Center: Official Social Links (TikTok, Facebook, Instagram) */}
            <div className="flex items-center gap-2.5">
              <a
                href="https://www.tiktok.com/@study_os1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StudyOS on TikTok (@study_os1)"
                title="TikTok (@study_os1)"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61596317073790"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StudyOS on Facebook"
                title="Facebook"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/study_os1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StudyOS on Instagram (@study_os1)"
                title="Instagram (@study_os1)"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-[#E1306C] hover:text-white hover:border-[#E1306C] transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>

            {/* Right: Backed / Verified by Google Cloud with Official 4-Color SVG Logo */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">
                Verified by
              </span>
              <span className="inline-flex items-center gap-1.5">
                {/* Official Google Cloud 4-Color Mark SVG */}
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Google Cloud logo"
                >
                  <path
                    d="M15.22 8.78L17.9 6.1l.18-.93A8.996 8.996 0 0 0 3.55 9.65c.26-.11.79-.16 1.07-.05l3.77-.62s.2-.33.3-.31a5.22 5.22 0 0 1 6.53.11z"
                    fill="#EA4335"
                  />
                  <path
                    d="M20.45 9.65a9.03 9.03 0 0 0-2.72-4.48l-2.65 2.65a5.25 5.25 0 0 1 1.92 4.16v.52a2.63 2.63 0 0 1 0 5.25H12v3.75h5a6.38 6.38 0 0 0 3.45-11.85z"
                    fill="#4285F4"
                  />
                  <path
                    d="M7 21.5h5v-3.75H7a2.62 2.62 0 0 1-1.08-.23l-.75.23-2.13 2.13-.18.72A6.34 6.34 0 0 0 7 21.5z"
                    fill="#34A853"
                  />
                  <path
                    d="M7 8.75a6.38 6.38 0 0 0-4.14 11.23l3.06-3.06a2.63 2.63 0 0 1 1.08-4.42v-3.75z"
                    fill="#FBBC05"
                  />
                </svg>
                <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-700">
                  Google Cloud
                </span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}