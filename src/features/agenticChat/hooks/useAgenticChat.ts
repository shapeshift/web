import { useChat } from '@ai-sdk/react'
import { fromAccountId, solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { DefaultChatTransport } from 'ai'
import { useCallback, useMemo, useState } from 'react'

import { getConfig } from '@/config'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { useAppSelector } from '@/state/store'

export const useAgenticChat = () => {
  const accountIds = useAppSelector(selectEnabledWalletAccountIds)
  const [input, setInput] = useState('')
  const { showErrorToast } = useErrorToast()

  const walletContext = useMemo(() => {
    const evmAddresses = new Set<string>()
    const solanaAddresses = new Set<string>()
    const chainIds = new Set<string>()

    accountIds.forEach(accountId => {
      const { chainId, account } = fromAccountId(accountId)

      chainIds.add(chainId)

      if (isEvmChainId(chainId)) {
        evmAddresses.add(account)
      } else if (chainId === solanaChainId) {
        solanaAddresses.add(account)
      }
    })

    return {
      evmAddress: Array.from(evmAddresses)[0],
      solanaAddress: Array.from(solanaAddresses)[0],
      approvedChainIds: Array.from(chainIds),
    }
  }, [accountIds])

  const agenticServerBaseUrl = getConfig().VITE_AGENTIC_SERVER_BASE_URL
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${agenticServerBaseUrl}/api/chat`,
        body: walletContext,
      }),
    [agenticServerBaseUrl, walletContext],
  )

  const chat = useChat({
    transport,
  })

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmedInput = input.trim()
      if (!trimmedInput) return
      setInput('')
      try {
        await chat.sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: trimmedInput }],
        })
      } catch (error) {
        setInput(trimmedInput)
        showErrorToast(error)
      }
    },
    [input, chat, showErrorToast],
  )

  return {
    ...chat,
    input,
    handleInputChange,
    handleSubmit,
  }
}

export type AgenticChatHelpers = ReturnType<typeof useAgenticChat>
