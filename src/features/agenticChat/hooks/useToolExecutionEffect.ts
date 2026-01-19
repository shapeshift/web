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
  executeRef.current = execute
  setStateRef.current = setState

  useEffect(() => {
    if (!data) {
      return
    }

    if (hasRuntimeState) {
      return
    }

    dispatch(agenticChatSlice.actions.initializeRuntimeState({ toolCallId, state: initialState }))

    const executeWrapper = async () => {
      try {
        await executeRef.current(data, setStateRef.current)
      } catch (error) {
        console.error('[useToolExecutionEffect] Tool execution failed:', error)
      }
    }

    void executeWrapper()
  }, [toolCallId, data, hasRuntimeState, dispatch, initialState])

  return {
    state,
    setState,
  }
}
