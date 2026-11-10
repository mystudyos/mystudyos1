import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getMessaging, type Messaging } from "firebase-admin/messaging"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import fs from "fs"
import path from "path"

let adminApp: App | null = null

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
      const serviceAccountFile = files.find(f => f.includes("firebase-adminsdk") && f.endsWith(".json"))
      if (serviceAccountFile) {
        const fullPath = path.join(jsonDir, serviceAccountFile)
        const fileData = JSON.parse(fs.readFileSync(fullPath, "utf8"))
        adminApp = initializeApp({
          credential: cert(fileData),
          projectId: fileData.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
        console.log(`[Firebase Admin] Successfully initialized using local service account file: ${serviceAccountFile}`)
        return adminApp
      }
    }
  } catch (err) {
    console.warn("[Firebase Admin] Could not load from local Json directory:", err)
  }

  // 1. Try full JSON service account string from environment
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson)
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
      return adminApp
    } catch (e) {
      console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e)
    }
  }

  // 2. Try individual credential environment variables
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

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
      console.error("[Firebase Admin] Failed to initialize with environment credentials:", e)
    }
  }

  // 3. Try default initialization
  try {
    adminApp = initializeApp({
      projectId: projectId || "studyos-a4977",
    })
    return adminApp
  } catch (err) {
    console.warn(
      "[Firebase Admin] Initialized without credentials. To dispatch FCM notifications, configure FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in your .env file."
    )
    return null
  }
}

export function getAdminMessaging(): Messaging | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  try {
    return getMessaging(app)
  } catch (err) {
    console.error("[Firebase Admin] Error getting Messaging instance:", err)
    return null
  }
}

export function getAdminFirestore(): Firestore | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  try {
    return getFirestore(app)
  } catch (err) {
    console.error("[Firebase Admin] Error getting Firestore instance:", err)
    return null
  }
}
