import { Button } from '@chakra-ui/react'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import { useDispatch, useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { ReduxState } from 'state/reducer'
import { getScriptTypeKey, preferences } from 'state/slices/preferencesSlice/preferencesSlice'

export const SegwitSelectCard = ({ chain }: { chain: ChainTypes }) => {
  const scriptTypeKey = getScriptTypeKey(chain)
  const dispatch = useDispatch()
  const currentScriptType: BTCInputScriptType = useSelector(
    (state: ReduxState) => state.preferences[scriptTypeKey]
  )

  return (
    <Card.Body hidden={chain !== ChainTypes.Bitcoin}>
      <Button
        size='sm'
        colorScheme={currentScriptType === BTCInputScriptType.SpendWitness ? 'white' : 'blue'}
        variant='ghost'
        onClick={() =>
          dispatch(
            preferences.actions.setPreference({
              key: scriptTypeKey,
              value: BTCInputScriptType.SpendWitness
            })
          )
        }
      >
        <Text translation='assets.assetDetails.assetHeader.segwitNative' />
      </Button>
      <Button
        size='sm'
        colorScheme={currentScriptType === BTCInputScriptType.SpendP2SHWitness ? 'white' : 'blue'}
        variant='ghost'
        onClick={() =>
          dispatch(
            preferences.actions.setPreference({
              key: scriptTypeKey,
              value: BTCInputScriptType.SpendP2SHWitness
            })
          )
        }
      >
        <Text translation='assets.assetDetails.assetHeader.segwit' />
      </Button>
      <Button
        size='sm'
        colorScheme={currentScriptType === BTCInputScriptType.SpendAddress ? 'white' : 'blue'}
        variant='ghost'
        onClick={() =>
          dispatch(
            preferences.actions.setPreference({
              key: scriptTypeKey,
              value: BTCInputScriptType.SpendAddress
            })
          )
        }
      >
        <Text translation='assets.assetDetails.assetHeader.legacy' />
      </Button>
    </Card.Body>
  )
}
