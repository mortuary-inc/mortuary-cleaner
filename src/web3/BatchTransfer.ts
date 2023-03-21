import { InstructionSet } from '@holaplex/solana-web3-tools';
import { createBurnNftInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createBurnInstruction, createCloseAccountInstruction, createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { toMap } from '../utils/collections';
import { sendTransactions, SequenceType } from './metaplex/connection';
import { getTokenAccountsByOwner, TokenInfos, tryLoadMetaplexData } from './TokensLoader';
import * as web3 from '@solana/web3.js';

export async function doBatchTransfer(
  connection: web3.Connection,
  wallet: AnchorWallet,
  target: web3.PublicKey,
  tokens: TokenInfos[],
  progressCb: (index: number) => void,
  errorCb: (index: number, error: any) => void
) {
  let existingTokenAccountsList = await connection.getParsedTokenAccountsByOwner(target, { programId: TOKEN_PROGRAM_ID });
  let existingTokenAccounts = existingTokenAccountsList.value.reduce((prev, curr) => {
    prev.set(curr.pubkey.toString(), curr.account);
    return prev;
  }, new Map<string, any>());

  let allTargetTokenAccountPromises = tokens.map((t) =>
    getAssociatedTokenAddress(new web3.PublicKey(t.mint), target)
  );
  let allTargetTokenAccount = await Promise.all(allTargetTokenAccountPromises);
  if (allTargetTokenAccount.length !== tokens.length) {
    throw new Error('Unable to get all ATA for selected mint');
  }

  // max 7 by tx
  let instructionsSets: InstructionSet[] = [];
  let instructions: web3.TransactionInstruction[] = [];
  instructionsSets.push({
    instructions: instructions,
    signers: [],
  });

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    let toAta = allTargetTokenAccount[i];
    let exist = existingTokenAccounts.get(toAta.toString());
    if (!exist) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          toAta,
          target,
          new web3.PublicKey(token.mint),
        )
      );
    }
    instructions.push(
      createTransferInstruction(new web3.PublicKey(token.address), toAta, wallet.publicKey, token.amount)
    );
    instructions.push(createCloseAccountInstruction(new web3.PublicKey(token.address), wallet.publicKey, wallet.publicKey));

    if ((i + 1) % 7 === 0 && i > 0) {
      instructions = [];
      instructionsSets.push({
        instructions: instructions,
        signers: [],
      });
    }
  }

  let result = await sendTransactions(
    connection,
    connection,
    wallet,
    instructionsSets,
    SequenceType.Parallel,
    'confirmed',
    // success callback
    (txId: string, index: number) => {
      progressCb(index);
    },
    // failure callback
    (error: any, index: number) => {
      errorCb(index, error);
      return true;
    }
  );
  console.log(JSON.stringify(result));
}

export async function doBatchBurnAndClose(
  connection: web3.Connection,
  wallet: AnchorWallet,
  tokens: TokenInfos[],
  progressCb: (index: number) => void,
  errorCb: (index: number, error: any) => void
) {
  // max 12 by tx
  let instructionsSets: InstructionSet[] = [];
  let instructions: web3.TransactionInstruction[] = [];
  instructionsSets.push({
    instructions: instructions,
    signers: [],
  });

  let allMetaplexData = await tryLoadMetaplexData(connection, tokens);
  let metaplexDataByMint = toMap(allMetaplexData, "mint");
  console.log("Metaplex burn candidates: " + allMetaplexData.length);

  let count = 0;
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];

    let metaplexBurnable = metaplexDataByMint.get(token.mint);
    if (metaplexBurnable) {
      // metaplex burn
      instructions.push(
        createBurnNftInstruction({
          metadata: new web3.PublicKey(metaplexBurnable.metadataAddress),
          owner: wallet.publicKey,
          mint: new web3.PublicKey(metaplexBurnable.mint),
          tokenAccount: new web3.PublicKey(metaplexBurnable.tokenAddress),
          masterEditionAccount: new web3.PublicKey(metaplexBurnable.masterEditionAddress),
          splTokenProgram: TOKEN_PROGRAM_ID,
          collectionMetadata: metaplexBurnable.collectionMetadataAddress ? new web3.PublicKey(metaplexBurnable.collectionMetadataAddress) : undefined,
        })
      );
      count = count + 2;
    } else {
      // Regular burn + close
      if (token.amount > 0) {
        instructions.push(
          createBurnInstruction(
            new web3.PublicKey(token.address),
            new web3.PublicKey(token.mint),
            wallet.publicKey,
            token.amount
          )
        );
      }
      instructions.push(createCloseAccountInstruction(new web3.PublicKey(token.address), wallet.publicKey, wallet.publicKey));
      count = count + 1;
    }

    if (count % 12 === 0) {
      instructions = [];
      instructionsSets.push({
        instructions: instructions,
        signers: [],
      });
    }
  }

  let result = await sendTransactions(
    connection,
    connection,
    wallet,
    instructionsSets,
    SequenceType.Parallel,
    'confirmed',
    // success callback
    (txId: string, index: number) => {
      progressCb(index);
    },
    // failure callback
    (error: any, index: number) => {
      errorCb(index, error);
      return true;
    }
  );
  console.log(JSON.stringify(result));
}

// aims to be called from the 'main' user wallet (not a burner)
// we do an additonal check that the token amount == 0
export async function doBatchClose(
  connection: web3.Connection,
  wallet: AnchorWallet,
  tokens: TokenInfos[],
  progressCb: (index: number) => void,
  errorCb: (index: number, error: any) => void
) {

  let reloaded = await getTokenAccountsByOwner(connection, wallet.publicKey);
  for (let token of tokens) {
    let found = reloaded.find((reload) => reload.pubkey === token.address);
    if (!found) throw new Error("Cannot reload data for account " + token.address);
    if (found.amount > 0) throw new Error("Cannot close account with remaining supply " + token.address + " : " + found.uiAmount);
  }

  // max 12 by tx
  let instructionsSets: InstructionSet[] = [];
  let instructions: web3.TransactionInstruction[] = [];
  instructionsSets.push({
    instructions: instructions,
    signers: [],
  });

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    instructions.push(createCloseAccountInstruction(new web3.PublicKey(token.address), wallet.publicKey, wallet.publicKey));
    if ((i + 1) % 12 === 0 && i > 0) {
      instructions = [];
      instructionsSets.push({
        instructions: instructions,
        signers: [],
      });
    }
  }

  let result = await sendTransactions(
    connection,
    connection,
    wallet,
    instructionsSets,
    SequenceType.Parallel,
    'confirmed',
    // success callback
    (txId: string, index: number) => {
      progressCb(index);
    },
    // failure callback
    (error: any, index: number) => {
      errorCb(index, error);
      return true;
    }
  );
  console.log(JSON.stringify(result));
}
