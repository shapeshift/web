import type { RadioProps, TextProps } from '@chakra-ui/react'
import { Box, Flex, HStack, Skeleton, Tooltip, useRadio, useRadioGroup } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import React, { useCallback, useEffect, useMemo } from 'react'
import { BiSolidBoltCircle, BiSolidPlusCircle, BiSolidXCircle } from 'react-icons/bi'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetSymbol } from 'components/AssetSymbol'
import { RawText } from 'components/Text'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { fromOpportunityId } from '../utils'
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
    <Box width='33.33%' flex={1} cursor='pointer' as='label'>
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

type PositionAmounts = {
  underlyingAssetAmountCryptoPrecision: string
  underlyingRuneAmountCryptoPrecision: string
}

export type AmountsByPosition = Record<AsymSide | 'sym', PositionAmounts>

type LpTypeProps = {
  assetId: AssetId
  onAsymSideChange: (asymSide: string | null) => void
  opportunityId: string
} & (
  | {
      isWithdraw: boolean
      isDeposit?: never
      hasAsymRunePosition?: never
      hasAsymAssetPosition?: never
      hasSymPosition?: never
      amountsByPosition?: never
    }
  | {
      isWithdraw?: never
      isDeposit?: boolean
      hasAsymRunePosition?: boolean
      hasAsymAssetPosition?: boolean
      hasSymPosition?: boolean
      amountsByPosition?: AmountsByPosition
    }
)

type PositionBalances = {
  text: string | JSX.Element
  icon?: JSX.Element
  props?: TextProps
  tooltipText?: string
} | null

export const LpType = ({
  assetId,
  opportunityId,
  isWithdraw,
  isDeposit,
  hasAsymAssetPosition,
  hasAsymRunePosition,
  hasSymPosition,
  amountsByPosition,
  onAsymSideChange,
}: LpTypeProps) => {
  const translate = useTranslate()
  const CircleCrossIcon = useCallback(() => <Box as={BiSolidPlusCircle} w='14px' h='14px' />, [])
  const CircleXIcon = useCallback(() => <Box as={BiSolidXCircle} w='14px' h='14px' />, [])
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const thorchainAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const makeAssetIdsOption = useCallback(
    (value: AsymSide | 'sym'): AssetId[] => {
      switch (value) {
        case AsymSide.Rune:
          return [thorchainAssetId]
        case AsymSide.Asset:
          return [assetId]
        case 'sym':
          return [assetId, thorchainAssetId]
        default:
          return value satisfies never
      }
    },
    [assetId],
  )

  const { opportunityType } = fromOpportunityId(opportunityId)

  const isRunePositionType = useMemo(() => opportunityType === AsymSide.Rune, [opportunityType])
  const isAssetPositionType = useMemo(() => opportunityType === AsymSide.Asset, [opportunityType])
  const isSymPositionType = useMemo(() => opportunityType === 'sym', [opportunityType])

  const { getRootProps, getRadioProps, setValue } = useRadioGroup({
    name: 'depositType',
    defaultValue: opportunityType,
    onChange: onAsymSideChange,
  })

  useEffect(() => {
    if (!opportunityId) return
    setValue(fromOpportunityId(opportunityId).opportunityType)
  }, [opportunityId, setValue])

  const subtitleStyle = useMemo(() => {
    return {
      '& svg': {
        display: 'inline-block',
        verticalAlign: 'middle',
      },
    }
  }, [])

  const balancesByPosition = useMemo(() => {
    const displayAmounts = (position: AsymSide | 'sym') => ({
      text: amountsByPosition?.[position] ? (
        <>
          <Amount.Crypto
            value={amountsByPosition?.[position].underlyingAssetAmountCryptoPrecision}
            symbol={asset?.symbol ?? ''}
            maximumFractionDigits={6}
          />
          <Amount.Crypto
            value={amountsByPosition?.[position].underlyingRuneAmountCryptoPrecision}
            symbol={thorchainAsset?.symbol ?? ''}
            maximumFractionDigits={6}
          />
        </>
      ) : (
        <>
          <Skeleton mb={1} height='14px' width='100%' />
          <Skeleton height='14px' width='100%' />
        </>
      ),
      props: {
        mt: !amountsByPosition?.[position] ? 2 : 1,
      },
    })

    const newPosition = {
      text: translate('pools.newPosition'),
      icon: <CircleCrossIcon />,
      tooltipText: translate('pools.newPositionTooltip'),
    }
    const notSupported = {
      text: translate('pools.notSupported'),
      icon: <CircleXIcon />,
      props: { color: 'text.error' },
      tooltipText: translate('pools.notSupportedTooltip'),
    }

    const runeBalances: PositionBalances = (() => {
      if (hasSymPosition) return displayAmounts('sym')
      if (hasAsymRunePosition) return displayAmounts(AsymSide.Rune)
      return newPosition
    })()

    const assetBalances: PositionBalances = (() => {
      return hasAsymAssetPosition ? displayAmounts(AsymSide.Asset) : newPosition
    })()

    const symBalances: PositionBalances = (() => {
      if (hasAsymRunePosition) return notSupported
      if (hasSymPosition) return displayAmounts('sym')
      return newPosition
    })()

    return {
      [AsymSide.Rune]: runeBalances,
      [AsymSide.Asset]: assetBalances,
      sym: symBalances,
    }
  }, [
    CircleCrossIcon,
    CircleXIcon,
    hasAsymAssetPosition,
    hasSymPosition,
    hasAsymRunePosition,
    asset,
    thorchainAsset,
    translate,
    amountsByPosition,
  ])

  const radioOptions = useMemo(() => {
    return options.map((option, index) => {
      const radio = getRadioProps({ value: option.value })
      const optionAssetIds = makeAssetIdsOption(option.value as AsymSide | 'sym')
      const currentSideBalances = balancesByPosition?.[option.value as AsymSide | 'sym']

      const isDisabled = (() => {
        if (isDeposit && hasAsymRunePosition && option.value === 'sym') return true
        if (!isWithdraw) return false

        if (isSymPositionType) return false
        if (isRunePositionType) return option.value !== AsymSide.Rune
        if (isAssetPositionType) return option.value !== AsymSide.Asset

        return false
      })()

      return (
        <TypeRadio key={`type-${index}`} {...radio} isDisabled={isDisabled}>
          <Tooltip
            isDisabled={
              (!isDisabled && !isDeposit) || (isDeposit && !currentSideBalances.tooltipText)
            }
            label={translate(
              isDeposit && currentSideBalances.tooltipText
                ? currentSideBalances.tooltipText
                : 'pools.withdrawTypeNotAvailable',
            )}
          >
            <Box>
              <PoolIcon assetIds={optionAssetIds} size='xs' />
              <Flex mt={4} fontSize='sm' justifyContent='space-between' alignItems='center'>
                <TypeLabel assetIds={optionAssetIds} />
                {optionAssetIds.length === 1 && (
                  <Box as='span' color='text.subtlest' fontSize='md' className='asym-icon'>
                    <BiSolidBoltCircle />
                  </Box>
                )}
              </Flex>
              {isDeposit ? (
                <Box
                  color='text.subtle'
                  fontSize='xs'
                  sx={subtitleStyle}
                  mt={6}
                  {...currentSideBalances?.props}
                >
                  {currentSideBalances ? currentSideBalances.text : null}{' '}
                  {currentSideBalances ? currentSideBalances.icon : null}
                </Box>
              ) : null}
            </Box>
          </Tooltip>
        </TypeRadio>
      )
    })
  }, [
    getRadioProps,
    makeAssetIdsOption,
    translate,
    isWithdraw,
    isSymPositionType,
    isRunePositionType,
    isAssetPositionType,
    isDeposit,
    balancesByPosition,
    subtitleStyle,
    hasAsymRunePosition,
  ])

  const group = getRootProps()
  return (
    <Flex px={4} gap={2} {...group}>
      {radioOptions}
    </Flex>
  )
}
