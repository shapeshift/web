import { Button } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { useDispatch, useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { ReduxState } from 'state/reducer'
import { preferences, supportedAccountTypes } from 'state/slices/preferencesSlice/preferencesSlice'

export const SegwitSelectCard = ({ chain }: { chain: ChainTypes }) => {
  const dispatch = useDispatch()
  const accountTypes = supportedAccountTypes[chain]
  const currentAccountType = useSelector(
    (state: ReduxState) => state.preferences.accountTypes[chain]
  )

  return (
    <Card.Body hidden={!accountTypes}>
      {accountTypes?.map((accountType, i) => (
        <Button
          key={i}
          size='sm'
          colorScheme={currentAccountType === accountType ? 'white' : 'blue'}
          variant='ghost'
          onClick={() =>
            dispatch(
              preferences.actions.setAccountType({
                key: chain,
                value: accountType
              })
            )
          }
        >
          <Text translation={`assets.assetDetails.assetHeader.${accountType}`} />
        </Button>
      ))}
    </Card.Body>
  )
}
