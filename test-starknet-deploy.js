// Test if starknet.js Account.deployAccount works with Lava RPC
const { Account, RpcProvider, ec, CallData, hash } = require('starknet');

const OPENZEPPELIN_ACCOUNT_CLASS_HASH = '0x05b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564';
const RPC_URL = 'https://rpc.starknet.lava.build';

async function testDeploy() {
  try {
    // Generate a new private key for testing
    const privateKeyBuffer = ec.starkCurve.utils.randomPrivateKey();
    const privateKey = '0x' + Buffer.from(privateKeyBuffer).toString('hex');
    const publicKey = ec.starkCurve.getStarkKey(privateKey);

    console.log('Generated keys:');
    console.log('Private key:', privateKey);
    console.log('Public key:', publicKey);

    // Calculate the contract address
    const constructorCalldata = CallData.compile([publicKey]);
    const address = hash.calculateContractAddressFromHash(
      publicKey,
      OPENZEPPELIN_ACCOUNT_CLASS_HASH,
      constructorCalldata,
      0
    );

    console.log('\nCalculated address:', address);
    console.log('Constructor calldata:', constructorCalldata);

    // Create provider
    const provider = new RpcProvider({ nodeUrl: RPC_URL });

    // Create account
    const account = new Account(provider, address, privateKey);

    console.log('\nAttempting deployment with starknet.js Account.deployAccount...');

    // Try to deploy with v3
    const deployResponse = await account.deployAccount(
      {
        classHash: OPENZEPPELIN_ACCOUNT_CLASS_HASH,
        constructorCalldata,
        addressSalt: publicKey,
      },
      {
        version: 3, // Force v3 transactions
      }
    );

    console.log('\n✅ Deployment successful!');
    console.log('Transaction hash:', deployResponse.transaction_hash);
    console.log('Contract address:', deployResponse.contract_address);

  } catch (error) {
    console.error('\n❌ Deployment failed:');
    console.error(error.message);
    console.error('Error:', error);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
  }
}

testDeploy();
