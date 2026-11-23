"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react"
import { AlertTriangle, Keyboard, Send, Smile } from "lucide-react"

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })

const MAX_MESSAGE_LENGTH = 500
const SINGLE_LINE_HEIGHT = 22
const MAX_TEXTAREA_HEIGHT = 120

interface ChatComposerBarProps {
  text: string
  onTextChange: (nextText: string) => void
  onSend: () => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  sending: boolean
  cooldown: boolean
  hasForbiddenWords: boolean
  forbiddenWarning?: string
  cooldownLabel?: string
  onScrollToBottom?: () => void
  showEmojiPicker: boolean
  onShowEmojiPickerChange: (open: boolean) => void
}

function measureTextareaHeight(el: HTMLTextAreaElement | null): number {
  if (!el || !el.value) return SINGLE_LINE_HEIGHT
  const prevHeight = el.style.height
  el.style.height = `${SINGLE_LINE_HEIGHT}px`
  const measured = el.scrollHeight
  el.style.height = prevHeight
  // Guard against subpixel DPI rounding on a single line (22-26px)
  if (measured <= SINGLE_LINE_HEIGHT + 4) return SINGLE_LINE_HEIGHT
  return Math.min(measured, MAX_TEXTAREA_HEIGHT)
}

/**
 * Shared WhatsApp-style chat composer with a 44px capsule pill,
 * optically centered single-line emoji/input alignment, and a preloaded emoji drawer.
 */
export function ChatComposerBar({
  text,
  onTextChange,
  onSend,
  inputRef,
  sending,
  cooldown,
  hasForbiddenWords,
  forbiddenWarning = "Please remove inappropriate language",
  cooldownLabel = "Wait a moment...",
  onScrollToBottom,
  showEmojiPicker,
  onShowEmojiPickerChange,
}: ChatComposerBarProps) {
  const { resolvedTheme } = useTheme()
  const [emojiMounted, setEmojiMounted] = useState(false)
  const [textareaHeight, setTextareaHeight] = useState(SINGLE_LINE_HEIGHT)
  const lastSendTapRef = useRef(0)
  const selectionRef = useRef<{ start: number; end: number }>({
    start: text.length,
    end: text.length,
  })

  // Preload the emoji picker bundle so the first open feels instant
  useEffect(() => {
    import("emoji-picker-react").catch(() => {})
  }, [])

  // Keep the picker mounted once opened so subsequent toggles are <1ms
  useEffect(() => {
    if (showEmojiPicker && !emojiMounted) {
      setEmojiMounted(true)
    }
  }, [showEmojiPicker, emojiMounted])

  // Sync textarea height cleanly for empty, typed, emoji, and edited text
  useLayoutEffect(() => {
    if (!text) {
      setTextareaHeight(SINGLE_LINE_HEIGHT)
      selectionRef.current = { start: 0, end: 0 }
      return
    }
    setTextareaHeight(measureTextareaHeight(inputRef.current))
  }, [text, inputRef])

  const captureSelection = () => {
    const el = inputRef.current
    if (!el) return
    selectionRef.current = {
      start: el.selectionStart ?? text.length,
      end: el.selectionEnd ?? text.length,
    }
  }

  const handleToggleEmoji = () => {
    if (showEmojiPicker) {
      onShowEmojiPickerChange(false)
      setTimeout(() => inputRef.current?.focus(), 40)
    } else {
      captureSelection()
      onShowEmojiPickerChange(true)
      inputRef.current?.blur()
      setTimeout(() => onScrollToBottom?.(), 80)
    }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji
    const { start, end } = selectionRef.current
    const safeStart = Math.min(start, text.length)
    const safeEnd = Math.min(Math.max(end, safeStart), text.length)
    const remainingBudget = MAX_MESSAGE_LENGTH - (text.length - (safeEnd - safeStart))

    if (emoji.length > remainingBudget) return

    const nextText = text.slice(0, safeStart) + emoji + text.slice(safeEnd)
    const nextCursor = safeStart + emoji.length
    selectionRef.current = { start: nextCursor, end: nextCursor }

    onTextChange(nextText)

    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      if (document.activeElement === el) {
        el.setSelectionRange(nextCursor, nextCursor)
      }
    })
  }

  const canSend = Boolean(text.trim()) && !sending && !cooldown && !hasForbiddenWords
  const isSingleLine = textareaHeight <= SINGLE_LINE_HEIGHT

  const handleSendAction = (e?: React.SyntheticEvent) => {
    const now = Date.now()
    if (now - lastSendTapRef.current < 350) {
      e?.preventDefault()
      return
    }
    if (!canSend) return
    lastSendTapRef.current = now

    const wasKeyboardActive = !showEmojiPicker && document.activeElement === inputRef.current
    onSend()
    if (wasKeyboardActive) {
      inputRef.current?.focus({ preventScroll: true })
    }
  }

  return (
    <div className="border-t border-border bg-background flex flex-col shrink-0 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto w-full px-2.5 sm:px-4 py-2">
        <div className="flex items-end gap-2 w-full">
          {/* WhatsApp-style 44px capsule pill: vertically centered on 1 line, bottom-anchored on multi-line */}
          <div
            className={`flex-1 min-h-11 relative flex ${
              isSingleLine ? "items-center" : "items-end"
            } bg-muted/80 border border-border rounded-[22px] pl-2 pr-3.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all min-w-0`}
          >
            <button
              type="button"
              onClick={handleToggleEmoji}
              aria-label={showEmojiPicker ? "Switch to keyboard" : "Open emoji picker"}
              title={showEmojiPicker ? "Keyboard" : "Emojis"}
              className={`w-8 h-8 ${
                isSingleLine ? "my-0" : "my-1.25"
              } shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors active:scale-95 cursor-pointer`}
            >
              {showEmojiPicker ? (
                <Keyboard className="w-5.5 h-5.5" strokeWidth={1.9} />
              ) : (
                <Smile className="w-5.5 h-5.5" strokeWidth={1.9} />
              )}
            </button>

            <textarea
              ref={inputRef}
              value={text}
              onFocus={() => {
                onShowEmojiPickerChange(false)
                setTimeout(() => onScrollToBottom?.(), 150)
                setTimeout(() => onScrollToBottom?.(), 400)
              }}
              onSelect={captureSelection}
              onKeyUp={captureSelection}
              onClick={captureSelection}
              onChange={(e) => {
                const next = e.target.value.slice(0, MAX_MESSAGE_LENGTH)
                selectionRef.current = {
                  start: e.target.selectionStart ?? next.length,
                  end: e.target.selectionEnd ?? next.length,
                }
                onTextChange(next)
              }}
              placeholder="Type a message..."
              className={`flex-1 block ${
                isSingleLine ? "translate-y-[0.5px] my-0" : "my-2.5"
              } pl-1.5 pr-1 py-0 bg-transparent text-[13px] leading-5.5 focus:outline-none placeholder:text-muted-foreground/55 resize-none scrollbar-hide text-foreground min-w-0`}
              rows={1}
              style={{
                height: `${textareaHeight}px`,
                overflowY: textareaHeight >= MAX_TEXTAREA_HEIGHT ? "auto" : "hidden",
              }}
            />

            {text.length > 400 && (
              <span
                className={`self-end pb-2.5 pl-1.5 text-[9px] font-bold shrink-0 ${
                  text.length >= MAX_MESSAGE_LENGTH
                    ? "text-destructive"
                    : "text-muted-foreground/40"
                }`}
              >
                {text.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>

          {/* Send Button (44px circle matching 1-line pill height) */}
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              // Keep virtual keyboard focused instead of blurring textarea before click completes
              e.preventDefault()
            }}
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSendAction(e)
            }}
            onClick={(e) => handleSendAction(e)}
            disabled={!canSend}
            aria-label="Send message"
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all ${
              canSend
                ? "bg-primary text-primary-foreground active:scale-95 cursor-pointer shadow-lg shadow-primary/20"
                : "bg-muted/80 border border-border text-muted-foreground/40 cursor-not-allowed"
            }`}
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {cooldown && (
        <p className="text-[9px] text-muted-foreground/40 mb-2 px-4 font-medium max-w-3xl mx-auto w-full">
          {cooldownLabel}
        </p>
      )}
      {hasForbiddenWords && (
        <p className="text-[10px] text-destructive mb-2 px-4 font-bold flex items-center gap-1 animate-pulse max-w-3xl mx-auto w-full">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {forbiddenWarning}
        </p>
      )}

      {emojiMounted && (
        <div
          className={
            showEmojiPicker
              ? "w-full bg-background border-t border-border h-[min(40vh,300px)] sm:h-72 overflow-hidden animate-in slide-in-from-bottom duration-150"
              : "hidden"
          }
        >
          <EmojiPicker
            theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
            width="100%"
            height="100%"
            skinTonesDisabled
            searchDisabled
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
            onEmojiClick={handleEmojiClick}
          />
        </div>
      )}
    </div>
  )
}
