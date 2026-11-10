export const DEFAULT_SCHOOLS = [
  "Christy Caleb College (CCIS)",
  "Loreto High School Chorlton (LHSC)",
  "Nigerian Ghanian School (NGS)",
] as const

/** @deprecated Use fetchApprovedSchools() from lib/schools.ts instead */
export const COLLABORATED_SCHOOLS = DEFAULT_SCHOOLS

export type CollaboratedSchool = typeof DEFAULT_SCHOOLS[number]

export const ADMIN_EMAIL = "precykelly345@gmail.com"

export const COLLAB_MESSAGE_TEMPLATE = `Subject: School Collaboration Request for StudyOS

Dear Admin,

I would like to request a collaboration for my school to join the StudyOS platform.

School Name: [Enter School Name Here]
Location: [Enter School Location]
Contact Person: [Your Name]
Contact Number: [Your Phone Number]

Thank you.`

export const BAN_MESSAGE_TEMPLATE = `Subject: Important Account Action: StudyOS Access Suspended

Dear [Student Name],

We are writing to inform you that your access to the StudyOS platform has been suspended following a review of your account details.

Reason for Suspension: Inaccurate School Affiliation
Consequence: Permanent suspension of the current account.

Rationale:
At StudyOS, we maintain strict partnerships with collaborated schools to ensure the integrity of our platform. Providing false information regarding your school affiliation violates our Terms of Service.

How to Resolve:
If you belong to a collaborated school, you may re-register with your genuine school details. If your school is not yet a partner, please ask your principal to contact us for a collaboration request using the "My school is not listed" option on the registration page.

This action was taken after careful consideration to maintain a fair environment for all students.

Best regards,
StudyOS Administration`

// --- Admin Mail Templates ---

export const UNCONFIRMED_SCHOOL_TEMPLATE = (studentName: string, studentEmail: string) => ({
  subject: "Action Required: Update Your School Information — StudyOS",
  body: `Hi ${studentName},

We noticed that your account was registered without valid school information. For security, verification, and platform integrity reasons, all users are required to provide accurate school details during registration.

Please update your school information within the next 7 days to avoid account restrictions or permanent suspension for anonymous registration activity.

Account Email: ${studentEmail}

Failure to complete this update within the given timeframe may result in your account being banned from the platform.

Thank you for your cooperation.

Admin Team
StudyOS.`
})

export const WELCOME_MESSAGE_TEMPLATE = (studentName: string) => ({
  subject: "Welcome to StudyOS — Let's Get Started! 🎓",
  body: `Hi ${studentName},

Welcome to StudyOS! We're thrilled to have you on board.

Your account has been successfully registered, and you're now part of a growing community of students preparing smarter for their exams.

Here's what you can do right away:
• Start practicing with curated BECE past questions
• Track your progress on the leaderboard
• Compete with other students and climb the ranks
• Chat with other students and study together

We built StudyOS to help you study better, stay motivated, and achieve your academic goals. If you ever need help or have questions, don't hesitate to reach out.

Best of luck on your learning journey!

Warm regards,
Admin Team
StudyOS.`
})

export const CELEBRATION_MESSAGE_TEMPLATE = (studentName: string) => ({
  subject: "🏆 Congratulations! You're Dominating the Leaderboard — StudyOS",
  body: `Hi ${studentName},

This is a special message from the StudyOS Admin Team to congratulate you!

You've been consistently performing at the top of the leaderboard, and we want to celebrate your incredible progress. Your dedication, hard work, and consistency have not gone unnoticed.

Keep pushing — you're inspiring other students on the platform to do their best too.

Stay focused, stay hungry, and keep climbing!

With pride,
Admin Team
StudyOS.`
})

export type MessageType = "unconfirmed_school" | "welcome" | "celebration"

export const MESSAGE_OPTIONS: {
  type: MessageType
  label: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}[] = [
  {
    type: "unconfirmed_school",
    label: "Unconfirmed School",
    description: "Warn about missing school info",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    type: "welcome",
    label: "Welcome Mail",
    description: "Send a warm welcome message",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  {
    type: "celebration",
    label: "Leaderboard 🏆",
    description: "Celebrate top performance",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
]
