import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, ModalBody, ModalCloseButton, ModalHeader, Stack, Text } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { selectAccountIdsByAssetId } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { SelectAssetRoutes } from './SelectAssetRouter'

type SelectAccountProps = {
  onClick: (asset: any) => void
}

type SelectAccountLocation = {
  assetId: CAIP19
}

export const SelectAccount = ({ onClick, ...rest }: SelectAccountProps) => {
  const location = useLocation<SelectAccountLocation>()
  const translate = useTranslate()
  const history = useHistory()
  console.info('selectAccountID', location)
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, location.state.assetId)
  )
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
            <Text key={accountId}>{accountId}</Text>
          ))}
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}
