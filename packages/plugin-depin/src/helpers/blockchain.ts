import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { initWalletProvider, type SupportedChain } from "@elizaos/plugin-evm";
import { encodeFunctionData, parseUnits, formatUnits } from "viem";
import { iotex, iotexTestnet } from "viem/chains";
import * as viemChains from "viem/chains";

import { predictionAbi } from "../contracts/predictionAbi";
import { erc20Abi } from "../contracts/erc20abi";

export const getNetwork = (): SupportedChain => {
    const network = process.env.PREDICTION_NETWORK;
    const chain = viemChains[network];
    if (!chain) {
        throw new Error("Invalid network");
    }
    return network as SupportedChain;
};

export const resolvePrediction = async (
    runtime: IAgentRuntime,
    predictionId: number,
    outcome: boolean,
    network: SupportedChain
) => {
    const contractAddress = process.env
        .BINARY_PREDICTION_CONTRACT_ADDRESS as `0x${string}`;
    const walletProvider = await initWalletProvider(runtime);
    const publicClient = walletProvider.getPublicClient(network);
    const account = walletProvider.getAddress();

    await publicClient.simulateContract({
        chain: network === "iotex" ? iotex : iotexTestnet,
        address: contractAddress,
        abi: predictionAbi,
        account,
        functionName: "resolvePrediction",
        args: [BigInt(predictionId), outcome],
    });

    const data = encodeFunctionData({
        abi: predictionAbi,
        functionName: "resolvePrediction",
        args: [BigInt(predictionId), outcome],
    });

    const walletClient = walletProvider.getWalletClient(network);
    // @ts-expect-error: kzg is not required
    const request = await walletClient.prepareTransactionRequest({
        to: contractAddress,
        data,
        account: walletClient.account,
    });
    // @ts-expect-error: works, need closer look
    const serializedTransaction = await walletClient.signTransaction(request);
    const hash = await walletClient.sendRawTransaction({
        serializedTransaction,
    });

    elizaLogger.info(hash);
    return hash;
};

export const createPrediction = async (
    runtime: IAgentRuntime,
    address: `0x${string}`,
    statement: string,
    deadline: number,
    network: SupportedChain
) => {
    const walletProvider = await initWalletProvider(runtime);
    const publicClient = walletProvider.getPublicClient(network);
    const account = walletProvider.getAddress();

    const nextPredictionId = await publicClient.readContract({
        address,
        abi: predictionAbi,
        functionName: "predictionCount",
    });
    await publicClient.simulateContract({
        chain: network === "iotex" ? iotex : iotexTestnet,
        address,
        abi: predictionAbi,
        account,
        functionName: "createPrediction",
        args: [statement, BigInt(deadline), account],
    });
    const data = encodeFunctionData({
        abi: predictionAbi,
        functionName: "createPrediction",
        args: [statement, BigInt(deadline), account],
    });

    const walletClient = walletProvider.getWalletClient(network);
    // @ts-expect-error: kzg is not required
    const requestt = await walletClient.prepareTransactionRequest({
        to: address,
        data,
        account: walletClient.account,
    });
    // @ts-expect-error: works, need closer look
    const serializedTransaction = await walletClient.signTransaction(requestt);
    const hash = await walletClient.sendRawTransaction({
        serializedTransaction,
    });

    elizaLogger.info(hash);

    const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
    });
    if (receipt.status === "success") {
        return nextPredictionId;
    } else {
        throw new Error("Prediction creation failed");
    }
};

const getDecimals = async (
    runtime: IAgentRuntime,
    tokenAddress: `0x${string}`,
    network: SupportedChain
) => {
    const walletProvider = await initWalletProvider(runtime);
    const publicClient = walletProvider.getPublicClient(network);
    return publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
    });
};

export const placeBet = async (
    runtime: IAgentRuntime,
    predictionId: number,
    outcome: boolean,
    amount: string,
    bettor: `0x${string}`,
    network: SupportedChain
) => {
    const walletProvider = await initWalletProvider(runtime);
    const publicClient = walletProvider.getPublicClient(network);
    const account = walletProvider.getAddress();

    const decimals = await getDecimals(
        runtime,
        process.env.PREDICTION_TOKEN as `0x${string}`,
        network
    );
    const amountInWei = parseUnits(amount, decimals);

    const betAmount = await getBetAmount(
        amountInWei,
        bettor,
        account,
        publicClient
    );

    await publicClient.simulateContract({
        address: process.env
            .BINARY_PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
        abi: predictionAbi,
        account,
        functionName: "placeBetForAccount",
        args: [bettor, BigInt(predictionId), outcome, betAmount],
    });

    const data = encodeFunctionData({
        abi: predictionAbi,
        functionName: "placeBetForAccount",
        args: [bettor, BigInt(predictionId), outcome, betAmount],
    });

    const walletClient = walletProvider.getWalletClient(network);
    // @ts-expect-error: kzg is not required
    const request = await walletClient.prepareTransactionRequest({
        to: process.env.BINARY_PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
        data,
        account: walletClient.account,
    });
    // @ts-expect-error: works, need closer look
    const serializedTransaction = await walletClient.signTransaction(request);
    const hash = await walletClient.sendRawTransaction({
        serializedTransaction,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
    });

    if (receipt.status === "success") {
        return {
            hash,
            predictionId,
            bettor,
            betAmount: formatUnits(betAmount, decimals),
            outcome,
        };
    } else {
        throw new Error("Bet placement failed");
    }
};

export const genTxDataForAllowance = async (
    runtime: IAgentRuntime,
    network: SupportedChain,
    amount: number
) => {
    const decimals = await getDecimals(
        runtime,
        process.env.PREDICTION_TOKEN as `0x${string}`,
        network
    );
    const amountInWei = parseUnits(amount.toString(), decimals);

    return encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [
            process.env.BINARY_PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
            amountInWei,
        ],
    });
};

const getBetAmount = async (
    amount: bigint,
    bettor: `0x${string}`,
    account: `0x${string}`,
    publicClient: any
): Promise<bigint> => {
    const allowance = (await publicClient.readContract({
        address: process.env.PREDICTION_TOKEN as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance",
        args: [
            bettor,
            process.env.BINARY_PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
        ],
    })) as bigint;

    if (allowance <= BigInt(0)) {
        throw new Error("Insufficient allowance");
    }

    const maxBet = (await publicClient.readContract({
        address: process.env
            .BINARY_PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
        abi: predictionAbi,
        functionName: "maxBet",
    })) as bigint;

    const minBet = (await publicClient.readContract({
        address: process.env
            .BINARY_PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
        abi: predictionAbi,
        functionName: "minBet",
    })) as bigint;

    if (amount < minBet) {
        throw new Error("Bet amount is less than the minimum bet");
    }

    const betAmount: bigint = amount > maxBet ? maxBet : amount;

    if (allowance < betAmount) {
        throw new Error("Insufficient allowance");
    }

    return betAmount;
};
