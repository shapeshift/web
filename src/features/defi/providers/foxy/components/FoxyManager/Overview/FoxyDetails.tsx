import { Flex, ModalBody, ModalFooter, Stack, Tag } from '@chakra-ui/react'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'

import { WithdrawCard } from './WithdrawCard'

type FoxyDetailsProps = {
  api: FoxyApi
  contractAddress: string
  asset: Asset
  rewardAsset: Asset
}

export const FoxyDetails = ({ api, contractAddress, asset, rewardAsset }: FoxyDetailsProps) => {
  const { opportunities } = useFoxyBalances()
  const opportunity = opportunities.find(e => e.contractAddress === contractAddress)
  const apy = bnOrZero(opportunity?.apy).times(100).toString()
  if (!opportunity) return null
  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      maxWidth='fit-content'
      flexDir='column'
    >
      <ModalBody>
        <Stack alignItems='center' justifyContent='center' py={8}>
          <Text color='gray.500' translation='defi.modals.foxyOverview.foxyBalance' />
          <Stack direction='row' alignItems='center' justifyContent='center'>
            <AssetIcon boxSize='10' src={rewardAsset.icon} />
            <Amount.Crypto
              fontSize='3xl'
              fontWeight='medium'
              value={opportunity?.cryptoAmount}
              symbol={rewardAsset?.symbol}
            />
          </Stack>
          <Tag colorScheme='green'>{apy}% APR</Tag>
        </Stack>
      </ModalBody>
      <ModalFooter justifyContent='flex-start' alignItems='flex-start' flexDir='column'>
        <Stack width='full'>
          <Text fontWeight='medium' translation='defi.modals.foxyOverview.withdrawals' />
          <WithdrawCard asset={asset} {...opportunity.withdrawInfo} />
        </Stack>
      </ModalFooter>
    </Flex>
  )
}
