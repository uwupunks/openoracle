require('dotenv').config();
const { ethers } = require('ethers');

// Providers
const txProvider = new ethers.JsonRpcProvider(process.env.SEQUENCER_RPC_URL);
const queryProvider = new ethers.JsonRpcProvider(process.env.QUERY_RPC_URL);

// Contract details
const abi = ['function register(address)'];
const contract = new ethers.Contract(process.env.VPS_REGISTER_CONTRACT_ADDRESS, abi, txProvider);

// Wallets
const vpsPrivateKey = process.env.ARBITRUM_PRIVATE_KEY;
const safeAddress = process.env.SAFE_REGISTRATION_ADDRESS;

if (!vpsPrivateKey || !safeAddress) {
  throw new Error('VPS_PRIVATE_KEY or SAFE_REGISTRATION_ADDRESS not set in .env');
}

async function registerVps() {
  try {
    // Validate safe address
    if (!ethers.isAddress(safeAddress)) {
      throw new Error('Invalid SAFE_REGISTRATION_ADDRESS');
    }
    console.log('Registering safe address:', safeAddress);

    // Check VPS key balance
    const vpsWallet = new ethers.Wallet(vpsPrivateKey, queryProvider);
    const balance = await queryProvider.getBalance(vpsWallet.address);
    console.log('VPS Key Address:', vpsWallet.address);
    console.log('VPS Key Balance:', ethers.formatEther(balance), 'ETH');
    if (balance === 0n) {
      throw new Error('VPS key has no ETH to pay gas');
    }

    // Connect wallet to txProvider
    const signer = new ethers.Wallet(vpsPrivateKey, txProvider);

    // Simulate transaction
    console.log('Simulating transaction...');
    const tx = await contract.connect(signer).register.populateTransaction(safeAddress);
    console.log('Simulated transaction:', tx);

    // Prompt for confirmation
    console.log('WARNING: Registration is IRREVERSIBLE. Confirm safe address:', safeAddress);
    console.log('Type "CONFIRM" to proceed:');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await new Promise(resolve => {
      readline.question('', resolve);
    });
    readline.close();
    if (answer !== 'CONFIRM') {
      throw new Error('Registration aborted');
    }

    // Send transaction
    console.log('Sending registration transaction...');
    const txResponse = await contract.connect(signer).register(safeAddress);
    console.log('Transaction hash:', txResponse.hash);
    await txResponse.wait();
    console.log('Registration successful');
  } catch (error) {
    console.error('Registration failed:', error.message);
  }
}

registerVps();
