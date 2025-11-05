import * as StellarSDK from '@stellar/stellar-sdk';

/**
 * Check if Freighter wallet is installed
 */
export const isFreighterInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).freighter;
};

/**
 * Connect to Freighter wallet
 */
export const connectFreighter = async (): Promise<boolean> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter wallet is not installed');
  }

  try {
    const freighter = (window as any).freighter;
    const isAllowed = await freighter.isConnected();

    if (!isAllowed) {
      await freighter.requestAccess();
    }

    return true;
  } catch (error) {
    console.error('Error connecting to Freighter:', error);
    throw error;
  }
};

/**
 * Get connected public key from Freighter
 */
export const getPublicKey = async (): Promise<string> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter wallet is not installed');
  }

  try {
    const freighter = (window as any).freighter;
    const publicKey = await freighter.getPublicKey();
    return publicKey;
  } catch (error) {
    console.error('Error getting public key:', error);
    throw error;
  }
};

/**
 * Sign and submit a transaction using Freighter
 * @param txParams Transaction parameters from backend
 * @returns Transaction hash
 */
export const signTransaction = async (txParams: any): Promise<string> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter wallet is not installed');
  }

  try {
    const freighter = (window as any).freighter;

    // Get user's public key
    const publicKey = await freighter.getPublicKey();

    // Connect to Soroban RPC
    const server = new StellarSDK.SorobanRpc.Server(txParams.rpcUrl);

    // Get account
    const account = await server.getAccount(publicKey);

    // Build contract call
    const contract = new StellarSDK.Contract(txParams.contractId);

    // Build transaction
    const transaction = new StellarSDK.TransactionBuilder(account, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: txParams.networkPassphrase,
    })
      .addOperation(contract.call(txParams.method, ...txParams.args))
      .setTimeout(30)
      .build();

    // Prepare transaction (simulate to get footprint)
    const preparedTx = await server.prepareTransaction(transaction);

    // Convert to XDR string
    const xdr = preparedTx.toXDR();

    // Ask Freighter to sign the transaction
    const signedXdr = await freighter.signTransaction(xdr, {
      network: 'TESTNET',
      networkPassphrase: txParams.networkPassphrase,
    });

    // Convert back to transaction
    const signedTx = StellarSDK.TransactionBuilder.fromXDR(
      signedXdr,
      txParams.networkPassphrase
    );

    // Submit transaction
    const response = await server.sendTransaction(signedTx as StellarSDK.Transaction);

    console.log('Transaction submitted:', response.hash);

    // Wait for confirmation
    let status = await server.getTransaction(response.hash);
    let attempts = 0;

    while ((status.status === 'PENDING' || status.status === 'NOT_FOUND') && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      status = await server.getTransaction(response.hash);
      attempts++;
    }

    if (status.status === 'SUCCESS') {
      console.log('Transaction successful');
      return response.hash;
    } else {
      throw new Error('Transaction failed: ' + JSON.stringify(status));
    }
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
};

/**
 * Get current Freighter network details
 */
export const getNetworkDetails = async () => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter wallet is not installed');
  }

  try {
    const freighter = (window as any).freighter;
    const network = await freighter.getNetwork();
    return network;
  } catch (error) {
    console.error('Error getting network:', error);
    throw error;
  }
};
