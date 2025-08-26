// generate.ts (Node 18+, ESM or TS)
import { HDNodeWallet, Mnemonic, wordlists, randomBytes } from 'ethers'
import fs from 'fs'

// --- 12-word ---
const wallet12 = HDNodeWallet.createRandom(
  '', // no BIP39 passphrase
  "m/44'/60'/0'/0/0", // first Ethereum account
  wordlists.en // v6 Wordlist object, not "en" string
)
const wallet12Info = `=== 12-word ===
Mnemonic: ${wallet12.mnemonic.phrase}
Private Key: ${wallet12.privateKey}
Address: ${wallet12.address}`

console.log(wallet12Info)

// --- 24-word ---
// In v6, use Mnemonic.fromEntropy(32 bytes) to get 24 words.
const m24 = Mnemonic.fromEntropy(randomBytes(32)) // 32 bytes => 24 words
const wallet24 = HDNodeWallet.fromMnemonic(m24, "m/44'/60'/0'/0/0")
const wallet24Info = `
=== 24-word ===
Mnemonic: ${wallet24.mnemonic.phrase}
Private Key: ${wallet24.privateKey}
Address: ${wallet24.address}`

console.log(wallet24Info)

fs.writeFileSync('wallet.txt', `${wallet12Info}
${wallet24Info}
`)

console.log('\nSaved wallet info to wallet.txt')
