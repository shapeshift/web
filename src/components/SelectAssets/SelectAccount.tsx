import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, ModalBody, ModalCloseButton, ModalHeader, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { AssetAccountRow } from 'components/AssetAccounts/AssetAccountRow'
import { SlideTransition } from 'components/SlideTransition'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import {
  AccountSpecifier,
  selectAccountIdsByAssetId
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { SelectAssetRoutes } from './SelectAssetRouter'

type SelectAccountProps = {
  onClick: (asset: Asset, accountId: AccountSpecifier) => void
}

type SelectAccountLocation = {
  assetId: CAIP19
}

export const SelectAccount = ({ onClick, ...rest }: SelectAccountProps) => {
  const location = useLocation<SelectAccountLocation>()
  const translate = useTranslate()
  const history = useHistory()
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, location.state.assetId)
  )
  const asset = useAppSelector(state => selectAssetByCAIP19(state, location.state.assetId))
  return (
    <SlideTransition>
      <ModalHeader textAlign='center' display='grid' gridTemplateColumns='32px 1fr 32px' px={2}>
        <IconButton
          variant='ghost'
          icon={<ArrowBackIcon />}
          aria-label={translate('common.back')}
          fontSize='xl'
          size='sm'
          isRound
          onClick={() => history.push(SelectAssetRoutes.Search)}
        />
        Select an Account
        <ModalCloseButton position='static' />
      </ModalHeader>
      <ModalBody height='600px' px={2} display='flex' flexDir='column'>
        <Stack>
          {accountIds.map(accountId => (
            <AssetAccountRow
              accountId={accountId}
              assetId={asset.caip19}
              key={accountId}
              onClick={() => onClick(asset, accountId)}
            />
          ))}
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}
