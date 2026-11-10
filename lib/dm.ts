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
  getDoc,
  getDocs,
  increment,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { ADMIN_EMAIL } from "./constants"

export interface DirectChat {
  id: string
  users: string[] // [uid1, uid2]
  userNames: Record<string, string> // { [uid]: displayName }
  userPhotos: Record<string, string | null> // { [uid]: photoURL }
  userEmails?: Record<string, string> // { [uid]: email }
  status: "pending" | "accepted" | "rejected"
  blockedBy: string | null // UID of the blocker
  lastMessage: string | null
  lastMessageAt: Timestamp | null
  lastMessageSender: string | null
  unreadCount: Record<string, number> // { [uid]: count }
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface DMMessage {
  id: string
  uid: string
  displayName: string
  photoURL: string | null
  text: string
  replyTo?: { id: string; text: string; displayName: string } | null
  createdAt: Timestamp | null
  isEdited?: boolean
  editedAt?: Timestamp | null
}

export interface SafetyReport {
  id: string
  chatId: string
  blockerUid: string
  blockerName: string
  blockerEmail: string
  blockeeUid: string
  blockeeName: string
  blockeeEmail: string
  reason: string
  reportedAt: Timestamp | null
}

// ─── Generate Deterministic Chat ID ───
export function getChatId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`
}

// ─── Create or get a Direct Chat Session ───
export async function createOrGetChatSession(
  uid1: string,
  uid2: string,
  name1: string,
  name2: string,
  photo1: string | null,
  photo2: string | null,
  email1 = "",
  email2 = ""
): Promise<DirectChat> {
  const chatId = getChatId(uid1, uid2)
  const ref = doc(db, "directChats", chatId)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as DirectChat
  }

  const newChat: Omit<DirectChat, "id"> = {
    users: [uid1, uid2],
    userNames: {
      [uid1]: name1 || "Student",
      [uid2]: name2 || "Student",
    },
    userPhotos: {
      [uid1]: photo1 || null,
      [uid2]: photo2 || null,
    },
    userEmails: {
      [uid1]: email1,
      [uid2]: email2,
    },
    status: "pending",
    blockedBy: null,
    lastMessage: null,
    lastMessageAt: null,
    lastMessageSender: null,
    unreadCount: {
      [uid1]: 0,
      [uid2]: 0,
    },
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  }

  await setDoc(ref, newChat)
  return { id: chatId, ...newChat } as DirectChat
}

// ─── Send a Direct Message ───
export async function sendDM(
  chatId: string,
  senderUid: string,
  displayName: string,
  photoURL: string | null,
  text: string,
  replyTo?: { id: string; text: string; displayName: string } | null
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 500) return

  // 1. Add message to directChats/{chatId}/messages
  await addDoc(collection(db, "directChats", chatId, "messages"), {
    uid: senderUid,
    displayName,
    photoURL: photoURL || null,
    text: trimmed,
    replyTo: replyTo || null,
    createdAt: serverTimestamp(),
  })

  // 2. Fetch the chat to know the other user UID to increment unread count
  const chatRef = doc(db, "directChats", chatId)
  const chatSnap = await getDoc(chatRef)
  if (chatSnap.exists()) {
    const chatData = chatSnap.data() as DirectChat
    const recipientUid = chatData.users.find((u) => u !== senderUid)

    const updateData: any = {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
      lastMessageSender: senderUid,
      updatedAt: serverTimestamp(),
    }

    if (recipientUid) {
      updateData[`unreadCount.${recipientUid}`] = increment(1)

      // Dispatch Web Push Notification asynchronously (like WhatsApp Web)
      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dm",
          senderUid,
          senderName: displayName,
          text: trimmed,
          chatId,
          recipientUid,
        }),
      }).catch((err) => console.warn("[Push] Failed to trigger DM notification:", err))
    }

    await updateDoc(chatRef, updateData)
  }
}

// ─── Subscribe to Direct Chats list ───
export function subscribeToUserDMs(
  uid: string,
  callback: (chats: DirectChat[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "directChats"),
    where("users", "array-contains", uid),
    orderBy("updatedAt", "desc")
  )

  return onSnapshot(q, (snapshot) => {
    const chats: DirectChat[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<DirectChat, "id">),
    }))
    callback(chats)
  })
}

// ─── Subscribe to Direct Chat messages ───
export function subscribeToDMMessages(
  chatId: string,
  callback: (messages: DMMessage[]) => void,
  msgLimit = 200
): Unsubscribe {
  const q = query(
    collection(db, "directChats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(msgLimit)
  )

  return onSnapshot(q, (snapshot) => {
    const messages: DMMessage[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<DMMessage, "id">),
    }))
    callback(messages)
  })
}

// ─── Update Chat Status (Accept / Reject) ───
export async function updateChatStatus(chatId: string, status: "accepted" | "rejected"): Promise<void> {
  const ref = doc(db, "directChats", chatId)
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  })
}

// ─── Mark Chat as Read ───
export async function markDMRead(chatId: string, userUid: string): Promise<void> {
  const ref = doc(db, "directChats", chatId)
  await updateDoc(ref, {
    [`unreadCount.${userUid}`]: 0,
  }).catch((err) => {
    console.warn("Failed to mark DM read:", err)
  })
}

// ─── Web3Forms Notification Helper ───
export async function sendWeb3FormsNotification(
  blockerName: string,
  blockerEmail: string,
  blockeeName: string,
  blockeeEmail: string,
  reason: string
): Promise<boolean> {
  // Free public access key or user provided key
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || "e5b9f71c-34f3-4d7a-8f5b-1c5c589a1c8f"
  
  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `🚨 SECURITY REPORT: ${blockerName} blocked ${blockeeName} on StudyOS`,
        from_name: "StudyOS Moderator Guard",
        to_email: ADMIN_EMAIL,
        message: `
          StudyOS Security Incident Report
          --------------------------------
          A student has reported another user and blocked them on the platform.

          BLOCKER / REPORTER:
          - Name: ${blockerName}
          - Email: ${blockerEmail}

          BLOCKED / REPORTED USER:
          - Name: ${blockeeName}
          - Email: ${blockeeEmail}

          REASON GIVEN:
          "${reason || "No specific reason provided."}"

          SYSTEM ADVICE:
          Please sign in to the Admin Dashboard under 'Safety Reports' to review this user's profile and take action (e.g., Ban User, Send Warning email).
        `,
      }),
    })
    
    return response.ok
  } catch (err) {
    console.warn("Failed to dispatch safety report via Web3Forms API:", err)
    return false
  }
}

// ─── Block a User in DM ───
export async function blockUserInChat(
  chatId: string,
  blockerUid: string,
  blockerName: string,
  blockerEmail: string,
  blockeeUid: string,
  blockeeName: string,
  blockeeEmail: string,
  reason: string
): Promise<void> {
  // 1. Update directChat doc status
  const chatRef = doc(db, "directChats", chatId)
  await updateDoc(chatRef, {
    status: "rejected",
    blockedBy: blockerUid,
    updatedAt: serverTimestamp(),
  })

  // 2. Add an entry to the safetyReports firestore collection
  const reportRef = collection(db, "safetyReports")
  await addDoc(reportRef, {
    chatId,
    blockerUid,
    blockerName,
    blockerEmail,
    blockeeUid,
    blockeeName,
    blockeeEmail,
    reason: reason.trim() || "Inappropriate behavior or spamming",
    reportedAt: serverTimestamp(),
  })

  // 3. Send out the Web3Forms email notification to Admin
  await sendWeb3FormsNotification(
    blockerName,
    blockerEmail,
    blockeeName,
    blockeeEmail,
    reason
  )
}

// ─── Unblock User ───
export async function unblockUserInChat(chatId: string): Promise<void> {
  const ref = doc(db, "directChats", chatId)
  await updateDoc(ref, {
    blockedBy: null,
    status: "pending", // Reset back to pending so they can accept/reject cleanly
    updatedAt: serverTimestamp(),
  })
}

// ─── Delete DM Message (Admin/Owner) ───
export async function deleteDMMessage(chatId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, "directChats", chatId, "messages", messageId))
}

// ─── Edit DM Message (Owner) ───
export async function editDMMessage(chatId: string, messageId: string, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 500) return
  const ref = doc(db, "directChats", chatId, "messages", messageId)
  await updateDoc(ref, {
    text: trimmed,
    isEdited: true,
    editedAt: serverTimestamp(),
  })
}

// ─── Fetch Safety Reports (Admin Only) ───
export async function fetchSafetyReports(): Promise<SafetyReport[]> {
  const q = query(collection(db, "safetyReports"), orderBy("reportedAt", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<SafetyReport, "id">),
  }))
}

// ─── Dismiss/Clear Safety Report (Admin Only) ───
export async function dismissSafetyReport(reportId: string): Promise<void> {
  await deleteDoc(doc(db, "safetyReports", reportId))
}
