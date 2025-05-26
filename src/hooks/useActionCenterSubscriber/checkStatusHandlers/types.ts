import type { CreateToastFnReturn } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'

export type CheckStatusHandlerProps = {
  toast: CreateToastFnReturn
  swap: Swap
  translate: any
}

export type CheckStatusHandler = ({ toast }: CheckStatusHandlerProps) => Promise<boolean>
