export interface SurveyQuestion {
  id: string
  text: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Survey {
  id: string
  title: string
  description: string
  questions: SurveyQuestion[]
}

export const SURVEYS: Survey[] = [
 {
    id: "studyos-history",
    title: "StudyOS Origins & Tech Trivia",
    description: "How well do you know the StudyOS platform, its pillars, and its technical details?",
    questions: [
      {
        id: "so-q1",
        text: "Who is the official sponsor of StudyOS, as shown at the bottom of the Profile page?",
        options: ["Oliver", "Kelvin", "Vercel", "Google DeepMind"],
        correctIndex: 0,
        explanation: "StudyOS is sponsored by Oliver to support JSS3 students preparing for their BECE exams."
      },
      {
        id: "so-q2",
        text: "Which two primary practice modes are offered by StudyOS?",
        options: ["Easy & Hard Mode", "Training & Exam Practice", "Syllabus & Quick Test", "Solo & Competitive"],
        correctIndex: 1,
        explanation: "Training Mode offers deep-dives and concept mastery, while Exam Practice (Solid Q) is a timed mock exam."
      },
      {
        id: "so-q3",
        text: "What major Nigerian national examination is StudyOS specifically designed to prepare students for?",
        options: ["WAEC", "NECO", "BECE", "JAMB"],
        correctIndex: 2,
        explanation: "StudyOS is custom-built to help Year 7-9 students ace the Basic Education Certificate Examination (BECE)."
      },
      {
        id: "so-q4",
        text: "StudyOS can be installed on your home screen for instant access. What does 'PWA' stand for?",
        options: ["Personal Web Assistant", "Progressive Web Application", "Private Web Access", "Primary Writing Application"],
        correctIndex: 1,
        explanation: "Progressive Web Apps (PWA) allow web applications to feel and behave like native mobile apps."
      },
      {
        id: "so-q5",
        text: "What algorithm does StudyOS use behind the scenes to shuffle quiz options and eliminate selection bias?",
        options: ["Fisher-Yates Shuffling", "Bubble Shuffling", "Dijkstra Shuffling", "Binary Randomizer"],
        correctIndex: 0,
        explanation: "StudyOS uses the Fisher-Yates Shuffling algorithm to randomize questions and options fairly."
      },
      {
        id: "so-q6",
        text: "What database platform is used by StudyOS to save and retrieve your quiz results and leaderboard statistics?",
        options: ["MongoDB", "PostgreSQL", "Firebase", "MySQL"],
        correctIndex: 2,
        explanation: "StudyOS uses Firebase Firestore for fast, real-time database storage to sync scores and school statistics."
      }
    ]
  },
  {
  "id": "nigerian-education-trivia",
  "title": "Nigerian Education & History Facts",
  "description": "An interesting mini-game about school milestones and historical facts in Nigeria.",
  "questions": [
    {
      "id": "ne-q1",
      "text": "What does 'JSS' stand for in the Nigerian educational curriculum?",
      "options": [
        "Junior Secondary School",
        "Joint Students Syndicate",
        "Junior Science Syllabus",
        "Job Skills Studies"
      ],
      "correctIndex": 0,
      "explanation": "JSS stands for Junior Secondary School — the first three years of secondary education in Nigeria, covering JSS1 to JSS3."
    },
    {
      "id": "ne-q2",
      "text": "Which examination do JSS3 students sit at the end of their junior secondary education?",
      "options": [
        "WAEC",
        "JAMB",
        "BECE",
        "NECO SSCE"
      ],
      "correctIndex": 2,
      "explanation": "BECE (Basic Education Certificate Examination) is the principal exit exam for JSS3 students before they proceed to Senior Secondary School."
    },
    {
      "id": "ne-q3",
      "text": "Which federal agency is responsible for overseeing and funding basic education across Nigeria?",
      "options": [
        "JAMB",
        "WAEC",
        "UBEC",
        "NUC"
      ],
      "correctIndex": 2,
      "explanation": "UBEC (Universal Basic Education Commission) coordinates and funds primary and junior secondary education programs across all 36 states and the FCT."
    },
    {
      "id": "ne-q4",
      "text": "Which examination board conducts the National Common Entrance Examination for Federal Unity Schools?",
      "options": [
        "WAEC",
        "NECO",
        "NABTEB",
        "JAMB"
      ],
      "correctIndex": 1,
      "explanation": "NECO (National Examinations Council) conducts the National Common Entrance Examination (NCEE) for entry into Federal Government Colleges."
    },
    {
      "id": "ne-q5",
      "text": "In what year did Nigeria gain independence from British colonial rule?",
      "options": [
        "1955",
        "1960",
        "1963",
        "1967"
      ],
      "correctIndex": 1,
      "explanation": "Nigeria gained independence on October 1, 1960. The date is celebrated annually as Nigeria's Independence Day."
    },
    {
      "id": "ne-q6",
      "text": "What is the standard structure of Nigeria's formal education system known as?",
      "options": [
        "6-3-4-2",
        "6-5-3",
        "6-3-3-4",
        "5-4-3-4"
      ],
      "correctIndex": 2,
      "explanation": "Nigeria uses the 6-3-3-4 system: 6 years of primary, 3 years of junior secondary, 3 years of senior secondary, and 4 years of university education."
    },
    {
      "id": "ne-q7",
      "text": "Which Nigerian university is the oldest, established in 1948?",
      "options": [
        "University of Lagos",
        "Ahmadu Bello University",
        "University of Ibadan",
        "Obafemi Awolowo University"
      ],
      "correctIndex": 2,
      "explanation": "The University of Ibadan, founded in 1948 as a college of the University of London, is Nigeria's oldest and most prestigious university."
    },
    {
      "id": "ne-q8",
      "text": "What does 'WAEC' stand for in the Nigerian school system?",
      "options": [
        "West African Education Council",
        "West African Examinations Council",
        "West Africa Exam Committee",
        "Western Academic Evaluation Centre"
      ],
      "correctIndex": 1,
      "explanation": "WAEC stands for West African Examinations Council. It conducts the WASSCE, which is the main certificate exam for SSS3 students in Nigeria and other West African countries."
    },
    {
      "id": "ne-q9",
      "text": "Which city serves as the administrative capital of Nigeria?",
      "options": [
        "Lagos",
        "Kano",
        "Abuja",
        "Ibadan"
      ],
      "correctIndex": 2,
      "explanation": "Abuja became Nigeria's federal capital in 1991, replacing Lagos. It was purpose-built as a neutral, central location accessible to all regions."
    },
    {
      "id": "ne-q10",
      "text": "The UBE Act of 2004 made how many years of education free and compulsory in Nigeria?",
      "options": [
        "6 years",
        "9 years",
        "12 years",
        "3 years"
      ],
      "correctIndex": 1,
      "explanation": "The Universal Basic Education (UBE) Act of 2004 made 9 years of education (primary school + JSS) free and compulsory for every Nigerian child."
    },
    {
      "id": "ne-q11",
      "text": "Who was Nigeria's first indigenous Governor-General and later first President?",
      "options": [
        "Obafemi Awolowo",
        "Tafawa Balewa",
        "Nnamdi Azikiwe",
        "Ahmadu Bello"
      ],
      "correctIndex": 2,
      "explanation": "Dr. Nnamdi Azikiwe became Nigeria's first indigenous Governor-General in 1960 and the first President of the Federal Republic in 1963."
    },
    {
      "id": "ne-q12",
      "text": "Which subject is compulsory in all Nigerian JSS schools under the national curriculum?",
      "options": [
        "French",
        "Agricultural Science",
        "Basic Technology",
        "English Language"
      ],
      "correctIndex": 3,
      "explanation": "English Language is compulsory across all Nigerian schools, including JSS level. It is also a required subject in BECE and WASSCE examinations."
    },
    {
      "id": "ne-q13",
      "text": "What is the name of Nigeria's national anthem's opening line?",
      "options": [
        "Nigeria, we hail thee",
        "Arise O compatriots",
        "One nation bound in freedom",
        "Land of the brave and free"
      ],
      "correctIndex": 0,
      "explanation": "'Nigeria, we hail thee' opens Nigeria's opening national anthem, which was first adopted in 1960 and officially reinstated in 2024."
    },
    {
      "id": "ne-q14",
      "text": "Which geopolitical zone in Nigeria has the highest number of states?",
      "options": [
        "South-West",
        "North-West",
        "North-Central",
        "South-East"
      ],
      "correctIndex": 1,
      "explanation": "The North-West zone has 7 states: Kano, Kaduna, Katsina, Kebbi, Sokoto, Zamfara, and Jigawa — the highest of any geopolitical zone in Nigeria."
    },
    {
      "id": "ne-q15",
      "text": "What is the full meaning of JAMB, the body that conducts university entrance exams in Nigeria?",
      "options": [
        "Joint Admissions and Matriculation Board",
        "Joint Academic and Merit Board",
        "Junior and Mature Academic Board",
        "Joint Assessment and Matriculation Bureau"
      ],
      "correctIndex": 0,
      "explanation": "JAMB (Joint Admissions and Matriculation Board) was established in 1978 and conducts the UTME exam used for admission into Nigerian universities, polytechnics, and colleges of education."
    }
  ]
}
]
