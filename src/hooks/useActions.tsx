import type { ActionCreatorsMapObject } from '@reduxjs/toolkit'
import { bindActionCreators } from '@reduxjs/toolkit'
import { useMemo } from 'react'
import { useDispatch } from 'react-redux'

// A hook that binds Redux action creators to dispatch, allowing them to be called directly without
// manually calling `dispatch` and memoizing with `useCallback`. Returns an object with the same
// shape as the input actions, but with each action creator wrapped to automatically dispatch its
// action.
export function useActions<T extends ActionCreatorsMapObject>(
  actions: T,
): {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? (...args: Parameters<T[P]>) => ReturnType<T[P]>
    : T[P]
} {
  const dispatch = useDispatch()

  return useMemo(() => bindActionCreators(actions, dispatch), [actions, dispatch])
}
