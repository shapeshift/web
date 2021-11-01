import { Button } from '@chakra-ui/react'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { useDispatch, useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { ReduxState } from 'state/reducer'
import { getAccountTypeKey, preferences } from 'state/slices/preferencesSlice/preferencesSlice'

export const SegwitSelectCard = ({ chain }: { chain: ChainTypes }) => {
  const accountTypeKey = getAccountTypeKey(chain)
  const dispatch = useDispatch()
  const currentAccountType: UtxoAccountType = useSelector(
    (state: ReduxState) => state.preferences[accountTypeKey]
  )

  return (
    <Card.Body hidden={chain !== ChainTypes.Bitcoin}>
      <Button
        size='sm'
        colorScheme={currentAccountType === UtxoAccountType.SegwitNative ? 'white' : 'blue'}
        variant='ghost'
        onClick={() =>
          dispatch(
            preferences.actions.setPreference({
              key: accountTypeKey,
              value: UtxoAccountType.SegwitNative
            })
          )
        }
      >
        <Text translation='assets.assetDetails.assetHeader.segwitNative' />
      </Button>
      <Button
        size='sm'
        colorScheme={currentAccountType === UtxoAccountType.SegwitP2sh ? 'white' : 'blue'}
        variant='ghost'
        onClick={() =>
          dispatch(
            preferences.actions.setPreference({
              key: accountTypeKey,
              value: UtxoAccountType.SegwitP2sh
            })
          )
        }
      >
        <Text translation='assets.assetDetails.assetHeader.segwit' />
      </Button>
      <Button
        size='sm'
        colorScheme={currentAccountType === UtxoAccountType.P2pkh ? 'white' : 'blue'}
        variant='ghost'
        onClick={() =>
          dispatch(
            preferences.actions.setPreference({
              key: accountTypeKey,
              value: UtxoAccountType.P2pkh
            })
          )
        }
      >
        <Text translation='assets.assetDetails.assetHeader.legacy' />
      </Button>
    </Card.Body>
  )
}
