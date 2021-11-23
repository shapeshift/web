import {
  Button,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Tooltip
} from '@chakra-ui/react'
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
      <Menu>
        <MenuButton as={Button} variant='ghost-filled' colorScheme='blue' size='sm'>
          {translate('assets.assetDetails.assetHeader.btcFormat')}
        </MenuButton>
        <MenuList color='gray.500'>
          <MenuOptionGroup
            type='radio'
            value={currentAccountType}
            onChange={option =>
              dispatch(
                preferences.actions.setAccountType({
                  key: chain,
                  value: option
                })
              )
            }
          >
            {accountTypes?.map(accountType => (
              <MenuItemOption value={accountType} fontSize='sm'>
                {accountType === UtxoAccountType.SegwitNative ? (
                  <Tooltip
                    label={translate('assets.assetDetails.assetHeader.SegwitNativeTooltip')}
                    fontSize='sm'
                  >
                    {translate(`assets.assetDetails.assetHeader.${accountType}`)}
                  </Tooltip>
                ) : (
                  translate(`assets.assetDetails.assetHeader.${accountType}`)
                )}
              </MenuItemOption>
            ))}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
    </Card.Body>
  )
}
