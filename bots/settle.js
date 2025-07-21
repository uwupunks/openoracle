require("dotenv").config();
const { ethers } = require("ethers");

// Providers
const txProvider = new ethers.JsonRpcProvider(process.env.SEQUENCER_RPC_URL);
const queryProvider = new ethers.JsonRpcProvider(process.env.QUERY_RPC_URL);

const { beaconAbi, oracleAbi, arbGasInfoAbi } = require("../abi/abis");

// Wallet
const privateKey = process.env.VPS_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("VPS_PRIVATE_KEY not set in .env");
}
const wallet = new ethers.Wallet(privateKey, txProvider);
const queryWallet = new ethers.Wallet(privateKey, queryProvider);

// Contracts
const beaconContract = new ethers.Contract(
  process.env.BEACON_CONTRACT_ADDRESS,
  beaconAbi,
  wallet
);
const beaconContractQuery = new ethers.Contract(
  process.env.BEACON_CONTRACT_ADDRESS,
  beaconAbi,
  queryProvider
);
const oracleContract = new ethers.Contract(
  process.env.ORACLE_CONTRACT_ADDRESS,
  oracleAbi,
  queryProvider
);
const arbGasInfoContract = new ethers.Contract(
  process.env.ARB_GAS_INFO_ADDRESS,
  arbGasInfoAbi,
  queryProvider
);

async function runSettleBot() {
  console.log("Starting settle bot...");

  // Monitor SettlementBatch events
  beaconContractQuery.on(
    "SettlementBatch",
    (reportsSettled, totalRewards, settler, event) => {
      console.log(
        `Settlement batch confirmed: ${Number(
          reportsSettled
        )} reports settled, Total Rewards: ${ethers.formatEther(
          totalRewards
        )} ETH`
      );
      console.log(
        `Settler: ${settler}, Tx: https://arbiscan.io/tx/${event.transactionHash}`
      );
    }
  );

  // Poll for settleable reports every 5 seconds
  setInterval(async () => {
    try {
      console.log("Checking for settleable reports...");

      // Get next report ID
      const nextId = await oracleContract.nextReportId();
      const nextIdNum = Number(nextId); // Convert BigInt to number
      if (nextIdNum <= 1) {
        console.log("No reports available");
        return;
      }

      // Simulate freeMoneyLight
      console.log("Simulating freeMoneyLight...");
      const gasPrice = (await queryProvider.getFeeData()).gasPrice;
      let gasEstimate;
      try {
        gasEstimate = await beaconContractQuery.freeMoneyLight.estimateGas();
      } catch (error) {
        console.log("Simulation failed: No settleable reports");
        return;
      }

      const totalGasCost = gasEstimate * gasPrice;
      const threshold = (totalGasCost * BigInt(105)) / BigInt(100); // 105% of gas cost

      // Check potential rewards by scanning last 8 reports
      let totalPotentialReward = BigInt(0);
      const startId = nextIdNum - 1;
      const endId = startId > 8 ? startId - 8 : 0;

      for (let id = startId; id >= endId && id > 0; id--) {
        const status = await oracleContract.reportStatus(BigInt(id)); // Convert to BigInt
        const meta = await oracleContract.reportMeta(BigInt(id));
        const extra = await oracleContract.extraData(BigInt(id));

        if (
          status.isSettled ||
          status.isDistributed ||
          status.currentReporter ===
            "0x0000000000000000000000000000000000000000"
        ) {
          continue;
        }
        if (
          extra.callbackContract !==
          "0x0000000000000000000000000000000000000000"
        ) {
          continue;
        }

        const nowTime = meta.timeType
          ? Math.floor(Date.now() / 1000)
          : Number(await getBlockNumber());
        const deadline =
          Number(status.reportTimestamp) + Number(meta.settlementTime);
        if (nowTime < deadline) {
          continue;
        }

        if (meta.settlerReward > threshold) {
          totalPotentialReward += meta.settlerReward;
        }
      }

      if (totalPotentialReward <= threshold) {
        console.log(
          `Not profitable: Potential reward ${ethers.formatEther(
            totalPotentialReward
          )} ETH < Threshold ${ethers.formatEther(threshold)} ETH`
        );
        return;
      }

      console.log(
        `Profitable: Potential reward ${ethers.formatEther(
          totalPotentialReward
        )} ETH > Threshold ${ethers.formatEther(threshold)} ETH`
      );

      // Execute freeMoneyLight
      console.log("Executing freeMoneyLight...");
      const gasLimit = 150000;
      const maxGasPrice = ethers.parseUnits("0.2", "gwei");
      const finalGasPrice = gasPrice > maxGasPrice ? maxGasPrice : gasPrice;
      const nonce = await queryWallet.getNonce("pending");
      const chainId = 42161; // Hardcode Arbitrum One chain ID
      const tx = await beaconContract.freeMoneyLight.populateTransaction({
        gasLimit,
        gasPrice: finalGasPrice,
      });
      const txWithParams = {
        ...tx,
        nonce,
        gasLimit,
        gasPrice: finalGasPrice,
        chainId,
      };
      const signedTx = await wallet.signTransaction(txWithParams);
      const txResponse = await txProvider.send("eth_sendRawTransaction", [
        signedTx,
      ]);
      console.log("Settlement transaction hash:", txResponse);
      await queryProvider.waitForTransaction(txResponse);
      console.log(
        "Settlement confirmed. Check Arbiscan: https://arbiscan.io/tx/" +
          txResponse
      );
    } catch (error) {
      console.error("Settlement failed:", error.message);
    }
  }, 2000);
}

// Helper to get Arbitrum block number
async function getBlockNumber() {
  const arbSysAddress = "0x0000000000000000000000000000000000000064";
  const arbSysAbi = ["function arbBlockNumber() view returns (uint256)"];
  const arbSysContract = new ethers.Contract(
    arbSysAddress,
    arbSysAbi,
    queryProvider
  );
  try {
    return await arbSysContract.arbBlockNumber();
  } catch (error) {
    console.error("Failed to fetch Arbitrum block number:", error.message);
    return 0; // fallback to zero if both fail
  }
}

runSettleBot();
