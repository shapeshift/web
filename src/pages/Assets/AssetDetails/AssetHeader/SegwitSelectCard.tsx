import { Select } from '@chakra-ui/react'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { useDispatch, useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { ReduxState } from 'state/reducer'
import { preferences, supportedAccountTypes } from 'state/slices/preferencesSlice/preferencesSlice'

export const SegwitSelectCard = ({ chain }: { chain: ChainTypes }) => {
  const dispatch = useDispatch()
  const translate = useTranslate()
  const accountTypes = supportedAccountTypes[chain]
  const currentAccountType = useSelector(
    (state: ReduxState) => state.preferences.accountTypes[chain]
  )

  return (
    <Card.Body hidden={!accountTypes}>
      <Select
        size='sm'
        value={currentAccountType}
        onChange={option =>
          dispatch(
            preferences.actions.setAccountType({
              key: chain,
              value: option.target.value
            })
          )
        }
      >
        {accountTypes?.map(accountType => (
          <option
            value={accountType}
            title={
              accountType === UtxoAccountType.SegwitNative
                ? translate('assets.assetDetails.assetHeader.SegwitNativeTooltip')
                : undefined
            }
          >
            {translate(`assets.assetDetails.assetHeader.${accountType}`)}
          </option>
        ))}
      </Select>
    </Card.Body>
  )
}
