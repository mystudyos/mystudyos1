import { NextRequest, NextResponse } from "next/server"
import { FieldValue, type Firestore } from "firebase-admin/firestore"
import type { Messaging } from "firebase-admin/messaging"
import { getAdminAuth, getAdminMessaging, getAdminFirestore } from "@/lib/firebase-admin"
import { ADMIN_EMAIL } from "@/lib/constants"

interface NotificationPayload {
  type: "dm" | "room"
  senderName: string
  text: string
  chatId?: string
  recipientUid?: string
  roomName?: string
}

interface TokenTarget {
  uid: string
  token: string
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
])

function extractUserTokens(data: Record<string, any> | undefined): string[] {
  if (!data) return []
  const raw = [
    typeof data.fcmToken === "string" ? data.fcmToken : null,
    ...(Array.isArray(data.fcmTokens) ? data.fcmTokens : []),
  ]
  return [...new Set(raw.filter((t): t is string => typeof t === "string" && t.length > 0))]
}

function buildChatUrl(chatId?: string): string {
  return chatId ? `/?tab=chat&chatId=${encodeURIComponent(chatId)}` : "/?tab=chat"
}

async function pruneDeadTokens(
  firestore: Firestore,
  deadByUid: Map<string, string[]>
): Promise<void> {
  if (deadByUid.size === 0) return

  await Promise.all(
    Array.from(deadByUid.entries()).map(async ([uid, deadTokens]) => {
      try {
        const userRef = firestore.collection("users").doc(uid)
        const snap = await userRef.get()
        if (!snap.exists) return
        const data = snap.data() || {}
        const updatePayload: Record<string, any> = {
          fcmTokens: FieldValue.arrayRemove(...deadTokens),
        }
        if (typeof data.fcmToken === "string" && deadTokens.includes(data.fcmToken)) {
          const remaining = extractUserTokens(data).filter((t) => !deadTokens.includes(t))
          updatePayload.fcmToken = remaining[0] ?? FieldValue.delete()
        }
        await userRef.update(updatePayload)
      } catch (err) {
        console.warn("[FCM] Failed to prune stale tokens for user:", uid, err)
      }
    })
  )
}

async function dispatchBatchedMulticast(
  messaging: Messaging,
  firestore: Firestore,
  targets: TokenTarget[],
  meta: {
    title: string
    body: string
    url: string
    tag: string
    type: "dm" | "room"
    senderUid: string
    chatId?: string
  }
): Promise<{ successCount: number; failureCount: number }> {
  if (targets.length === 0) {
    return { successCount: 0, failureCount: 0 }
  }

  let successCount = 0
  let failureCount = 0
  const deadByUid = new Map<string, string[]>()

  // FCM sendEachForMulticast supports up to 500 tokens per batch
  for (let i = 0; i < targets.length; i += 500) {
    const batch = targets.slice(i, i + 500)
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((t) => t.token),
      data: {
        title: meta.title,
        body: meta.body,
        url: meta.url,
        tag: meta.tag,
        type: meta.type,
        senderUid: meta.senderUid,
        chatId: meta.chatId || "",
        icon: "/icon-192-removebg-preview.png",
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        fcmOptions: {
          link: meta.url,
        },
      },
    })

    successCount += response.successCount
    failureCount += response.failureCount

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code && INVALID_TOKEN_CODES.has(resp.error.code)) {
        const target = batch[idx]
        const existing = deadByUid.get(target.uid) || []
        existing.push(target.token)
        deadByUid.set(target.uid, existing)
      }
    })
  }

  if (deadByUid.size > 0) {
    await pruneDeadTokens(firestore, deadByUid)
  }

  return { successCount, failureCount }
}

export async function POST(req: NextRequest) {
  try {
    const adminAuth = getAdminAuth()
    const messaging = getAdminMessaging()
    const firestore = getAdminFirestore()

    if (!adminAuth || !messaging || !firestore) {
      console.warn("[FCM API] Firebase Admin not fully configured. Notification skipped.")
      return NextResponse.json(
        {
          success: false,
          message: "Firebase Admin is not configured with service account credentials.",
        },
        { status: 200 }
      )
    }

    // Verify caller identity via Firebase Auth ID token
    const authHeader = req.headers.get("authorization") || ""
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let authenticatedUid: string
    let authenticatedEmail: string | undefined
    try {
      const decoded = await adminAuth.verifyIdToken(idToken)
      authenticatedUid = decoded.uid
      authenticatedEmail = decoded.email
    } catch {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const body: NotificationPayload = await req.json()
    const { type, senderName, text, chatId, recipientUid, roomName } = body

    if (!type || !senderName || !text) {
      return NextResponse.json(
        { error: "Missing required notification fields" },
        { status: 400 }
      )
    }

    const previewText = text.length > 120 ? text.slice(0, 117) + "..." : text

    // ─── 1. Private DM Notification ───
    if (type === "dm") {
      if (!chatId || !recipientUid) {
        return NextResponse.json(
          { error: "chatId and recipientUid are required for DMs" },
          { status: 400 }
        )
      }

      // Authorize sender as an active participant of this DM thread
      const chatSnap = await firestore.collection("directChats").doc(chatId).get()
      if (!chatSnap.exists) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }
      const chatData = chatSnap.data() || {}
      const participants: string[] = Array.isArray(chatData.users) ? chatData.users : []
      if (
        !participants.includes(authenticatedUid) ||
        !participants.includes(recipientUid) ||
        recipientUid === authenticatedUid
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (chatData.blockedBy) {
        return NextResponse.json({ success: false, message: "Chat is blocked." })
      }

      const recipientDoc = await firestore.collection("users").doc(recipientUid).get()
      if (!recipientDoc.exists) {
        return NextResponse.json({ success: false, message: "Recipient user not found" })
      }

      const recipientData = recipientDoc.data()
      const tokens = extractUserTokens(recipientData)
      if (tokens.length === 0) {
        return NextResponse.json({
          success: false,
          message: "Recipient has no registered FCM push token.",
        })
      }

      const targetUrl = buildChatUrl(chatId)
      const result = await dispatchBatchedMulticast(
        messaging,
        firestore,
        tokens.map((token) => ({ uid: recipientUid, token })),
        {
          title: senderName || "New Direct Message",
          body: previewText,
          url: targetUrl,
          tag: `dm-${chatId}`,
          type: "dm",
          senderUid: authenticatedUid,
          chatId,
        }
      )

      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    // ─── 2. Global Chat / Note Room Notification (Admin-only) ───
    if (type === "room") {
      if (authenticatedEmail !== ADMIN_EMAIL) {
        return NextResponse.json(
          { error: "Only admins can send Note Room notifications" },
          { status: 403 }
        )
      }

      const roomLabel = roomName || "Note Room"
      const usersSnap = await firestore
        .collection("users")
        .where("fcmToken", "!=", null)
        .get()

      const targets: TokenTarget[] = []
      const seenTokens = new Set<string>()

      usersSnap.forEach((userDoc) => {
        if (userDoc.id === authenticatedUid) return
        const data = userDoc.data()
        for (const token of extractUserTokens(data)) {
          if (!seenTokens.has(token)) {
            seenTokens.add(token)
            targets.push({ uid: userDoc.id, token })
          }
        }
      })

      if (targets.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No registered recipient tokens for room broadcast.",
        })
      }

      const res = await dispatchBatchedMulticast(messaging, firestore, targets, {
        title: `${senderName} (${roomLabel})`,
        body: previewText,
        url: buildChatUrl(),
        tag: "global-chat",
        type: "room",
        senderUid: authenticatedUid,
      })

      return NextResponse.json({
        success: true,
        successCount: res.successCount,
        failureCount: res.failureCount,
      })
    }

    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
  } catch (err: any) {
    console.error("[FCM API Error]:", err)
    return NextResponse.json(
      { error: "Failed to dispatch notification", details: err?.message },
      { status: 500 }
    )
  }
}
