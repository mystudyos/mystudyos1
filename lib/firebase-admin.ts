import { initializeApp, getApps, cert, type App, type ServiceAccount } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getMessaging, type Messaging } from "firebase-admin/messaging"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import fs from "fs"
import path from "path"

let adminApp: App | null = null

function normalizePrivateKey(privateKey?: string): string | undefined {
  if (!privateKey) return undefined
  return privateKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n")
}

function parseServiceAccountEnv(raw: string): ServiceAccount & { project_id?: string } {
  let cleaned = raw.trim()
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }

  const parsed = JSON.parse(cleaned) as ServiceAccount & {
    project_id?: string
    private_key?: string
  }
  if (typeof parsed.private_key === "string") {
    parsed.private_key = normalizePrivateKey(parsed.private_key)
  }
  return parsed
}

export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp
  const apps = getApps()
  if (apps.length > 0 && apps[0]) {
    adminApp = apps[0]
    return adminApp
  }

  // 0. Check for local service account JSON file in project
  try {
    const jsonDir = path.join(process.cwd(), "Json")
    if (fs.existsSync(jsonDir)) {
      const files = fs.readdirSync(jsonDir)
      const serviceAccountFile = files.find(
        (f) => f.includes("firebase-adminsdk") && f.endsWith(".json")
      )
      if (serviceAccountFile) {
        const fullPath = path.join(jsonDir, serviceAccountFile)
        const fileData = JSON.parse(fs.readFileSync(fullPath, "utf8"))
        if (typeof fileData.private_key === "string") {
          fileData.private_key = normalizePrivateKey(fileData.private_key)
        }
        adminApp = initializeApp({
          credential: cert(fileData),
          projectId: fileData.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
        console.log(
          `Successfully initialized using local service account file: ${serviceAccountFile}`
        )
        return adminApp
      }
    }
  } catch (err) {
    console.warn("Could not load from local Json directory:", err)
  }

  // 1. Try full JSON service account string from environment
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountJson) {
    try {
      const parsed = parseServiceAccountEnv(serviceAccountJson)
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
      return adminApp
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e)
    }
  }

  // 2. Try individual credential environment variables
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (clientEmail && privateKey && projectId) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      })
      return adminApp
    } catch (e) {
      console.error("Failed to initialize with environment credentials:", e)
    }
  }

  // 3. Only use default credentials when explicitly provided (avoid caching an unauthenticated app)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      adminApp = initializeApp({
        projectId: projectId || "studyos-a4977",
      })
      return adminApp
    } catch (err) {
      console.error("Failed default initialization:", err)
    }
  }

  console.warn(
    "Not initialized with service account credentials."
  )
  return null
}

export function getAdminMessaging(): Messaging | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  try {
    return getMessaging(app)
  } catch (err) {
    console.error("Error getting Messaging instance:", err)
    return null
  }
}

export function getAdminFirestore(): Firestore | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  try {
    return getFirestore(app)
  } catch (err) {
    console.error("Error getting Firestore instance:", err)
    return null
  }
}

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  try {
    return getAuth(app)
  } catch (err) {
    console.error("Error getting Auth instance:", err)
    return null
  }
}
