import type { utxo } from '@shapeshiftoss/unchained-client'

const account: utxo.bitcoin.Account = {
  pubkey: 'testKey',
  balance: '0',
  unconfirmedBalance: '0',
  addresses: [
    {
      balance: '0',
      pubkey: 'bc1qary3ng3wtlqvglqx3vdkqlw0d7j92qvcapdzekrsg8g9p3hve5us9w2snm',
    },
    {
      balance: '0',
      pubkey: 'bc1qj22y0r5n73lk5fd7fzddv6kd7kaj78hlkqxslvuguhdvt6gu2tusxnqfjq',
    },
  ],
  nextReceiveAddressIndex: 2,
  nextChangeAddressIndex: 3,
}

const txHistory = {
  pubkey: 'testKey',
  txs: [
    {
      txid: '4d31a5e1aa9b4fe912ec006c1c12f9dbb50ca8014e47d1c4840ad53e0706eecf',
      blockHash: '00000000000000000000b06530b072d2076b34575d45bcea4612dd11f0b89dfa',
      blockHeight: 825506,
      timestamp: 1705084793,
      confirmations: 16,
      value: '179090918',
      fee: '68250',
      hex: '010000000001033e49a8057e77c64fd6b9a7004a7b0dd41d0e0c8c8392282f116c7ee8775dc0120100000000ffffffff08525ed4a020d8c3c46ea74919a67181021549c8a0c9e2239499f579c851411f0100000000ffffffff754fb5de5af6503b7f7566cb5753e2b9d66d1e798c5c5bd7188e3adc989842950100000000ffffffff034e11110000000000220020e8c919a22e5fc0c47c068b1b607dcf6fa4550198e85a2cd87041d050c6eccd39b9774601000000002200209294478e93f47f6a25be489ad66acdf5bb2f1effb00d0fb388e5dac5e91c52f9df2c5509000000002200207bb8f5802ae446be4e5f7dde387ca1624faee09a8643a8c16ff87df4235e2584040047304402201f4e0a471b11b90042f124e056e97d47f5b0684c444f5b4a1df8006070a3c82e02201f5300784bdaca0a1377cbbad6826f88c7861742fdeabcc07064ed58da079a4f01473044022046ca7749efb323714bc5784e1d9b27f682ba4c053de3d64fd78ac5472991c7c502202463e85873a7d82c5795d68eb236523c0f54a0028a8becdfc9fd04bb794c793001695221024c224d7d489707b8773554eeb230ee33156f14245e8d85987d02ad4d9ad9565521024062d3dc830a004dbf2633f403db0af0f5b650c477074e894007b8327184307821027cea45056b4281ee3221734bd96eda84b3e04461c8dac2609a4ef369485a9ad053ae040047304402202f7a777d4649c8ba9e51a799a9afc2ad121664a9f6ab9c8d2f7b608459949ef302207605e7d8e56da8120b3c0242232e969bbf7bc80c168d7f2882af0cddcc30589b0147304402200d177147c8ff2bb18a5910e452fcb1abf32dc40329382ce9d33f7ee5da85a6cc02205b7b62d55cb4cb326b30cfbb025a561e859c9c06c2ab8c712f5f50c6f3592cec016952210303f84b87cae6af835ada0d21946dd152aa275015b2594992d0430f43c797481521033b432b5434c37cc0192c447f39597ee1be96e1c5756d723892c1db4159e410542103d9d03dc721a7cb189c85e4e71bd844bea4c7102b69b713ece0790a5cf685e04253ae0400483045022100d276cf3e75f2d4075c408a8be78bcc6119dcb27f8b6994154fc84bfcbb407bad022063fbf5cd0653d4f96597cd4f17e2d0de13b58771d0e9a9b23f219541a4fa460501473044022034ff05b9486a61819f6f6f7e57b5762726b0144fd8597621b53f5f1addc9c6e602200c622a89fa7f395acc4c3db2551a6473417b6ee489a72f62f738b2c4e69ed3ee01695221036df2de2e34f014cde22ad692ce1e91a2019ab03cbe5b94b5684bb65edb19451a210376063d45ca4ef0908d8e230f8b745997fc9679b82a3b48ee93f6903b6bfc5fd2210314ef639f7a55e1fe06962315d2206df4fb628f119cc6e8068af6975d018a80f553aea0980c00',
      vin: [
        {
          txid: '12c05d77e87e6c112f2892838c0c0e1dd40d7b4a00a7b9d64fc6777e05a8493e',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1qg4tyzkzk55nfzln6a86ulsetqa9g3rynd6y06mm0zvpkmwgzzpuqxjll78'],
          value: '84099255',
        },
        {
          txid: '1f4151c879f5999423e2c9a0c84915028171a61949a76ec4c3d820a0d45e5208',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1q3lr33srfqzr2dqpthcp9ehlf0wxfnvks0r6szzkaqgpf5xck9uzsgryjmc'],
          value: '71230282',
        },
        {
          txid: '95429898dc3a8e18d75b5c8c791e6dd6b9e25357cb66757f3b50f65adeb54f75',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1qsm0vz7v96dt9pmmall4rq2e2yql0d0ppjedxfq5zyz35r4rvma4scaw3vm'],
          value: '23829631',
        },
      ],
      vout: [
        {
          value: '1118542',
          n: 0,
          scriptPubKey: {
            hex: '0020e8c919a22e5fc0c47c068b1b607dcf6fa4550198e85a2cd87041d050c6eccd39',
          },
          addresses: ['bc1qary3ng3wtlqvglqx3vdkqlw0d7j92qvcapdzekrsg8g9p3hve5us9w2snm'],
        },
        {
          value: '21395385',
          n: 1,
          scriptPubKey: {
            hex: '00209294478e93f47f6a25be489ad66acdf5bb2f1effb00d0fb388e5dac5e91c52f9',
          },
          addresses: ['bc1qj22y0r5n73lk5fd7fzddv6kd7kaj78hlkqxslvuguhdvt6gu2tusxnqfjq'],
        },
        {
          value: '156576991',
          n: 2,
          scriptPubKey: {
            hex: '00207bb8f5802ae446be4e5f7dde387ca1624faee09a8643a8c16ff87df4235e2584',
          },
          addresses: ['bc1q0wu0tqp2u3rtunjl0h0rsl9pvf86acy6sep63st0lp7lgg67ykzqeq89pn'],
        },
      ],
    },
  ],
}

const mockData = { account, txHistory }

// eslint-disable-next-line import/no-default-export
export default mockData
