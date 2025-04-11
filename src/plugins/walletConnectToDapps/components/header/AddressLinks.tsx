import { AvatarGroup, Flex, Grid, HStack, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { AssetIcon } from '@/components/AssetIcon'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Text } from '@/components/Text'
import { accountIdToFeeAssetId } from '@/lib/utils/accounts'

type AddressAndChainProps = {
  accountIds: string[]
}

type AddressWithNetworksProps = {
  address: string
  chainIds: AssetId[]
}

const AddressWithNetworks = ({ address, chainIds }: AddressWithNetworksProps) => {
  const avatarGroupBackground = useColorModeValue('gray.200', 'gray.500')

  const avatarGroupSx = useMemo(() => {
    return {
      '& .chakra-avatar__excess': {
        zIndex: chainIds.length,
        background: avatarGroupBackground,
      },
    }
  }, [chainIds, avatarGroupBackground])

  return (
    <Grid gap='2' gridTemplateColumns='1fr 1fr'>
      <Flex minWidth='72px' justifyContent='flex-start'>
        <AvatarGroup size='xs' max={3} sx={avatarGroupSx}>
          {chainIds.map((chainId, i) => (
            <AssetIcon key={chainId} assetId={chainId} zIndex={i} showNetworkIcon />
          ))}
        </AvatarGroup>
      </Flex>
      <InlineCopyButton value={address}>
        <MiddleEllipsis value={address} />
      </InlineCopyButton>
    </Grid>
  )
}

export const AddressLinks: React.FC<AddressAndChainProps> = ({ accountIds }) => {
  // A list of addresses with their associated ChainId
  // This allows us to only display a single row per many ChainIds, if an address exists over multiple ones
  const addressesWithChainIdsSorted = useMemo(() => {
    const chainIdsByAddress = accountIds.reduce<Record<string, AssetId[]>>((acc, accountId) => {
      const feeAssetId = accountIdToFeeAssetId(accountId)
      if (!feeAssetId) return acc

      const { account: address } = fromAccountId(accountId)

      if (!acc[address]) {
        acc[address] = [feeAssetId]
        return acc
      }

      acc[address].push(feeAssetId)

      return acc
    }, {})

    return Object.entries(chainIdsByAddress).map(([address, chainIds]) => ({
      address,
      chainIds,
    }))
  }, [accountIds])

  const addressLabel = useMemo(() => {
    return addressesWithChainIdsSorted.length > 1
      ? 'plugins.walletConnectToDapps.header.menu.addresses'
      : 'plugins.walletConnectToDapps.header.menu.address'
  }, [addressesWithChainIdsSorted.length])

  return (
    <HStack justifyContent='space-between' spacing={4} alignItems='flex-start'>
      <Text translation={addressLabel} color='text.subtle' />
      <Stack alignItems='center' justifyContent='flex-end' flexWrap='wrap'>
        {addressesWithChainIdsSorted.map((props, i) => (
          <AddressWithNetworks key={i} {...props} />
        ))}
      </Stack>
    </HStack>
  )
}
