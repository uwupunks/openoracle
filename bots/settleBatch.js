// bots/settleBatch.js
require("dotenv").config();
const { ethers } = require("ethers");

const { batcherAbi, dataProviderAbi } = require("../abi/abis");

// Configuration
const CONFIG = {
  POLL_INTERVAL: 5000, // Poll every 5 seconds
  MAX_BATCH_SIZE: 10, // Max reports per batch
  GAS_LIMIT_PER_REPORT: 750000, // Gas per report
  MAX_GAS_LIMIT: 7500000, // Max total gas limit
  GAS_PRICE_MULTIPLIER: 1.2, // Adjust gas price for speed
  MIN_ETH_BALANCE: ethers.parseEther("0.05"), // Minimum ETH balance
  MAX_RETRIES: 3, // Max retries for gas estimation or tx submission
  RETRY_DELAY: 1000, // Delay between retries (ms)
  FALLBACK_RPC_URL: "https://arb1.arbitrum.io/rpc", // Public Arbitrum RPC as fallback
};
let lastProcessedReportId = 1217; // Starting report ID

// Initialize providers and wallet
const txProvider = new ethers.JsonRpcProvider(process.env.SEQUENCER_RPC_URL);
const queryProvider = new ethers.JsonRpcProvider(process.env.QUERY_RPC_URL);
const wallet = new ethers.Wallet(process.env.VPS_PRIVATE_KEY, queryProvider);

// Initialize contract instances
const batcherContract = new ethers.Contract(
  process.env.BATCHER_CONTRACT_ADDRESS,
  batcherAbi,
  wallet
);
const dataProviderContract = new ethers.Contract(
  process.env.DATA_PROVIDER_ADDRESS,
  dataProviderAbi,
  wallet
);

// Utility function to check provider health
async function checkProviderHealth(provider, name) {
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`${name} provider is healthy (block: ${blockNumber})`);
    return true;
  } catch (error) {
    console.error(`${name} provider failed: ${error.message}`);
    return false;
  }
}

// Utility function to get current block timestamp
async function getCurrentBlockTimestamp() {
  try {
    const block = await queryProvider.getBlock("latest");
    return block.timestamp;
  } catch (error) {
    console.error("Failed to get block timestamp:", error.message);
    throw error;
  }
}

// Estimate gas for safeSettleReports with retries
async function estimateGasForBatch(batch, retryCount = 0) {
  try {
    const gasEstimate = await batcherContract.safeSettleReports.estimateGas(
      batch
    );
    return (gasEstimate * BigInt(115)) / BigInt(100); // Add 15% buffer
  } catch (error) {
    console.error(
      `Gas estimation attempt ${retryCount + 1} failed: ${error.message}`
    );
    if (retryCount < CONFIG.MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, CONFIG.RETRY_DELAY));
      return estimateGasForBatch(batch, retryCount + 1);
    }
    console.warn("Falling back to default gas limit");
    return ethers.BigNumber.from(CONFIG.GAS_LIMIT_PER_REPORT).mul(batch.length);
  }
}

// Main function to fetch and settle reports
async function settleReports() {
  try {
    // Check provider health
    if (!(await checkProviderHealth(queryProvider, "Query"))) {
      console.error("Query provider unhealthy, skipping settlement");
      return;
    }

    console.log(`Fetching report data... IDs ${lastProcessedReportId} to ${lastProcessedReportId + 100}`);

    // Fetch report data from openOracleDataProviderV2
    const reports = await dataProviderContract.getData(lastProcessedReportId, lastProcessedReportId+100);
    const currentTimestamp = await getCurrentBlockTimestamp();

    // Filter reports that are ready to settle
    const settleableReports = reports.filter((report) => {
      const {
        isDistributed,
        settlementTime,
        timeType,
        settlementTimestamp,
        stateHash,
        initialReportTimestamp,
        reportId,
      } = report;
      if (isDistributed || !stateHash || initialReportTimestamp <= 0) {
        return false; // Skip distributed or invalid reports
      }
      lastProcessedReportId = reportId; // Update last processed report ID
      console.log(`Processing report ID ${reportId}`);

      if (timeType) {
        // Time-based settlement (seconds)
        return currentTimestamp >= settlementTimestamp;
      } else {
        // Block-based settlement
        return currentTimestamp >= settlementTime;
      }
    });

    if (settleableReports.length === 0) {
      console.log("No reports ready to settle.");
      return;
    }

    console.log(`Found ${settleableReports.length} reports ready to settle.`);

    // Dynamically determine batch size based on gas constraints
    let batch = settleableReports
      .slice(0, CONFIG.MAX_BATCH_SIZE)
      .map((report) => ({
        reportId: report.reportId,
        stateHash: report.stateHash,
      }));

    // Adjust batch size based on gas estimation
    const estimatedGas = await estimateGasForBatch(batch);
    if (estimatedGas > CONFIG.MAX_GAS_LIMIT) {
      const newBatchSize = Math.floor(
        CONFIG.MAX_GAS_LIMIT / CONFIG.GAS_LIMIT_PER_REPORT
      );
      batch = batch.slice(0, newBatchSize);
      console.log(`Adjusted batch size to ${batch.length} due to gas limit.`);
    }

    if (batch.length === 0) {
      console.log("No reports included in batch after gas adjustment.");
      return;
    }

    // Estimate gas price
    //multiply bigint times CONFIG.GAS_PRICE_MULTIPLIER
    const gasPriceOrig = (await queryProvider.getFeeData()).gasPrice
    const gasPrice = gasPriceOrig + (gasPriceOrig * 20n / 100n); // Increase gas price by 20% for speed
    console.log(`Submitting batch of ${batch.length} settlements...`);

    // Fetch current nonce
    const nonce = await queryProvider.getTransactionCount(wallet.address, "pending");
    console.log(`Using nonce: ${nonce}`);

    // Submit batch transaction using safeSettleReports with retries
    let txResponse;
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        const nonce = await wallet.getNonce("pending");
        const tx = await batcherContract.safeSettleReports.populateTransaction(
          batch
        );
        const txWithParams = {
          ...tx,
          chainId: 42161, // Arbitrum One
          gasLimit: estimatedGas,
          gasPrice,
          nonce,
        };
        const signedTx = await wallet.signTransaction(txWithParams);
        txResponse = await txProvider.send("eth_sendRawTransaction", [
          signedTx,
        ]);
        console.log(`Transaction sent: ${txResponse}`);
        break;
      } catch (error) {
        console.error(`Transaction attempt ${attempt} failed: ${error.message}`);
        if (error.code === "NONCE_EXPIRED" || error.message.includes("nonce too low")) {
          console.log("Incrementing nonce and retrying...");
          txWithParams.nonce = (await queryProvider.getTransactionCount(wallet.address, "pending")) + attempt - 1;
        } else if (attempt === CONFIG.MAX_RETRIES) {
          console.error("Max retries reached, skipping transaction");
          return;
        }
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      }
    }

    // Wait for transaction confirmation
    const receipt = await queryProvider.waitForTransaction(txResponse);
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Check Arbiscan: https://arbiscan.io/tx/${txResponse}`);

    // Log successful settlements (assuming Settled event exists in IOpenOracle)
    if (receipt.events) {
      receipt.events.forEach(event => {
        if (event.event === "Settled") {
          console.log(`Report ${event.args.reportId} settled successfully.`);
        }
      });
    }

  } catch (error) {
    console.error("Error in settleReports:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.error) console.error("Detailed error:", error.error);
  }
}

// Poll for new reports periodically
async function startBot() {
  console.log("Starting BATCH settlement bot...");
  console.log(`Wallet address: ${wallet.address}`);
  setInterval(settleReports, CONFIG.POLL_INTERVAL);
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error.message);
});

// Start the bot
startBot();