import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/layout'
import { Button, Link, ResponsiveValue, Skeleton, Text as CText } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import type { Property } from 'csstype'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useDefiOpportunity } from 'plugins/foxPage/hooks/useDefiOpportunity'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'

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
  const { defiOpportunity } = useDefiOpportunity(opportunity)
  const hasActivePosition = bnOrZero(defiOpportunity?.fiatAmount).gt(0) ?? false
  const history = useHistory()
  const location = useLocation()
  const wrapperLinkProps = useMemo(
    () => (defiOpportunity ? {} : { as: Link, isExternal: true, href: opportunity.link }),
    [defiOpportunity, opportunity.link],
  )

  const opportunityIconsContainerWidth = useMemo(() => ({ base: 'auto', md: '40%' }), [])
  const opportunityCtaContainerDisplay = useMemo(() => ({ base: 'none', md: 'block' }), [])
  const assetIconBoxSize = useMemo(() => ({ base: 6, md: 8 }), [])
  const apyContainerTextAlign: ResponsiveValue<Property.TextAlign> = useMemo(
    () => ({ base: 'right', md: 'center' }),
    [],
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

    if (defiOpportunity) {
      const { provider, chainId, contractAddress, assetId, rewardAddress } = defiOpportunity
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
    defiOpportunity,
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
    () => Boolean(isDemoWallet || (wallet && !supportsETH(wallet)) || defiOpportunity?.isLoaded),
    [isDemoWallet, wallet, defiOpportunity],
  )

  return (
    <Flex
      justifyContent='space-between'
      flexDirection='row'
      px={4}
      py={4}
      borderRadius={8}
      onClick={handleClick}
      cursor='pointer'
      {...wrapperLinkProps}
    >
      <Flex flexDirection='row' alignItems='center' width={opportunityIconsContainerWidth}>
        {opportunity.icons.map((iconSrc, i) => (
          <AssetIcon
            key={iconSrc}
            src={iconSrc}
            boxSize={assetIconBoxSize}
            mr={i === opportunity.icons.length - 1 ? 2 : 0}
            ml={i === 0 ? 0 : '-3.5'}
          />
        ))}
        <CText color='inherit' fontWeight='semibold'>
          {opportunity.title}
        </CText>
      </Flex>
      <Skeleton isLoaded={opportunity.isLoaded ? true : false} textAlign={apyContainerTextAlign}>
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
      <Box alignSelf='center' display={opportunityCtaContainerDisplay}>
        <Skeleton isLoaded={isOpportunityButtonReady} textAlign='center'>
          {defiOpportunity ? (
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
