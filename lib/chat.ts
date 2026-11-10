import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  where,
  setDoc,
  deleteField,
  getDocs,
  writeBatch,
  getDoc,
  Timestamp as FirestoreTimestamp,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"

// ─── Message Shape ───
export interface ChatMessage {
  id: string
  uid: string
  displayName: string
  photoURL: string | null
  school: string | null
  text: string
  replyTo?: { id: string; text: string; displayName: string } | null
  createdAt: Timestamp | null
  isEdited?: boolean
  editedAt?: Timestamp | null
}

// ─── Pinned Message Shape ───
export interface PinnedMessage {
  messageId: string
  text: string
  displayName: string
  pinnedAt: Timestamp | null
  pinnedBy: string
}

// ─── Send a message ───
export async function sendMessage(
  uid: string,
  displayName: string,
  photoURL: string | null,
  school: string | null,
  text: string,
  replyTo?: { id: string; text: string; displayName: string } | null
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 500) return

  await addDoc(collection(db, "globalChat"), {
    uid,
    displayName,
    photoURL: photoURL || null,
    school: school || null,
    text: trimmed,
    replyTo: replyTo || null,
    createdAt: serverTimestamp(),
  })

  // Trigger Web Push Notification for room members asynchronously
  fetch("/api/send-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "room",
      senderUid: uid,
      senderName: displayName,
      text: trimmed,
      roomName: "Global Chat",
    }),
  }).catch((err) => console.warn("[Push] Failed to trigger Room notification:", err))
}

// ─── Subscribe to messages (real-time) ───
export function subscribeToMessages(
  callback: (messages: ChatMessage[]) => void,
  messageLimit = 1000
): Unsubscribe {
  const q = query(
    collection(db, "globalChat"),
    orderBy("createdAt", "asc"),
    limit(messageLimit)
  )

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ChatMessage, "id">),
    }))
    callback(messages)
  })
}

// ─── Fetch recent messages (latest N) ───
export async function fetchRecentMessages(limitCount = 80): Promise<ChatMessage[]> {
  const q = query(
    collection(db, "globalChat"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  )

  const snapshot = await getDocs(q)
  const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ChatMessage, "id">),
  }))

  return messages.reverse()
}

// ─── Subscribe to recent messages (real-time, latest limitCount) ───
export function subscribeToRecentMessages(
  limitCount: number,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "globalChat"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  )

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ChatMessage, "id">),
    }))
    callback(messages.reverse())
  })
}

// ─── Edit a message (owner only) ───
export async function editMessage(messageId: string, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 500) return

  const ref = doc(db, "globalChat", messageId)
  await updateDoc(ref, {
    text: trimmed,
    isEdited: true,
    editedAt: serverTimestamp(),
  })

  // Also update in pinned messages if it's pinned!
  try {
    const pinRef = doc(db, "chatState", "pinnedMessages")
    const snap = await getDoc(pinRef)
    if (snap.exists()) {
      const pins: PinnedMessage[] = snap.data().pins || []
      let updated = false
      const nextPins = pins.map((p) => {
        if (p.messageId === messageId) {
          updated = true
          return { ...p, text: trimmed }
        }
        return p
      })
      if (updated) {
        await setDoc(pinRef, { pins: nextPins })
      }
    }
  } catch (e) {
    console.warn("Failed to update edited message in pins:", e)
  }
}

// ─── Subscribe to new messages after a given timestamp ───
export function subscribeToNewMessages(
  callback: (messages: ChatMessage[]) => void,
  since?: Timestamp | null
): Unsubscribe {
  const constraints = since
    ? [where("createdAt", ">", since), orderBy("createdAt", "asc")]
    : [orderBy("createdAt", "asc"), limit(1)]

  const q = query(collection(db, "globalChat"), ...constraints)

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ChatMessage, "id">),
    }))
    callback(messages)
  })
}

// ─── Delete a message (admin or owner) ───
export async function deleteMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(db, "globalChat", messageId))

  // Also clean up from pinned messages!
  try {
    const ref = doc(db, "chatState", "pinnedMessages")
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const pins: PinnedMessage[] = snap.data().pins || []
      if (pins.some((p) => p.messageId === messageId)) {
        const filtered = pins.filter((p) => p.messageId !== messageId)
        await setDoc(ref, { pins: filtered })
      }
    }
  } catch (e) {
    console.warn("Failed to remove deleted message from pins:", e)
  }
}

// ─── Mark chat as read ───
export async function markChatRead(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid)
  await updateDoc(userRef, {
    lastChatReadAt: serverTimestamp(),
  }).catch((err) => {
    console.warn("Failed to mark chat read:", err.message)
  })
}

// ─── Subscribe to unread count (real-time) ───
export function subscribeToUnreadCount(
  userUid: string,
  lastReadAt: Timestamp | null,
  callback: (count: number) => void
): Unsubscribe {
  if (!userUid) {
    callback(0)
    return () => {}
  }
  // If user has never read chat, count ALL messages
  const constraints = lastReadAt
    ? [where("createdAt", ">", lastReadAt), orderBy("createdAt", "asc")]
    : [orderBy("createdAt", "asc")]

  const q = query(collection(db, "globalChat"), ...constraints)

  return onSnapshot(q, (snapshot) => {
    const unread = snapshot.docs.filter((d) => d.data().uid !== userUid)
    callback(unread.length)
  })
}


// ─── Pin a message (admin only) ───
export async function pinMessage(
  messageId: string,
  text: string,
  displayName: string,
  adminUid: string
): Promise<void> {
  const ref = doc(db, "chatState", "pinnedMessages")
  const snap = await getDoc(ref)
  let pins: PinnedMessage[] = []
  if (snap.exists()) {
    pins = snap.data().pins || []
  }

  // Check if already pinned
  if (pins.some((p) => p.messageId === messageId)) {
    return
  }

  if (pins.length >= 3) {
    throw new Error("MAX_PINS_REACHED")
  }

  const newPin: PinnedMessage = {
    messageId,
    text,
    displayName,
    pinnedAt: FirestoreTimestamp.now(),
    pinnedBy: adminUid,
  }

  await setDoc(ref, {
    pins: [...pins, newPin],
  })
}

// ─── Unpin message (admin only) ───
export async function unpinMessage(messageId: string): Promise<void> {
  const ref = doc(db, "chatState", "pinnedMessages")
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const pins: PinnedMessage[] = snap.data().pins || []
  const filtered = pins.filter((p) => p.messageId !== messageId)
  await setDoc(ref, { pins: filtered })
}

// ─── Subscribe to pinned messages ───
export function subscribeToPinnedMessages(
  callback: (pinned: PinnedMessage[]) => void
): Unsubscribe {
  const ref = doc(db, "chatState", "pinnedMessages")
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback([])
      return
    }
    const data = snap.data()
    callback(data.pins || [])
  })
}

// ─── Auto-delete messages older than 7 days ───
export async function cleanupOldMessages(): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 7)
  const cutoff = FirestoreTimestamp.fromDate(cutoffDate)

  const q = query(
    collection(db, "globalChat"),
    where("createdAt", "<", cutoff),
    orderBy("createdAt", "asc"),
    limit(100) // Delete in batches of 100 to stay within Firestore limits
  )

  const snapshot = await getDocs(q)
  if (snapshot.empty) return 0

  const batch = writeBatch(db)
  snapshot.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()

  return snapshot.size
}

// ─── Typing Indicator ───
export async function setTypingStatus(uid: string, displayName: string, isTyping: boolean): Promise<void> {
  const ref = doc(db, "chatState", "typing")
  try {
    if (isTyping) {
      await setDoc(ref, {
        [uid]: {
          displayName,
          timestamp: Date.now()
        }
      }, { merge: true })
    } else {
      await updateDoc(ref, {
        [uid]: deleteField()
      })
    }
  } catch (err: any) {
    if (err.code !== "not-found") console.warn("Failed to set typing status", err)
  }
}

export function subscribeToTyping(callback: (typists: { uid: string, displayName: string }[]) => void): Unsubscribe {
  const ref = doc(db, "chatState", "typing")
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback([])
      return
    }
    const data = snap.data()
    const now = Date.now()
    const active: { uid: string, displayName: string }[] = []
    
    for (const [uid, info] of Object.entries(data)) {
      if (info && (info as any).timestamp && (now - (info as any).timestamp < 5000)) {
        active.push({ uid, displayName: (info as any).displayName })
      }
    }
    callback(active)
  })
}
