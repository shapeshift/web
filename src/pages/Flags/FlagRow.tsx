import { Switch } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Row } from 'components/Row/Row'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlag } from 'state/slices/preferencesSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

type FlagRowProps = {
  flag: keyof FeatureFlags
}

export const FlagRow = ({ flag }: FlagRowProps) => {
  const isOn = useAppSelector(state => selectFeatureFlag(state, flag))
  const dispatch = useAppDispatch()
  const handleClick = useCallback(() => {
    dispatch(preferences.actions.setFeatureFlag({ flag, value: !isOn }))
  }, [dispatch, flag, isOn])

  return (
    <Row>
      <Row.Label>{flag}</Row.Label>
      <Row.Value>
        <Switch isChecked={isOn} onChange={handleClick} />
      </Row.Value>
    </Row>
  )
}
