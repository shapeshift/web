import type { StackProps } from '@chakra-ui/react'
import { Flex, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { PropsWithChildren } from 'react'
import { Fragment } from 'react'
import { FaArrowRight } from 'react-icons/fa'

import { PairIcons } from '../PairIcons/PairIcons'

import { AssetIcon } from '@/components/AssetIcon'

type EmptyOverviewProps = {
  assets: Asset[]
  footer?: React.ReactNode
  stackProps?: StackProps
} & PropsWithChildren

const flexMinWidth = { base: '100%', xl: '500px' }

const divider = (
  <Flex px={4} border={0}>
    <FaArrowRight />
  </Flex>
)

export const EmptyOverview: React.FC<EmptyOverviewProps> = ({
  children,
  footer,
  assets,
  stackProps,
}) => {
  if (assets.length === 0) return null
  return (
    <Flex width='full' minWidth={flexMinWidth} maxWidth='fit-content' flexDir='column'>
      <ModalBody textAlign='center'>
        <Stack py={8} {...stackProps}>
          <Stack direction='row' justifyContent='center' alignItems='center' divider={divider}>
            {assets.map((asset, index) => (
              <Fragment key={index}>
                {asset.icons ? (
                  <PairIcons icons={asset.icons} bg='transparent' />
                ) : (
                  <AssetIcon src={asset.icon} />
                )}
              </Fragment>
            ))}
          </Stack>
          <Stack justifyContent='center' fontWeight='medium' mb={4}>
            {children}
          </Stack>
        </Stack>
      </ModalBody>
      {footer && <ModalFooter>{footer}</ModalFooter>}
    </Flex>
  )
}
