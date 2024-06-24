import { useState } from 'react'

export interface useCopyToClipboardProps {
  timeout?: number
}

export function useCopyToClipboard({ timeout = 2000 }: useCopyToClipboardProps) {
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [isCopying, setIsCopying] = useState<boolean>(false)

  const copyToClipboard = (value: string) => {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      return
    }

    if (!value) {
      return
    }

    // Prevent race condition if the user clicks copy multiple times
    if (isCopying) return
    setIsCopying(true)

    void navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true)

      setTimeout(() => {
        // Reset the state after the timeout
        setIsCopying(false)
        setIsCopied(false)
      }, timeout)
    })
  }

  return { isCopied, copyToClipboard }
}
