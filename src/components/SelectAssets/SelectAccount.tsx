import { ModalBody, ModalCloseButton, ModalHeader, Stack, Text } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { selectAccountIdsByAssetId } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

type SelectAccountProps = {
  onClick: (asset: any) => void
}

type SelectAccountLocation = {
  assetId: CAIP19
}

export const SelectAccount = ({ onClick }: SelectAccountProps) => {
  const location = useLocation<SelectAccountLocation>()
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, location.state.assetId)
  )
  return (
    <SlideTransition>
      <ModalCloseButton />
      <ModalHeader textAlign='center'>Select an Account {location.state.assetId} </ModalHeader>
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
