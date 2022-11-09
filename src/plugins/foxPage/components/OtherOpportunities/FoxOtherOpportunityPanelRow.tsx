import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/layout'
import { Button, Link, Skeleton, Text as CText, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { LpId, StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectAggregatedEarnUserStakingOpportunity,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ExternalOpportunity } from '../../FoxCommon'

type FoxOtherOpportunityPanelRowProps = {
  opportunity: ExternalOpportunity
}

export const FoxOtherOpportunityPanelRow: React.FC<FoxOtherOpportunityPanelRowProps> = ({
  opportunity,
}) => {
  const {
    state: { isDemoWallet, wallet },
    dispatch,
  } = useWallet()
  const opportunityId = useMemo(
    () =>
      opportunity.opportunityContractAddress &&
      (toAssetId({
        assetReference: opportunity.opportunityContractAddress,
        assetNamespace: 'erc20',
        chainId: ethChainId,
      }) as LpId | StakingId),
    [opportunity.opportunityContractAddress],
  )

  const earnOpportunity = useAppSelector(state =>
    opportunity.type === DefiType.LiquidityPool
      ? selectAggregatedEarnUserLpOpportunity(state, {
          assetId: opportunityId as AssetId,
          lpId: opportunityId as LpId | undefined,
        })
      : selectAggregatedEarnUserStakingOpportunity(state),
  )

  const hoverOpportunityBg = useColorModeValue('gray.100', 'gray.750')
  const hasActivePosition = bnOrZero(earnOpportunity?.cryptoAmount).gt(0) ?? false
  const history = useHistory()
  const location = useLocation()
  const wrapperLinkProps = useMemo(
    () => (earnOpportunity ? {} : { as: Link, isExternal: true, href: opportunity.link }),
    [earnOpportunity, opportunity.link],
  )

  const handleClick = useCallback(() => {
    if (opportunity.link) {
      window.open(opportunity.link)
      return
    }

    if (isDemoWallet || !wallet || !supportsETH(wallet)) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }

    if (earnOpportunity) {
      const { provider, chainId, contractAddress, assetId, rewardAddress } = earnOpportunity
      const { assetReference } = fromAssetId(assetId)
      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          provider,
          chainId,
          contractAddress,
          assetReference,
          highestBalanceAccountAddress: opportunity.highestBalanceAccountAddress,
          rewardId: rewardAddress,
          modal: 'overview',
        }),
        state: { background: location },
      })
      return
    }
  }, [
    opportunity.highestBalanceAccountAddress,
    isDemoWallet,
    earnOpportunity,
    dispatch,
    history,
    location,
    opportunity.link,
    wallet,
  ])

  const opportunityButtonTranslation = useMemo(() => {
    if (opportunity.link) return 'plugins.foxPage.getStarted'
    if (isDemoWallet || !wallet || !supportsETH(wallet)) return 'common.connectWallet'

    return hasActivePosition ? 'plugins.foxPage.manage' : 'plugins.foxPage.getStarted'
  }, [isDemoWallet, opportunity.link, hasActivePosition, wallet])

  const isOpportunityButtonReady = useMemo(
    () => Boolean(isDemoWallet || (wallet && !supportsETH(wallet)) || earnOpportunity),
    [isDemoWallet, wallet, earnOpportunity],
  )

  return (
    <Flex
      justifyContent='space-between'
      flexDirection='row'
      _hover={{ bg: hoverOpportunityBg, textDecoration: 'none' }}
      px={4}
      py={4}
      borderRadius={8}
      onClick={handleClick}
      cursor='pointer'
      {...wrapperLinkProps}
    >
      <Flex flexDirection='row' alignItems='center' width={{ base: 'auto', md: '40%' }}>
        {opportunity.icons.map((iconSrc, i) => (
          <AssetIcon
            key={iconSrc}
            src={iconSrc}
            boxSize={{ base: 6, md: 8 }}
            mr={i === opportunity.icons.length - 1 ? 2 : 0}
            ml={i === 0 ? 0 : '-3.5'}
          />
        ))}
        <CText color='inherit' fontWeight='semibold'>
          {opportunity.title}
        </CText>
      </Flex>
      <Skeleton isLoaded={Boolean(earnOpportunity)} textAlign={{ base: 'right', md: 'center' }}>
        <Box>
          <Text translation='plugins.foxPage.currentApy' color='gray.500' mb={1} />
          <Box
            color={opportunity.apy ? 'green.400' : undefined}
            fontSize={'xl'}
            fontWeight='semibold'
            lineHeight='1'
          >
            {opportunity.apy ? <Amount.Percent value={opportunity.apy} /> : '--'}
          </Box>
        </Box>
      </Skeleton>
      <Box alignSelf='center' display={{ base: 'none', md: 'block' }}>
        <Skeleton isLoaded={isOpportunityButtonReady} textAlign='center'>
          {earnOpportunity ? (
            <Button colorScheme='blue' onClick={handleClick}>
              <Text translation={opportunityButtonTranslation} />
            </Button>
          ) : (
            <Button variant='link' colorScheme='blue' onClick={handleClick}>
              <Text translation={opportunityButtonTranslation} mr={2} />
              <ExternalLinkIcon />
            </Button>
          )}
        </Skeleton>
      </Box>
    </Flex>
  )
}
