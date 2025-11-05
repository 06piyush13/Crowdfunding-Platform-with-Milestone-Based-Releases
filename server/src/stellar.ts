import * as StellarSDK from '@stellar/stellar-sdk';
import { config } from 'dotenv';

config();

const {
  SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org',
  CONTRACT_ID = '',
  SECRET_KEY = '',
} = process.env;

// Initialize Soroban RPC server
const server = new StellarSDK.SorobanRpc.Server(SOROBAN_RPC_URL);

// Get source keypair from secret key
const getSourceKeypair = (): StellarSDK.Keypair => {
  if (!SECRET_KEY || SECRET_KEY.startsWith('Sxxx')) {
    throw new Error('SECRET_KEY not configured in .env file');
  }
  return StellarSDK.Keypair.fromSecret(SECRET_KEY);
};

// Helper: Convert number to ScVal
const numberToU64 = (num: number): StellarSDK.xdr.ScVal => {
  return StellarSDK.nativeToScVal(num, { type: 'u64' });
};

// Helper: Convert string to ScVal
const stringToScVal = (str: string): StellarSDK.xdr.ScVal => {
  return StellarSDK.nativeToScVal(str, { type: 'string' });
};

// Helper: Convert address to ScVal
const addressToScVal = (address: string): StellarSDK.xdr.ScVal => {
  return StellarSDK.nativeToScVal(address, { type: 'address' });
};

/**
 * Create a new campaign on-chain
 */
export const createCampaign = async (
  creator: string,
  title: string,
  description: string,
  targetAmount: number,
  milestoneCount: number
): Promise<string> => {
  try {
    const sourceKeypair = getSourceKeypair();
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    // Build contract invocation
    const contract = new StellarSDK.Contract(CONTRACT_ID);
    
    const transaction = new StellarSDK.TransactionBuilder(sourceAccount, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: StellarSDK.Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'create_campaign',
          addressToScVal(creator),
          stringToScVal(title),
          stringToScVal(description),
          numberToU64(targetAmount),
          numberToU64(milestoneCount)
        )
      )
      .setTimeout(30)
      .build();

    // Simulate first to get footprint
    const preparedTx = await server.prepareTransaction(transaction);
    preparedTx.sign(sourceKeypair);

    // Submit transaction
    const response = await server.sendTransaction(preparedTx);
    console.log('Campaign creation transaction sent:', response.hash);

    // Wait for confirmation
    let status = await server.getTransaction(response.hash);
    while (status.status === 'PENDING' || status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await server.getTransaction(response.hash);
    }

    if (status.status === 'SUCCESS') {
      console.log('Campaign created successfully');
      return response.hash;
    } else {
      throw new Error('Transaction failed: ' + JSON.stringify(status));
    }
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
};

/**
 * Create a milestone on-chain
 */
export const createMilestone = async (
  campaignId: number,
  milestoneId: number,
  description: string,
  releaseAmount: number,
  requiredApprovals: number
): Promise<string> => {
  try {
    const sourceKeypair = getSourceKeypair();
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    const contract = new StellarSDK.Contract(CONTRACT_ID);
    
    const transaction = new StellarSDK.TransactionBuilder(sourceAccount, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: StellarSDK.Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'create_milestone',
          numberToU64(campaignId),
          numberToU64(milestoneId),
          stringToScVal(description),
          numberToU64(releaseAmount),
          numberToU64(requiredApprovals)
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(transaction);
    preparedTx.sign(sourceKeypair);

    const response = await server.sendTransaction(preparedTx);
    console.log('Milestone creation transaction sent:', response.hash);

    let status = await server.getTransaction(response.hash);
    while (status.status === 'PENDING' || status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await server.getTransaction(response.hash);
    }

    if (status.status === 'SUCCESS') {
      console.log('Milestone created successfully');
      return response.hash;
    } else {
      throw new Error('Transaction failed: ' + JSON.stringify(status));
    }
  } catch (error) {
    console.error('Error creating milestone:', error);
    throw error;
  }
};

/**
 * Contribute to a campaign (called from frontend via Freighter)
 * This function builds the transaction parameters that client will sign
 */
export const buildContributionParams = (
  campaignId: number,
  backer: string,
  amount: number
) => {
  return {
    contractId: CONTRACT_ID,
    method: 'contribute',
    args: [
      numberToU64(campaignId),
      addressToScVal(backer),
      numberToU64(amount),
    ],
    networkPassphrase: StellarSDK.Networks.TESTNET,
    rpcUrl: SOROBAN_RPC_URL,
  };
};

/**
 * Release milestone funds (server-side)
 */
export const releaseMilestone = async (
  campaignId: number,
  milestoneId: number,
  requester: string
): Promise<string> => {
  try {
    const sourceKeypair = getSourceKeypair();
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    const contract = new StellarSDK.Contract(CONTRACT_ID);
    
    const transaction = new StellarSDK.TransactionBuilder(sourceAccount, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: StellarSDK.Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'release_milestone',
          numberToU64(campaignId),
          numberToU64(milestoneId),
          addressToScVal(requester)
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(transaction);
    preparedTx.sign(sourceKeypair);

    const response = await server.sendTransaction(preparedTx);
    console.log('Milestone release transaction sent:', response.hash);

    let status = await server.getTransaction(response.hash);
    while (status.status === 'PENDING' || status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await server.getTransaction(response.hash);
    }

    if (status.status === 'SUCCESS') {
      console.log('Milestone released successfully');
      return response.hash;
    } else {
      throw new Error('Transaction failed: ' + JSON.stringify(status));
    }
  } catch (error) {
    console.error('Error releasing milestone:', error);
    throw error;
  }
};

/**
 * Approve milestone (called from frontend via Freighter)
 */
export const buildApproveMilestoneParams = (
  campaignId: number,
  milestoneId: number,
  backer: string
) => {
  return {
    contractId: CONTRACT_ID,
    method: 'approve_milestone',
    args: [
      numberToU64(campaignId),
      numberToU64(milestoneId),
      addressToScVal(backer),
    ],
    networkPassphrase: StellarSDK.Networks.TESTNET,
    rpcUrl: SOROBAN_RPC_URL,
  };
};