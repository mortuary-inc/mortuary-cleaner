import { AnyPublicKey } from '@metaplex-foundation/mpl-core';
import { AccountLayout } from '@solana/spl-token';
import { AccountInfo, Commitment, Connection } from '@solana/web3.js';
import * as web3 from '@solana/web3.js';

let accountInfoCache = new Map<string, AccountInfo<Buffer>>();
let accountEmptyInfoCache = new Map<string, boolean>();

export async function getInfos(connection: Connection, pubkeys: AnyPublicKey[], useCache: boolean, commitment: Commitment = 'recent') {

  const results = new Map<AnyPublicKey, AccountInfo<Buffer>>();

  let remainingPubkeys: AnyPublicKey[] = [];
  if (useCache) {
    for (let pk of pubkeys) {
      let c = accountInfoCache.get(pk.toString());
      if (c) {
        results.set(pk, c);
      } else {
        let empty = accountEmptyInfoCache.get(pk.toString());
        if (empty) {
          //console.log("Ignore non-existing account: " + pk.toString());
        } else {
          remainingPubkeys.push(pk);
        }
      }
    }
  } else {
    remainingPubkeys = pubkeys;
  }

  if (remainingPubkeys.length <= 0) {
    return results;
  }

  const BATCH_SIZE = 99; // Must batch above this limit.

  const promises: Promise<Map<AnyPublicKey, AccountInfo<Buffer>> | undefined>[] = [];
  for (let i = 0; i < remainingPubkeys.length; i += BATCH_SIZE) {
    promises.push(getMultipleAccounts(connection, remainingPubkeys.slice(i, Math.min(remainingPubkeys.length, i + BATCH_SIZE)), commitment));
  }

  let found: string[] = [];
  let res = await Promise.all(promises);
  for (let result of res) {
    if (!result) continue;
    let val = Array.from(result.entries());
    for (let v of val) {
      results.set(v[0], v[1]);
      found.push(v[0].toString());
      if (useCache) {
        accountInfoCache.set(v[0].toString(), v[1]);
      }
    }
  }

  // create list of un-existing accounts (no metadata, no master edition, etc)
  for (let pk of remainingPubkeys) {
    let exist = found.indexOf(pk.toString());
    if (exist < 0) {
      accountEmptyInfoCache.set(pk.toString(), true);
    }
  }

  return results;
}

async function getMultipleAccounts(connection: Connection, pubkeys: AnyPublicKey[], commitment: Commitment) {
  const args = connection._buildArgs([pubkeys.map((k) => k.toString())], commitment, 'base64');
  const unsafeRes = await (connection as any)._rpcRequest('getMultipleAccounts', args);
  if (unsafeRes.error) {
    throw new Error('failed to get info about accounts ' + unsafeRes.error.message);
  }
  if (!unsafeRes.result.value) return;
  const unsafeInfos = unsafeRes.result.value as (AccountInfo<string[]> | null)[];
  return unsafeInfos.reduce((acc, unsafeInfo, index) => {
    if (unsafeInfo) {
      acc.set(pubkeys[index], {
        ...unsafeInfo,
        data: Buffer.from(unsafeInfo.data[0], 'base64'),
      } as AccountInfo<Buffer>);
    }
    return acc;
  }, new Map<AnyPublicKey, AccountInfo<Buffer>>());
}

export async function getInfosTuple(connection: Connection, pubkeys: AnyPublicKey[], useCache: boolean, commitment: Commitment = 'recent') {
  let map = await getInfos(connection, pubkeys, useCache, commitment);
  let result: Array<AccountInfo<Buffer> | undefined> = [];
  for (let pk of pubkeys) {
    let account = map.get(pk.toString());
    result.push(account);
  }
  return result;
}

export async function getInfo(connection: Connection, pubkeys: AnyPublicKey, useCache: boolean, commitment: Commitment = 'recent') {
  let map = await getInfos(connection, [pubkeys], useCache, commitment);
  let all = Array.from(map.values());
  return all[0];
}


export function decodeTokenAccount(address: AnyPublicKey, info: AccountInfo<Buffer>) {
  const data = Buffer.from(info.data);
  const accountInfo = AccountLayout.decode(data);

  return {
    address: new web3.PublicKey(address.toString()),
    mint: new web3.PublicKey(accountInfo.mint),
    owner: new web3.PublicKey(accountInfo.owner),
    amount: accountInfo.amount,
  }
}