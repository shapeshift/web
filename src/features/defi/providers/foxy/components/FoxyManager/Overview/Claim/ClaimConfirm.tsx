import { ModalBody, Stack } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'

type ClaimConfirmProps = {
  asset: Asset
  amount: string
}

export const ClaimConfirm = ({ asset, amount }: ClaimConfirmProps) => {
  return (
    <ModalBody>
      <Stack alignItems='center' justifyContent='center' py={8}>
        <Text color='gray.500' translation='defi.modals.claim.claimAmount' />
        <Stack direction='row' alignItems='center' justifyContent='center'>
          <AssetIcon boxSize='10' src={asset.icon} />
          <Amount.Crypto fontSize='3xl' fontWeight='medium' value={amount} symbol={asset?.symbol} />
        </Stack>
      </Stack>
    </ModalBody>
  )
}
