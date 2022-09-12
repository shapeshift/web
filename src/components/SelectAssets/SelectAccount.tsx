import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, ModalBody, ModalCloseButton, ModalHeader, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { AssetAccountRow } from 'components/AssetAccounts/AssetAccountRow'
import { SlideTransition } from 'components/SlideTransition'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectAccountIdsByAssetId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { SelectAssetRoutes } from './SelectAssetCommon'

type SelectAccountProps = {
  onClick: (asset: Asset, accountId: AccountSpecifier) => void
}

type SelectAccountLocation = {
  assetId: AssetId
}

export const SelectAccount = ({ onClick }: SelectAccountProps) => {
  const location = useLocation<SelectAccountLocation>()
  const translate = useTranslate()
  const history = useHistory()
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: location.state.assetId }),
  )
  const asset = useAppSelector(state => selectAssetById(state, location.state.assetId))
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
              assetId={asset.assetId}
              key={accountId}
              isCompact
              onClick={() => onClick(asset, accountId)}
            />
          ))}
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}
