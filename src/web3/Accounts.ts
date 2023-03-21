import * as web3 from '@solana/web3.js';

export const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export async function getMasterEditionAddress(mint: web3.PublicKey): Promise<web3.PublicKey> {
  const adr = await web3.PublicKey.findProgramAddress(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from('edition')],
    TOKEN_METADATA_PROGRAM_ID
  );
  return adr[0];
}

export async function getMetadataAddress(mint: web3.PublicKey): Promise<web3.PublicKey> {
  const adr = await web3.PublicKey.findProgramAddress(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  return adr[0];
}
