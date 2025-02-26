import type { utxo } from '@shapeshiftoss/unchained-client'

const account: utxo.bitcoin.Account = {
  pubkey: 'testKey',
  balance: '0',
  unconfirmedBalance: '0',
  addresses: [
    {
      balance: '0',
      pubkey: 'bc1qzwqpxvfyl539ll8nw56xy9jn3flpx53nnm5zyw',
    },
  ],
  nextReceiveAddressIndex: 2,
  nextChangeAddressIndex: 3,
}

const txHistory = {
  pubkey: 'testKey',
  txs: [
    {
      txid: 'aa404a0d1f2bfb3335fa6a54f276f872c1344ad65a48d35464853e65e6c9f5c0',
      blockHash: '00000000000000000000b06530b072d2076b34575d45bcea4612dd11f0b89dfa',
      blockHeight: 825506,
      timestamp: 1705084793,
      confirmations: 15,
      value: '1863176',
      fee: '45705',
      hex: '0100000000010302940a38383a598a9c6b4c3566647d3d192a59e466e8ccfb205213e15731e67c0100000000ffffffff39c8e5f248472a5c8de86a34772731506d3f430723cd053cf613e3a96acf489a0100000000ffffffffb4a2702c4b87cec4a77220eed20a44735df4f4042960d14f860559d40a665eb00100000000ffffffff02e31e1c00000000001600141380133124fd225ffcf375346216538a7e135233254f000000000000160014a76eef1cedb0c1fe5bae9936c084ac17940df1fe0247304402205639e6b2533680ee55d204b06e3e396edcb70671448e896e7d711d4970195acf022031c72b63924413be81e8dc59617048d6f2fb9aaaaf514401d8f6b13e2616d7ea01210354d10162c2615be14f4082c960bb062c566afa965a611bc1fe7abe5a074384d302473044022042dfc859affffba03a143c47f9cec4757fa7dab379a3fe4601e2cd3362d41b93022078ff782e1548b60415f983635952da50c62712764a225c0f104ea633b853475901210354d10162c2615be14f4082c960bb062c566afa965a611bc1fe7abe5a074384d302483045022100dc458fbaba3eb54b1091085a48cf7597291e90b244b29a1708c92fa715d0ebbc02204e8e27b3df6ed6e87b31bc4ee09d617eaccab2129ca4b19cc7af4f284eaacab801210354d10162c2615be14f4082c960bb062c566afa965a611bc1fe7abe5a074384d300000000',
      vin: [
        {
          txid: '7ce63157e1135220fbcce866e4592a193d7d6466354c6b9c8a593a38380a9402',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd'],
          value: '22957',
        },
        {
          txid: '9a48cf6aa9e313f63c05cd2307433f6d50312777346ae88d5c2a4748f2e5c839',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd'],
          value: '67759',
        },
        {
          txid: 'b05e660ad45905864fd1602904f4f45d73440ad2ee2072a7c4ce874b2c70a2b4',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1q58ar8thgtxagewupgk2mremryvvq7wr87tw6ga'],
          value: '1818165',
        },
      ],
      vout: [
        {
          value: '1842915',
          n: 0,
          scriptPubKey: {
            hex: '00141380133124fd225ffcf375346216538a7e135233',
          },
          addresses: ['bc1qzwqpxvfyl539ll8nw56xy9jn3flpx53nnm5zyw'],
        },
        {
          value: '20261',
          n: 1,
          scriptPubKey: {
            hex: '0014a76eef1cedb0c1fe5bae9936c084ac17940df1fe',
          },
          addresses: ['bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd'],
        },
      ],
    },
  ],
}

const mockData = { account, txHistory }

// eslint-disable-next-line import/no-default-export
export default mockData
