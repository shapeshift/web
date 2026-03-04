import produce from 'immer'
import { useCallback, useEffect, useRef } from 'react'

import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type UseToolExecutionEffectResult<TState> = {
  state: TState
  setState: (updater: (draft: TState) => void) => void
}

export function useToolExecutionEffect<TData, TState>(
  toolCallId: string,
  data: TData | null,
  initialState: TState,
  execute: (
    data: TData,
    setState: (updater: (draft: TState) => void) => void,
  ) => void | Promise<void>,
): UseToolExecutionEffectResult<TState> {
  const dispatch = useAppDispatch()

  const state = useAppSelector(state => {
    const runtimeState = state.agenticChat.runtimeToolStates[toolCallId]
    return runtimeState !== undefined ? (runtimeState as TState) : initialState
  })

  const hasRuntimeState = useAppSelector(state => toolCallId in state.agenticChat.runtimeToolStates)
  const persistedTransaction = useAppSelector(state =>
    agenticChatSlice.selectors.selectPersistedTransaction(state, toolCallId),
  )

  const setState = useCallback(
    (updater: (draft: TState) => void) => {
      const currentState = store.getState().agenticChat.runtimeToolStates[toolCallId] as TState
      const nextState = produce(currentState, updater)
      dispatch(agenticChatSlice.actions.setRuntimeState({ toolCallId, state: nextState }))
    },
    [dispatch, toolCallId],
  )

  const executeRef = useRef(execute)
  const setStateRef = useRef(setState)
  const hasExecutedRef = useRef(false)
  executeRef.current = execute
  setStateRef.current = setState

  useEffect(() => {
    if (persistedTransaction) {
      return
    }

    if (!data) {
      return
    }

    if (hasRuntimeState) {
      return
    }

    if (hasExecutedRef.current) {
      return
    }

    hasExecutedRef.current = true
    dispatch(agenticChatSlice.actions.initializeRuntimeState({ toolCallId, state: initialState }))

    const executeWrapper = async () => {
      try {
        await executeRef.current(data, setStateRef.current)
      } catch (error) {
        console.error('[useToolExecutionEffect] Tool execution failed:', error)
      }
    }

    void executeWrapper()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolCallId, data, hasRuntimeState, dispatch, persistedTransaction])

  useEffect(() => {
    hasExecutedRef.current = false
  }, [toolCallId])

  return {
    state,
    setState,
  }
}
