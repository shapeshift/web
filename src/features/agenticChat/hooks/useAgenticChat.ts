import { useChat } from '@ai-sdk/react'
import { fromAccountId, solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { UIMessage } from 'ai'
import { DefaultChatTransport } from 'ai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  extractTitleFromMessages,
  extractToolIds,
  generateConversationId,
} from '../utils/conversationUtils'

import { getConfig } from '@/config'
import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from '@/state/store'

export const useAgenticChat = () => {
  const dispatch = useAppDispatch()
  const accountIds = useAppSelector(selectEnabledWalletAccountIds)
  const activeConversationId = useAppSelector(agenticChatSlice.selectors.selectActiveConversationId)
  const activeConversation = useAppSelector(agenticChatSlice.selectors.selectActiveConversation)
  const isChatOpen = useAppSelector(agenticChatSlice.selectors.selectIsChatOpen)
  const [input, setInput] = useState('')

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

  // Keep wallet context in ref so transport body function always has latest wallet data
  // without recreating the transport (which would trigger unnecessary reconnections)
  const walletContextRef = useRef(walletContext)
  walletContextRef.current = walletContext

  const agenticServerBaseUrl = getConfig().VITE_AGENTIC_SERVER_BASE_URL
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${agenticServerBaseUrl}/api/chat`,
        body: () => walletContextRef.current,
      }),
    [agenticServerBaseUrl],
  )

  const chat = useChat({
    transport,
    onFinish: useCallback(
      ({ messages }: { messages: UIMessage[] }) => {
        if (!activeConversationId || messages.length === 0) return

        const title = extractTitleFromMessages(messages, activeConversation)

        if (!activeConversation) {
          const evmAddress = walletContextRef.current.evmAddress
          dispatch(
            agenticChatSlice.actions.createConversation({
              id: activeConversationId,
              title,
              walletAddress: evmAddress,
            }),
          )
        } else {
          dispatch(
            agenticChatSlice.actions.updateConversation({
              id: activeConversationId,
              updates: { title },
            }),
          )
        }

        dispatch(
          agenticChatSlice.actions.setMessages({
            conversationId: activeConversationId,
            messages,
          }),
        )
      },
      [activeConversationId, activeConversation, dispatch],
    ),
  })

  const { setMessages } = chat
  const lastLoadedIdRef = useRef<string | undefined>(undefined)
  const storedMessages = useSelectorWithArgs(
    agenticChatSlice.selectors.selectConversationMessages,
    activeConversationId ?? '',
  )

  useEffect(() => {
    if (!isChatOpen) return

    if (!activeConversationId) {
      const newConversationId = generateConversationId()
      dispatch(agenticChatSlice.actions.setActiveConversation(newConversationId))
      setMessages([])
      lastLoadedIdRef.current = newConversationId
      return
    }

    if (activeConversationId !== lastLoadedIdRef.current) {
      setMessages(storedMessages)

      dispatch(agenticChatSlice.actions.clearHistoricalTools())

      if (storedMessages.length > 0) {
        const toolIds = extractToolIds(storedMessages)
        if (toolIds.length > 0) {
          dispatch(agenticChatSlice.actions.markAsHistorical(toolIds))
        }
      }

      lastLoadedIdRef.current = activeConversationId
    }
  }, [activeConversationId, isChatOpen, dispatch, setMessages, storedMessages])

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
        console.error('Failed to send message:', error)
      }
    },
    [input, chat],
  )

  return {
    ...chat,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
  }
}

export type AgenticChatHelpers = ReturnType<typeof useAgenticChat>
