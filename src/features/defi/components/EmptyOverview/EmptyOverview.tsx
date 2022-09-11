import { Flex, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { Fragment } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { AssetIcon } from 'components/AssetIcon'

import { PairIcons } from '../PairIcons/PairIcons'

export type EmptyOverviewAsset =
  | {
      icon: string
      icons?: never
    }
  | {
      icon?: never
      icons: string[]
    }

type EmptyOverviewProps = {
  assets: EmptyOverviewAsset[]
  footer?: React.ReactNode
} & PropsWithChildren

export const EmptyOverview: React.FC<EmptyOverviewProps> = ({ children, footer, assets }) => {
  if (assets.length === 0) return null
  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      maxWidth='fit-content'
      flexDir='column'
    >
      <ModalBody textAlign='center'>
        <Stack py={8}>
          <Stack
            direction='row'
            justifyContent='center'
            alignItems='center'
            divider={
              <Flex px={4} border={0}>
                <FaArrowRight />
              </Flex>
            }
          >
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
