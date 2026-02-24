import { createActorContext } from '@xstate/react'

import { collateralMachine } from './collateralMachine'

export const CollateralMachineCtx = createActorContext(collateralMachine)
