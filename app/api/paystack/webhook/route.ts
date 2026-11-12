import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-paystack-signature")
    const secret =
      process.env.PAYSTACK_SECRET_KEY ||
      process.env.PAYSTACK_SECRET ||
      process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY

    // 1. Validate Secret & Signature
    if (!signature || !secret) {
      console.warn("[Paystack Webhook] Missing signature")
      return NextResponse.json(
        { message: "Missing signature" },
        { status: 400 }
      )
    }

    // 2. Verify HMAC SHA512 signature against raw request body
    const hash = crypto
      .createHmac("sha512", secret.trim())
      .update(rawBody)
      .digest("hex")

    if (hash !== signature) {
      console.error("[Paystack Webhook] Invalid signature verification failed")
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 })
    }

    const event = JSON.parse(rawBody)

    // 3. Process charge.success event
    if (event.event === "charge.success") {
      const data = event.data
      const metadata = data.metadata || {}
      
      // Look up user UID from metadata fields
      let userUid =
        metadata.user_id ||
        metadata.userId ||
        metadata.uid ||
        metadata.custom_fields?.find(
          (f: any) =>
            f.variable_name === "user_id" ||
            f.variable_name === "userId" ||
            f.variable_name === "uid"
        )?.value

      const customerEmail = data.customer?.email?.toLowerCase().trim()
      const reference = data.reference
      const amountPaid = data.amount ? data.amount / 100 : 500

      const adminDb = getAdminFirestore()
      if (!adminDb) {
        console.error("[Paystack Webhook]")
        return NextResponse.json(
          { message: "Firebase Admin Firestore not initialized" },
          { status: 500 }
        )
      }

      // If userUid wasn't in metadata, try finding by email in users collection
      if (!userUid && customerEmail) {
        try {
          const userSnap = await adminDb
            .collection("users")
            .where("email", "==", customerEmail)
            .limit(1)
            .get()

          if (!userSnap.empty) {
            userUid = userSnap.docs[0].id
          }
        } catch (searchErr) {
          console.warn("[Paystack Webhook] Email lookup fallback failed:", searchErr)
        }
      }

      if (userUid) {
        // Compute Pro expiration: 90 days (3 months) for SSS (₦1,000) or 60 days (2 months) for JSS (₦500)
        const categoryMeta =
          metadata.category ||
          metadata.custom_fields?.find((f: any) => f.variable_name === "category")?.value
        const durationDays =
          Number(metadata.duration_days) ||
          (categoryMeta === "SSS" || amountPaid >= 1000 ? 90 : 60)

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + durationDays)

        // Upgrade user document in Firestore
        const userRef = adminDb.collection("users").doc(userUid)
        await userRef.set(
          {
            isPro: true,
            proExpiresAt: expiresAt.toISOString(),
            proActivatedAt: new Date().toISOString(),
            lastPaymentReference: reference,
            lastPaymentAmount: amountPaid,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )

        // Log payment history
        await adminDb
          .collection("payments")
          .doc(reference)
          .set(
            {
              userId: userUid,
              customerEmail: customerEmail || "",
              amount: amountPaid,
              currency: data.currency || "NGN",
              reference,
              channel: data.channel || "card",
              paidAt: data.paid_at || new Date().toISOString(),
              status: "success",
              createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          )

        console.log(
          `[Paystack Webhook] Upgraded user ${userUid} (${customerEmail}) to Pro. Ref: ${reference}`
        )
      } else {
        console.warn(
          `[Paystack Webhook] Payment succeeded (${reference}) but no user ID could be identified.`
        )
      }
    }

    // Always respond with 200 OK to acknowledge receipt
    return NextResponse.json({ status: "success" }, { status: 200 })
  } catch (error: any) {
    console.error("[Paystack Webhook Error]:", error)
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    )
  }
}

