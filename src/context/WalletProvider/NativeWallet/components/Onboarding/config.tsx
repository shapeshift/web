import { EasyToUse } from './components/EasyToUse'
import { MultiChain } from './components/MultiChain'
import { SelfCustody } from './components/SelfCustody'

export const OnboardingRoutes = [
  { path: '/self-custody', component: SelfCustody },
  { path: '/multi-chain', component: MultiChain },
  { path: '/easy-to-use', component: EasyToUse },
]
