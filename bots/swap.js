require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");

// Providers
const txProvider = new ethers.JsonRpcProvider(process.env.SEQUENCER_RPC_URL);
const queryProvider = new ethers.JsonRpcProvider(process.env.QUERY_RPC_URL);

const { swapAbi, erc20Abi } = require("../abi/abis");

// Wallet
const privateKey = process.env.VPS_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("VPS_PRIVATE_KEY not set in .env");
}
const wallet = new ethers.Wallet(privateKey, queryProvider);

// Contracts
const swapContract = new ethers.Contract(
  process.env.SWAP_CONTRACT_ADDRESS,
  swapAbi,
  wallet
);
const wethContract = new ethers.Contract(
  process.env.WETH_ADDRESS,
  erc20Abi,
  wallet
);
const usdcContract = new ethers.Contract(
  process.env.USDC_ADDRESS,
  erc20Abi,
  wallet
);

// Fetch real-time prices from alchemy
async function fetchCryptoPrices() {
  try {
    const response1 = await axios.get(
      `https://api.g.alchemy.com/prices/v1/${process.env.ALCHEMY_API_KEY}/tokens/by-symbol?symbols=ETH`
    );
    const response2 = await axios.get(
      `https://api.g.alchemy.com/prices/v1/${process.env.ALCHEMY_API_KEY}/tokens/by-symbol?symbols=USDC`
    );

    return {
      wethPriceUsd: response1.data.data[0].prices[0].value,
      usdcPriceUsd: response2.data.data[0].prices[0].value,
    };
  } catch (error) {
    console.error("Error fetching alchemy prices:", error.message);
    throw new Error("Failed to fetch prices");
  }
}

async function approveTokens(tokenContract, amount, tokenName) {
  try {
    const allowance = await tokenContract.allowance(
      wallet.address,
      process.env.SWAP_CONTRACT_ADDRESS
    );
    if (allowance >= amount) {
      console.log(`${tokenName} already approved`);
      return;
    }
    console.log(
      `Approving ${ethers.formatUnits(
        amount,
        tokenContract === wethContract ? 18 : 6
      )} ${tokenName}...`
    );
    const tx = await tokenContract.approve(
      process.env.SWAP_CONTRACT_ADDRESS,
      amount
    );
    console.log("Approval hash:", tx.hash);
    await tx.wait();
    console.log("Approval confirmed");
  } catch (error) {
    console.error(`Approval failed for ${tokenName}:`, error.message);
  }
}

async function isSwapProfitable(
  amount1Weth,
  finalAmount2Usdc,
  fee,
  gasCostUsd
) {
  try {
    const { wethPriceUsd, usdcPriceUsd } = await fetchCryptoPrices();
    const benchmarkPriceUsdcPerWeth = wethPriceUsd / usdcPriceUsd; // ~3745.77 USDC/WETH
    const benchmarkUsdc =
      Number(ethers.formatEther(amount1Weth)) * benchmarkPriceUsdcPerWeth;
    const feeBps = fee / 10000 + 0.0001; // 2.222% + 0.01%
    const minExpectedUsdc = benchmarkUsdc * (1 - feeBps) * 0.95; // 95% of benchmark after fees
    const finalUsdcValue = Number(ethers.formatUnits(finalAmount2Usdc, 6));
    const gasCostUsdc = gasCostUsd / usdcPriceUsd;
    const netProfitUsdc = finalUsdcValue - gasCostUsdc;
    console.log(
      `Profitability check: Expected USDC ${finalUsdcValue.toFixed(
        6
      )}, Min Expected ${minExpectedUsdc.toFixed(
        6
      )}, Gas Cost ${gasCostUsdc.toFixed(
        6
      )} USDC, Net Profit ${netProfitUsdc.toFixed(6)} USDC`
    );
    return netProfitUsdc >= minExpectedUsdc;
  } catch (error) {
    console.error("Profitability check failed:", error.message);
    return false;
  }
}

async function runSwapBot() {
  console.log("Starting swap bot...");
  await approveTokens(wethContract, ethers.parseEther("0.001"), "WETH");
  await approveTokens(usdcContract, ethers.parseUnits("1", 6), "USDC");

  // Monitor SwapReportOpened events for confirmation
  swapContract.on(
    "SwapReportOpened",
    (
      reportId,
      user,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      feePaidWei,
      event
    ) => {
      console.log(`Swap report opened: Report ID ${reportId}, User: ${user}`);
      console.log(
        `Token In: ${tokenIn}, Amount In: ${ethers.formatUnits(
          amountIn,
          tokenIn === process.env.WETH_ADDRESS ? 18 : 6
        )}`
      );
      console.log(
        `Token Out: ${tokenOut}, Amount Out: ${ethers.formatUnits(
          amountOut,
          tokenOut === process.env.WETH_ADDRESS ? 18 : 6
        )}`
      );
      console.log(
        `Fee Paid: ${ethers.formatEther(
          feePaidWei
        )} ETH, Tx: https://arbiscan.io/tx/${event.transactionHash}`
      );
    }
  );

  // Poll for swap opportunities every 10 seconds
  setInterval(async () => {
    try {
      console.log("Checking for swap opportunities...");

      // Fetch real-time prices
      const { wethPriceUsd, usdcPriceUsd } = await fetchCryptoPrices();
      console.log(`WETH Price: $${wethPriceUsd}, USDC Price: $${usdcPriceUsd}`);

      // Swap parameters
      const fee = 2222; // 2.222 bps
      const settlementTime = 10; // 10 seconds
      const msgValue = ethers.parseEther("0.000004"); // ~0.000004 ETH

      const amount1Weth = ethers.parseEther("0.00001");
      const amount1Usdc = ethers.parseUnits("0.04", 6); // 0.04 USDC

      // Calculate amount2Usdc with fee adjustment
      const amount1Usd = Number(ethers.formatEther(amount1Weth)) * wethPriceUsd;
      const feeBps = fee / 10000 + 0.0001; // 2.222 bps + 1 bps for disputer

      const gasPrice = (await queryProvider.getFeeData()).gasPrice;
      const gasLimit = 200000; // Fixed gas limit for createAndReport
      const gasCostUsd =
        Number(ethers.formatEther(gasPrice * BigInt(gasLimit))) * wethPriceUsd;
      const gasCostFraction = Math.min(gasCostUsd / amount1Usd, 0.1); // Cap gas cost at 10% of amount1Usd

      // Adjust amount2Usdc to include capped gas cost
      const finalAmount2Usdc = ethers.parseUnits(
        (
          (amount1Usd / usdcPriceUsd) *
          (1 - (feeBps + gasCostFraction))
        ).toFixed(6),
        6
      );
      if (finalAmount2Usdc <= 0) {
        throw new Error(
          `Calculated amount2Usdc is non-positive: ${ethers.formatUnits(
            finalAmount2Usdc,
            6
          )} USDC`
        );
      }

      // Swap USDC → WETH (for completeness, but default to WETH → USDC)
      const amount1UsdcUsd =
        Number(ethers.formatUnits(amount1Usdc, 6)) * usdcPriceUsd;
      const amount2Weth = ethers.parseEther(
        (
          (amount1UsdcUsd / wethPriceUsd) *
          (1 + (feeBps + gasCostFraction))
        ).toFixed(18)
      );

      // Choose swap direction (default: WETH → USDC)
      const isWethToUsdc = true; // Toggle for USDC → WETH
      const token1 = isWethToUsdc
        ? process.env.WETH_ADDRESS
        : process.env.USDC_ADDRESS;
      const token2 = isWethToUsdc
        ? process.env.USDC_ADDRESS
        : process.env.WETH_ADDRESS;
      const amount1 = isWethToUsdc ? amount1Weth : amount1Usdc;
      const amount2 = isWethToUsdc ? finalAmount2Usdc : amount2Weth;

      // Approve tokens
      await approveTokens(wethContract, amount1Weth, "WETH");
      await approveTokens(usdcContract, finalAmount2Usdc, "USDC");

      // Simulate transaction
      console.log(
        `Simulating swap for ${isWethToUsdc ? "WETH → USDC" : "USDC → WETH"}...`
      );
      const tx = await swapContract.createAndReport.populateTransaction(
        token1,
        token2,
        amount1,
        amount2,
        fee,
        settlementTime,
        { value: msgValue }
      );

      console.log("Simulated transaction:", tx);

      // Check profitability after simulation
      const isProfitable = await isSwapProfitable(
        amount1Weth,
        finalAmount2Usdc,
        fee,
        gasCostUsd
      );
      if (!isProfitable) {
        console.log("Swap not profitable after simulation, aborting");
        return;
      }

      // Execute the populated transaction
      console.log("Executing swap...");
      const nonce = await wallet.getNonce("pending"); // Use queryProvider for nonce
      const txWithNonce = { ...tx, nonce };
      const txResponse = await wallet.sendTransaction(txWithNonce);
      console.log("Swap transaction hash:", txResponse.hash);
      await txResponse.wait();
      console.log(
        "Swap confirmed. Check Arbiscan: https://arbiscan.io/tx/" +
          txResponse.hash
      );
    } catch (error) {
      console.error("Swap failed:", error.message);
    }
  }, 10000); // Poll every 10 seconds
}

runSwapBot();
