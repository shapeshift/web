import type { RadioProps } from '@chakra-ui/react'
import { Box, Flex, HStack, useRadio, useRadioGroup } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import React, { useCallback, useEffect, useMemo } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { AssetSymbol } from 'components/AssetSymbol'
import { RawText } from 'components/Text'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { AsymSide } from 'lib/utils/thorchain/lp/types'

import { PoolIcon } from './PoolIcon'

const checked = {
  bg: 'background.surface.raised.pressed',
  borderColor: 'border.focused',
  '.asym-icon': {
    color: 'text.info',
  },
}
const hover = {
  borderColor: 'border.hover',
}

const disabled = {
  opacity: 0.4,
  cursor: 'not-allowed',
}

const TypeLabel: React.FC<{ assetIds: AssetId[] }> = ({ assetIds }) => {
  const divider = useMemo(() => <RawText>+</RawText>, [])
  const labels = useMemo(() => {
    return assetIds.map(assetId => {
      return <AssetSymbol key={assetId} assetId={assetId} />
    })
  }, [assetIds])
  return (
    <HStack divider={divider} fontWeight='medium' fontSize='xs'>
      {labels}
    </HStack>
  )
}

const TypeRadio: React.FC<RadioProps> = props => {
  const { getInputProps, getRadioProps } = useRadio(props)
  const input = getInputProps()
  const checkbox = getRadioProps()
  return (
    <Box flex={1} cursor='pointer' as='label'>
      <input {...input} />
      <Box
        bg='background.surface.raised.base'
        borderRadius='xl'
        width='full'
        borderWidth={2}
        borderColor='transparent'
        p={4}
        transitionProperty='common'
        transitionDuration='normal'
        _hover={hover}
        _checked={checked}
        _disabled={disabled}
        {...checkbox}
      >
        {props.children}
      </Box>
    </Box>
  )
}

const options = [
  {
    value: AsymSide.Asset,
  },
  {
    value: 'sym',
  },
  {
    value: AsymSide.Rune,
  },
]

type DepositTypeProps = {
  assetId: AssetId
  onAsymSideChange: (asymSide: string | null) => void
  defaultOpportunityId?: string
}
export const LpType = ({ assetId, defaultOpportunityId, onAsymSideChange }: DepositTypeProps) => {
  const wallet = useWallet().state.wallet
  const isSnapInstalled = useIsSnapInstalled()

  const assetIds = useMemo(() => {
    return [assetId, thorchainAssetId]
  }, [assetId])

  const makeAssetIdsOption = useCallback(
    (value: AsymSide | 'sym'): AssetId[] => {
      if (value === 'sym') return assetIds
      if (value === AsymSide.Rune) return [thorchainAssetId]
      if (value === AsymSide.Asset) return [assetId]

      throw new Error(`Invalid value ${value}`)
    },
    [assetId, assetIds],
  )

  const defaultValue = useMemo(() => {
    const walletSupportsRune = walletSupportsChain({
      chainId: thorchainChainId,
      wallet,
      isSnapInstalled,
    })
    const walletSupportsAsset = walletSupportsChain({
      chainId: fromAssetId(assetId).chainId,
      wallet,
      isSnapInstalled,
    })

    if (walletSupportsRune && walletSupportsAsset) return 'sym'
    if (walletSupportsAsset) return AsymSide.Asset
    if (walletSupportsRune) return AsymSide.Rune
  }, [assetId, isSnapInstalled, wallet])

  const { getRootProps, getRadioProps, setValue } = useRadioGroup({
    name: 'depositType',
    defaultValue,
    onChange: onAsymSideChange,
  })

  useEffect(() => {
    if (!defaultValue) {
      // We've switched to an asset for which none of the a/sym types are supported, make sure the previously selected value is cleared
      setValue('')
      return
    }

    // Reset the radio state to default pool type on assetId change, meaning pool change
    // This is to ensure the radio is synchronized with the actual default sym pool being selected on pool change
    setValue('sym')
  }, [assetId, defaultValue, setValue])

  const radioOptions = useMemo(() => {
    const _options = defaultOpportunityId ? options : []

    return _options.map((option, index) => {
      const radio = getRadioProps({ value: option.value })

      const optionAssetIds = makeAssetIdsOption(option.value as AsymSide | 'sym')
      const walletSupportsOption = optionAssetIds.every(assetId => {
        const { chainId } = fromAssetId(assetId)
        return walletSupportsChain({ chainId, wallet, isSnapInstalled })
      })

      const isDisabled = !walletSupportsOption
      return (
        <TypeRadio key={`type-${index}`} {...radio} isDisabled={isDisabled}>
          <PoolIcon assetIds={optionAssetIds} size='xs' />
          <Flex mt={4} fontSize='sm' justifyContent='space-between' alignItems='center'>
            <TypeLabel assetIds={optionAssetIds} />
            {optionAssetIds.length === 1 && (
              <Box as='span' color='text.subtlest' fontSize='md' className='asym-icon'>
                <BiSolidBoltCircle />
              </Box>
            )}
          </Flex>
        </TypeRadio>
      )
    })
  }, [defaultOpportunityId, getRadioProps, isSnapInstalled, makeAssetIdsOption, wallet])

  const group = getRootProps()
  return (
    <Flex px={4} gap={2} {...group}>
      {radioOptions}
    </Flex>
  )
}
