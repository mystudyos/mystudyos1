import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import { DEFAULT_SCHOOLS } from "./constants"

// ─── Firestore document shape: schools/{slug} ───
export interface SchoolDoc {
  name: string
  slug: string
  approved: boolean
  submittedBy: string | null
  createdAt: unknown // serverTimestamp
}

/**
 * Generate a URL-safe slug from a school name.
 */
function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
}

/**
 * Seed the default schools into Firestore if the collection is empty.
 * Called automatically by fetchApprovedSchools() on first load.
 */
async function seedDefaultSchools(): Promise<void> {
  const col = collection(db, "schools")
  const snap = await getDocs(query(col))

  // Only seed if the collection is completely empty
  if (snap.size > 0) return

  const promises = DEFAULT_SCHOOLS.map((name) => {
    const slug = toSlug(name)
    return setDoc(doc(db, "schools", slug), {
      name,
      slug,
      approved: true,
      submittedBy: null,
      createdAt: serverTimestamp(),
    })
  })

  await Promise.all(promises)
}

/**
 * Fetch all approved school names from Firestore.
 * Seeds the default schools on first call if the collection is empty.
 */
export async function fetchApprovedSchools(): Promise<string[]> {
  const col = collection(db, "schools")

  // First attempt
  let q = query(col, where("approved", "==", true))
  let snap = await getDocs(q)

  // If empty, try seeding defaults and re-fetch
  if (snap.size === 0) {
    try {
      await seedDefaultSchools()
      snap = await getDocs(q)
    } catch (err) {
      console.warn("Failed to seed default schools:", err)
      // Fallback to hardcoded defaults sorted A-Z if seeding fails
      return [...DEFAULT_SCHOOLS].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      )
    }
  }

  const names = snap.docs.map((d) => d.data().name as string)
  names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  return names
}

/**
 * Submit a new school for admin review.
 * Creates a doc with approved=false. No-ops if the slug already exists.
 */
export async function submitSchool(
  name: string,
  uid?: string
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return

  const slug = toSlug(trimmed)
  const ref = doc(db, "schools", slug)
  const snap = await getDoc(ref)

  // Already exists (approved or pending) — skip
  if (snap.exists()) return

  await setDoc(ref, {
    name: trimmed,
    slug,
    approved: false,
    submittedBy: uid || null,
    createdAt: serverTimestamp(),
  })
}

// ─── Admin-only functions ───

/**
 * Fetch all schools pending admin approval.
 */
export async function fetchPendingSchools(): Promise<SchoolDoc[]> {
  const col = collection(db, "schools")
  const q = query(col, where("approved", "==", false))
  const snap = await getDocs(q)
  const schools = snap.docs.map((d) => d.data() as SchoolDoc)

  schools.sort((a, b) => {
    const timeA = a.createdAt && typeof (a.createdAt as any).toMillis === "function"
      ? (a.createdAt as any).toMillis()
      : 0
    const timeB = b.createdAt && typeof (b.createdAt as any).toMillis === "function"
      ? (b.createdAt as any).toMillis()
      : 0
    return timeB - timeA
  })

  return schools
}

/**
 * Approve a pending school (set approved=true).
 */
export async function approveSchool(slug: string): Promise<void> {
  const ref = doc(db, "schools", slug)
  await updateDoc(ref, { approved: true })
}

/**
 * Reject (delete) a pending school submission.
 */
export async function rejectSchool(slug: string): Promise<void> {
  const ref = doc(db, "schools", slug)
  await deleteDoc(ref)
}
