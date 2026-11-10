import { NextRequest, NextResponse } from "next/server"
import { getAdminMessaging, getAdminFirestore } from "@/lib/firebase-admin"

interface NotificationPayload {
  type: "dm" | "room"
  senderUid: string
  senderName: string
  text: string
  chatId?: string
  recipientUid?: string
  roomName?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: NotificationPayload = await req.json()
    const { type, senderUid, senderName, text, chatId, recipientUid, roomName } = body

    if (!type || !senderName || !text) {
      return NextResponse.json(
        { error: "Missing required notification fields" },
        { status: 400 }
      )
    }

    const messaging = getAdminMessaging()
    const firestore = getAdminFirestore()

    if (!messaging || !firestore) {
      console.warn("[FCM API] Firebase Admin not fully configured. Notification skipped.")
      return NextResponse.json(
        { 
          success: false, 
          message: "Firebase Admin is not configured with service account credentials." 
        },
        { status: 200 }
      )
    }

    const previewText = text.length > 120 ? text.slice(0, 117) + "..." : text

    // ─── 1. Private DM Notification ───
    if (type === "dm") {
      if (!recipientUid) {
        return NextResponse.json({ error: "recipientUid is required for DMs" }, { status: 400 })
      }

      // Fetch recipient's document to get their FCM token
      const recipientDoc = await firestore.collection("users").doc(recipientUid).get()
      if (!recipientDoc.exists) {
        return NextResponse.json({ success: false, message: "Recipient user not found" })
      }

      const recipientData = recipientDoc.data()
      const fcmToken = recipientData?.fcmToken as string | undefined
      const fcmTokens = (recipientData?.fcmTokens as string[] | undefined) || []

      const tokensToSend = [...new Set([fcmToken, ...fcmTokens].filter(Boolean) as string[])]

      if (tokensToSend.length === 0) {
        return NextResponse.json({
          success: false,
          message: "Recipient has no registered FCM push token.",
        })
      }

      const targetUrl = `/?tab=chat&chatId=${chatId || ""}`

      const response = await messaging.sendEachForMulticast({
        tokens: tokensToSend,
        notification: {
          title: senderName || "New Direct Message",
          body: previewText,
        },
        data: {
          url: targetUrl,
          chatId: chatId || "",
          type: "dm",
          senderUid: senderUid || "",
        },
        webpush: {
          headers: {
            Urgency: "high",
          },
          notification: {
            icon: "/icon-192-removebg-preview.png",
            badge: "/icon-192-removebg-preview.png",
            tag: `dm-${chatId || recipientUid}`,
            renotify: true,
            requireInteraction: true,
          },
          fcmOptions: {
            link: targetUrl,
          },
        },
      })

      return NextResponse.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      })
    }

    // ─── 2. Global Chat / Room Notification ───
    if (type === "room") {
      const roomLabel = roomName || "Global Chat"
      const targetUrl = "/?tab=chat"

      // Fetch active users who have an fcmToken registered (excluding the sender)
      const usersSnap = await firestore
        .collection("users")
        .where("fcmToken", "!=", null)
        .limit(200)
        .get()

      const tokens: string[] = []
      usersSnap.forEach((doc: any) => {
        if (doc.id !== senderUid) {
          const data = doc.data()
          if (data.fcmToken) tokens.push(data.fcmToken)
          if (Array.isArray(data.fcmTokens)) {
            data.fcmTokens.forEach((t: string) => {
              if (t && !tokens.includes(t)) tokens.push(t)
            })
          }
        }
      })

      if (tokens.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No registered recipient tokens for room broadcast.",
        })
      }

      const response = await messaging.sendEachForMulticast({
        tokens: tokens.slice(0, 500), // FCM multicast batch limit
        notification: {
          title: `${senderName} (${roomLabel})`,
          body: previewText,
        },
        data: {
          url: targetUrl,
          type: "room",
          senderUid: senderUid || "",
        },
        webpush: {
          headers: {
            Urgency: "high",
          },
          notification: {
            icon: "/icon-192-removebg-preview.png",
            badge: "/icon-192-removebg-preview.png",
            tag: "global-chat",
            renotify: true,
          },
          fcmOptions: {
            link: targetUrl,
          },
        },
      })

      return NextResponse.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
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
