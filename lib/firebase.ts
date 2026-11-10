import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics, isSupported } from "firebase/analytics"

function resolveAuthDomain(): string | undefined {
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "studyos1.online" || host === "www.studyos1.online") {
      return host
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "studyos-a4977.firebaseapp.com"
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studyos1.online"
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleAuthProvider = new GoogleAuthProvider()

export async function initAnalytics() {
  if (typeof window === "undefined") return null
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return null
  if (!(await isSupported())) return null
  return getAnalytics(app)
}
