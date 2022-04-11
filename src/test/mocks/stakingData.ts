import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import {
  MergedActiveStakingOpportunity,
  MergedStakingOpportunity,
} from 'pages/Defi/hooks/useCosmosStakingBalances'
import { Staking } from 'state/slices/stakingDataSlice/stakingDataSlice'

export const mockStakingData: Staking = {
  delegations: [
    {
      amount: '4',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        tokens: '111115',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
    },
    {
      amount: '10015',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      amount: '5000',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
        tokens: '111117',
        apr: '0.1514974265',
        commission: '0.089000000000000000',
        moniker: 'Cosmostation',
      },
    },
  ],
  redelegations: [
    {
      destinationValidator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        tokens: '111115',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
      entries: [
        { amount: '4', assetId: 'cosmos:cosmoshub-4/slip44:118', completionTime: 1650470407 },
      ],
      sourceValidator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
  rewards: [
    {
      rewards: [],
      validator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        tokens: '111115',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
    },
    {
      rewards: [
        {
          amount: '3.831752143667562385',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      rewards: [
        {
          amount: '12.688084635379675000',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
        tokens: '111117',
        apr: '0.1514974265',
        commission: '0.089000000000000000',
        moniker: 'Cosmostation',
      },
    },
  ],
  undelegations: [
    {
      entries: [
        {
          amount: '100',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472940,
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
}

export const mockStakingDataWithOnlyUndelegations: Staking = {
  delegations: [],
  redelegations: [],
  rewards: [],
  undelegations: [
    {
      entries: [
        {
          amount: '100',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472940,
        },
        {
          amount: '250',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472941,
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
}

export const mockStakingDataWithOnlyRewards: Staking = {
  delegations: [],
  redelegations: [],
  rewards: [
    {
      rewards: [],
      validator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        tokens: '111115',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
    },
    {
      rewards: [
        {
          amount: '3.831752143667562385',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
        {
          amount: '1',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      rewards: [
        {
          amount: '12.688084635379675000',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
        tokens: '111117',
        apr: '0.1514974265',
        commission: '0.089000000000000000',
        moniker: 'Cosmostation',
      },
    },
  ],
  undelegations: [],
}

export const mockStakingWithUnknownValidators: Staking = {
  delegations: [
    {
      amount: '4',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
        tokens: '11111',
        apr: '0.1494726623',
        commission: '0.050000000000000000',
        moniker: 'terraform_staging_03',
      },
    },
    {
      amount: '10015',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      amount: '5000',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1yvwqd5rdtuaw25mcqhz794dvgq9k9yeh8mjcdh',
        tokens: '11112',
        apr: '0.1447524729',
        commission: '0.080000000000000000',
        moniker: 'ys-validator',
      },
    },
  ],
  redelegations: [
    {
      destinationValidator: {
        address: 'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
        tokens: '11111',
        apr: '0.1494726623',
        commission: '0.050000000000000000',
        moniker: 'terraform_staging_03',
      },
      entries: [
        { amount: '4', assetId: 'cosmos:cosmoshub-4/slip44:118', completionTime: 1650470407 },
      ],
      sourceValidator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
  rewards: [
    {
      rewards: [],
      validator: {
        address: 'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
        tokens: '11111',
        apr: '0.1494726623',
        commission: '0.050000000000000000',
        moniker: 'terraform_staging_03',
      },
    },
    {
      rewards: [
        {
          amount: '3.831752143667562385',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      rewards: [
        {
          amount: '12.688084635379675000',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper1yvwqd5rdtuaw25mcqhz794dvgq9k9yeh8mjcdh',
        tokens: '11112',
        apr: '0.1447524729',
        commission: '0.080000000000000000',
        moniker: 'ys-validator',
      },
    },
  ],
  undelegations: [
    {
      entries: [
        {
          amount: '100',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472940,
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        tokens: '111116',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
}

export const emptyMockStakingData: Staking = {
  delegations: [],
  redelegations: [],
  rewards: [],
  undelegations: [],
}

export const mockValidatorData: chainAdapters.cosmos.Validator[] = [
  {
    address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
    tokens: '111115',
    apr: '0.1662979435',
    commission: '0.000000000000000000',
    moniker: 'tokenpocket',
  },
  {
    address: 'cosmosvaloper1qdxmyqkvt8jsxpn5pp45a38ngs36mn2604cqk9',
    tokens: '11113',
    apr: '0.1496681491',
    commission: '0.100000000000000000',
    moniker: '真本聪&IOSG',
  },
  {
    address: 'cosmosvaloper1q6d3d089hg59x6gcx92uumx70s5y5wadklue8s',
    tokens: '11114',
    apr: '0.1662979435',
    commission: '0.000000000000000000',
    moniker: 'UbikCapital(0%Commission)',
  },
  {
    address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
    tokens: '111116',
    apr: '0.1496681491',
    commission: '0.100000000000000000',
    moniker: 'ShapeShift DAO',
  },
  {
    address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
    tokens: '111117',
    apr: '0.1514974265',
    commission: '0.089000000000000000',
    moniker: 'Cosmostation',
  },
  {
    address: 'cosmosvaloper1gf3dm2mvqhymts6ksrstlyuu2m8pw6dhfp9md2',
    tokens: '11115',
    apr: '0.1496681491',
    commission: '0.100000000000000000',
    moniker: 'Blockapsis',
  },
  {
    address: 'cosmosvaloper1fqzqejwkk898fcslw4z4eeqjzesynvrdfr5hte',
    tokens: '11116',
    apr: '0.1513311286',
    commission: '0.090000000000000000',
    moniker: 'commercio.network',
  },
]

export const mockCosmosActiveStakingOpportunities: MergedActiveStakingOpportunity[] = [
  {
    address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
    apr: '0.158177284',
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    chain: ChainTypes.Cosmos,
    cryptoAmount: '0.000004',
    fiatAmount: '0.00',
    moniker: 'tokenpocket',
    rewards: '0',
    tokenAddress: '118',
    tokens: '892742165',
    tvl: '22345.33638995',
  },
  {
    address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
    apr: '0.1423595556',
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    chain: ChainTypes.Cosmos,
    cryptoAmount: '0.010115',
    fiatAmount: '0.25',
    moniker: 'ShapeShift DAO',
    rewards: '24.51234664612960265',
    tokenAddress: '118',
    tokens: '1205173215485',
    tvl: '30165485.58358955',
  },
  {
    address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
    apr: '0.1440995057',
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    chain: ChainTypes.Cosmos,
    cryptoAmount: '0.005',
    fiatAmount: '0.13',
    moniker: 'Cosmostation',
    rewards: '23.13725890339719',
    tokenAddress: '118',
    tokens: '3876071630085',
    tvl: '97018072.90102755',
  },
]

export const mockCosmosStakingOpportunities: MergedStakingOpportunity[] = [
  {
    address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
    apr: '0.1423595556',
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    chain: ChainTypes.Cosmos,
    commission: '0.100000000000000000',
    moniker: 'ShapeShift DAO',
    tokenAddress: '118',
    tokens: '1205173215485',
    tvl: '30165485.58358955',
  },
  {
    address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxg',
    apr: '0.1423595557',
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    chain: ChainTypes.Cosmos,
    commission: '0.110000000000000000',
    moniker: 'ShapeShift DAO 2',
    tokenAddress: '118',
    tokens: '1205173215486',
    tvl: '30165486.58358955',
  },
]
