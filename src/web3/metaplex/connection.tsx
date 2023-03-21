import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import {
  Blockhash,
  Commitment,
  Connection,
  FeeCalculator,
  Keypair,
  RpcResponseAndContext,
  SignatureStatus,
  Signer,
  SimulatedTransactionResponse,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';

interface BlockhashAndFeeCalculator {
  blockhash: Blockhash;
  feeCalculator: FeeCalculator;
}

export const DEFAULT_TIMEOUT = 60000;

export const getErrorForTransaction = async (connection: Connection, txid: string) => {
  // wait for all confirmation before geting transaction
  await connection.confirmTransaction(txid, 'max');

  const tx = await connection.getParsedConfirmedTransaction(txid);

  const errors: string[] = [];
  if (tx?.meta && tx.meta.logMessages) {
    tx.meta.logMessages.forEach((log) => {
      const regex = /Error: (.*)/gm;
      let m;
      while ((m = regex.exec(log)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        if (m.length > 1) {
          errors.push(m[1]);
        }
      }
    });
  }

  return errors;
};

export enum SequenceType {
  Sequential,
  Parallel,
  StopOnFailure,
}


export interface InstructionsAndSigners {
  signers: Signer[];
  instructions: TransactionInstruction[];
}

export const sendTransactions = async (
  connection: Connection,
  readConnection: Connection,
  wallet: AnchorWallet,
  instructionSet: InstructionsAndSigners[],
  sequenceType: SequenceType = SequenceType.Parallel,
  commitment: Commitment = 'recent',
  successCallback: (txid: string, ind: number) => void = (txid, ind) => {},
  failCallback: (error: any, ind: number) => boolean = (txid, ind) => false,
  block?: BlockhashAndFeeCalculator,
  beforeTransactions: Transaction[] = [],
  afterTransactions: Transaction[] = []
): Promise<{ number: number; txs: { txid: string; slot: number }[] }> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const unsignedTxns: Transaction[] = beforeTransactions;

  if (!block) {
    block = await connection.getRecentBlockhash(commitment);
  }

  for (let i = 0; i < instructionSet.length; i++) {
    const iset: InstructionsAndSigners = instructionSet[i];
    const instructions = iset.instructions;
    const signers = iset.signers;

    if (instructions.length === 0) {
      continue;
    }

    let transaction = new Transaction();
    instructions.forEach((instruction) => transaction.add(instruction));
    transaction.recentBlockhash = block.blockhash;
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map((s) => s.publicKey)
    );

    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }
    unsignedTxns.push(transaction);
  }
  unsignedTxns.push(...afterTransactions);

  const partiallySignedTransactions = unsignedTxns.filter((t) => t.signatures.find((sig) => sig.publicKey.equals(wallet.publicKey)));
  const fullySignedTransactions = unsignedTxns.filter((t) => !t.signatures.find((sig) => sig.publicKey.equals(wallet.publicKey)));
  let signedTxns = await wallet.signAllTransactions(partiallySignedTransactions);
  signedTxns = fullySignedTransactions.concat(signedTxns);
  const pendingTxns: Promise<{ txid: string; slot: number }>[] = [];

  for (let i = 0; i < signedTxns.length; i++) {
    console.log('Sending signed tx ' + i);
    const signedTxnPromise = sendSignedTransaction({
      connection,
      readConnection,
      signedTransaction: signedTxns[i],
    });

    if (sequenceType !== SequenceType.Parallel) {
      try {
        await signedTxnPromise.then(({ txid, slot }) => successCallback(txid, i));
        pendingTxns.push(signedTxnPromise);
      } catch (e) {
        console.log('Failed at txn index:', i);
        console.log('Caught failure:', e);

        failCallback(e, i);
        if (sequenceType === SequenceType.StopOnFailure) {
          return {
            number: i,
            txs: await Promise.all(pendingTxns),
          };
        }
      }
    } else {
      let index = i;
      let result = signedTxnPromise
        .then((data) => {
          successCallback(data.txid, index);
          return data;
        })
        .catch((reason) => {
          failCallback(reason, index);
          return {
            txid: '',
            slot: -1,
          };
        });
      pendingTxns.push(result);
    }
  }

  if (sequenceType !== SequenceType.Parallel) {
    const result = await Promise.all(pendingTxns);
    return { number: signedTxns.length, txs: result };
  }

  return { number: signedTxns.length, txs: await Promise.all(pendingTxns) };
};

export const sendTransaction = async (
  connection: Connection,
  wallet: any,
  instructions: TransactionInstruction[] | Transaction,
  signers: Keypair[],
  awaitConfirmation = true,
  commitment: Commitment = 'singleGossip',
  includesFeePayer: boolean = false,
  block?: BlockhashAndFeeCalculator
) => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let transaction: Transaction;
  if (instructions instanceof Transaction) {
    transaction = instructions;
  } else {
    transaction = new Transaction();
    instructions.forEach((instruction) => transaction.add(instruction));
    transaction.recentBlockhash = (block || (await connection.getRecentBlockhash(commitment))).blockhash;

    if (includesFeePayer) {
      transaction.setSigners(...signers.map((s) => s.publicKey));
    } else {
      transaction.setSigners(
        // fee payed by the wallet owner
        wallet.publicKey,
        ...signers.map((s) => s.publicKey)
      );
    }

    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }
    if (!includesFeePayer) {
      transaction = await wallet.signTransaction(transaction);
    }
  }

  const rawTransaction = transaction.serialize();
  let options = {
    skipPreflight: true,
    commitment,
  };

  const txid = await connection.sendRawTransaction(rawTransaction, options);
  let slot = 0;

  if (awaitConfirmation) {
    const confirmation = await awaitTransactionSignatureConfirmation(txid, DEFAULT_TIMEOUT, connection, commitment);

    if (!confirmation) throw new Error('Timed out awaiting confirmation on transaction');
    slot = confirmation?.slot || 0;

    if (confirmation?.err) {
      const errors = await getErrorForTransaction(connection, txid);

      console.log(errors);
      throw new Error(`Raw transaction ${txid} failed`);
    }
  }

  return { txid, slot };
};

export const sendTransactionWithRetry = async (
  connection: Connection,
  wallet: any,
  instructions: TransactionInstruction[],
  signers: Keypair[],
  commitment: Commitment = 'singleGossip',
  includesFeePayer: boolean = false,
  block?: BlockhashAndFeeCalculator,
  beforeSend?: () => void
) => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let transaction = new Transaction();
  instructions.forEach((instruction) => transaction.add(instruction));
  transaction.recentBlockhash = (block || (await connection.getRecentBlockhash(commitment))).blockhash;

  if (includesFeePayer) {
    transaction.setSigners(...signers.map((s) => s.publicKey));
  } else {
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map((s) => s.publicKey)
    );
  }

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  if (!includesFeePayer) {
    transaction = await wallet.signTransaction(transaction);
  }

  if (beforeSend) {
    beforeSend();
  }

  const { txid, slot } = await sendSignedTransaction({
    connection,
    readConnection: connection,
    signedTransaction: transaction,
  });

  return { txid, slot };
};

export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};

export async function sendSignedTransaction({
  signedTransaction,
  connection,
  readConnection,
  timeout = DEFAULT_TIMEOUT,
}: {
  signedTransaction: Transaction;
  connection: Connection;
  readConnection: Connection;
  timeout?: number;
}): Promise<{ txid: string; slot: number }> {
  const rawTransaction = signedTransaction.serialize();

  const startTime = getUnixTs();
  let slot = 0;
  const txid: TransactionSignature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
  });

  console.log('Awaiting confirmation for', txid);

  let done = false;
  (async () => {
    while (!done && getUnixTs() - startTime < timeout) {
      await sleep(5000);
      console.log('resending transaction');
      connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      });
    }
  })();

  try {
    const confirmation = await awaitTransactionSignatureConfirmation(txid, timeout, readConnection, 'recent', true);

    if (!confirmation) throw new Error('Timed out awaiting confirmation on transaction');

    if (confirmation.err) {
      console.error(confirmation.err);
      throw new Error('Transaction failed: Custom instruction error');
    }

    slot = confirmation?.slot || 0;
  } catch (err: any) {
    throw err;
  } finally {
    done = true;
  }

  // console.log('Latency', txid, getUnixTs() - startTime);
  return { txid, slot };
}

async function simulateTransaction(
  connection: Connection,
  transaction: Transaction,
  commitment: Commitment
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  // @ts-ignore
  transaction.recentBlockhash = await connection._recentBlockhash(
    // @ts-ignore
    connection._disableBlockhashCaching
  );

  const signData = transaction.serializeMessage();
  // @ts-ignore
  const wireTransaction = transaction._serialize(signData);
  const encodedTransaction = wireTransaction.toString('base64');
  const config: any = { encoding: 'base64', commitment };
  const args = [encodedTransaction, config];

  // @ts-ignore
  const res = await connection._rpcRequest('simulateTransaction', args);
  if (res.error) {
    throw new Error('failed to simulate transaction: ' + res.error.message);
  }
  return res.result;
}

async function awaitTransactionSignatureConfirmation(
  txid: TransactionSignature,
  timeout: number,
  connection: Connection,
  commitment: Commitment = 'recent',
  queryStatus = false
): Promise<SignatureStatus | null | void> {
  let done = false;
  let status: SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      reject({ timeout: true });
    }, timeout);
    try {
      subId = connection.onSignature(
        txid,
        (result, context) => {
          done = true;
          status = {
            err: result.err,
            slot: context.slot,
            confirmations: 0,
          };
          if (result.err) {
            //console.log('Rejected via websocket', result.err);
            reject(status);
          } else {
            //console.log('Resolved via websocket', result);
            resolve(status);
          }
        },
        commitment
      );
    } catch (e) {
      done = true;
      console.error('WS error in setup', txid, e);
    }
    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([txid]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              //console.log('REST null result for', txid, status);
            } else if (status.err) {
              //console.log('REST error for', txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              //console.log('REST no confirmations for', txid, status);
            } else {
              //console.log('REST confirmation for', txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            //console.log('REST connection error: txid', txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  connection.removeSignatureListener(subId);
  done = true;
  
  return status;
}
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
