# AlmaChain — System Architecture & Technical Specification

> **Project:** AlmaChain: On-Chain Academic Credentialing Protocol via Soulbound State Accounts on Solana  
> **Student Author:** Sheshank Chandra Pothu (Roll No. 1913128)  
> **Faculty Guide:** Dr. Malaya Dutta Borah  
> **Institution:** National Institute of Technology Silchar — Dept. of Computer Science & Engineering  
> **Internship:** S.N. Bose Summer Internship (2022)  

---

## 1. Architectural Thesis

Traditional NFT standards (SPL tokens on Solana or ERC-721 on Ethereum) represent transferable property. Applying them to academic credentials introduces fatal design flaws:
1. **Transferability:** Tokens can be transferred, sold, or loaned between wallets.
2. **Freezing Workarounds:** Intercepting transfers by setting a permanent freeze authority requires custodial centralization and ongoing off-chain server management.
3. **Account Bloat:** A Metaplex NFT requires 4 to 5 separate accounts (Mint, Token Account, Metadata, Master Edition), multiplying rent costs.

### The Solution: Native Program Derived Addresses (PDAs)
Instead of tokens, certificates are stored directly in dedicated, program-owned Solana state accounts derived from:
```text
seeds = [b"degree", university_authority_pubkey, roll_number]
```

Because the smart contract exposes **no instruction to transfer or alter the student identity**, the degree is mathematically and natively **Soulbound** at the distributed consensus layer.

---

## 2. On-Chain State Memory Layout (Exact 226 Bytes)

Unlike EVM's sparse key-value mapping storage (`mapping(string => Degree)`), Solana accounts require explicit space allocation and rent-exemption deposits upfront.

| Offset | Field Name | Rust / Anchor Type | Borsh Serialized Size | Description |
|---|---|---|---|---|
| `0..8` | `discriminator` | `[u8; 8]` | **8 bytes** | First 8 bytes of `sha256("account:DegreeRecord")` |
| `8..40` | `university` | `Pubkey` | **32 bytes** | Signing Registrar authority key |
| `40..72` | `student_wallet` | `Pubkey` | **32 bytes** | Permanent student identity key |
| `72..92` | `roll_number` | `String` (max 16) | **20 bytes** | 4-byte Borsh length prefix + 16 UTF-8 bytes |
| `92..144` | `student_name` | `String` (max 48) | **52 bytes** | 4-byte Borsh length prefix + 48 UTF-8 bytes |
| `144..212` | `degree_title` | `String` (max 64) | **68 bytes** | 4-byte Borsh length prefix + 64 UTF-8 bytes |
| `212..214` | `graduation_year` | `u16` | **2 bytes** | Year of graduation (e.g., 2023) |
| `214..216` | `cgpa` | `u16` | **2 bytes** | Scaled x100 (e.g., 8.32 CGPA = `832`) |
| `216..217` | `status` | `CredentialStatus` | **1 byte** | Borsh enum tag (`0` = Active, `1` = Revoked) |
| `217..225` | `issued_at` | `i64` | **8 bytes** | Unix timestamp from `Clock::get()?.unix_timestamp` |
| `225..226` | `bump` | `u8` | **1 byte** | Canonical PDA derivation bump |
| **Total** | | | **226 bytes** | **Exact Space Required** |

---

## 3. Solana Account Model vs. EVM

### EVM (Ethereum) Global Storage Locks
In Solidity, credentials are typically stored in a contract mapping:
```solidity
mapping(string => Degree) public degrees;
```
Every issuance mutates the single storage trie of the contract account, requiring transactions to be processed sequentially across a global lock.

### Solana Sealevel Concurrency
Solana separates executable code (stateless programs) from data accounts:
1. Each degree record is an isolated, discrete PDA account.
2. Because transactions declare account dependencies upfront, the Solana Sealevel runtime executes degree issuances for different students in parallel across independent CPU cores without lock contention.

---

## 4. Rent Economics

- **Ethereum:** Storing ~226 bytes across ~8 storage slots via `SSTORE` burns gas permanently (~160,000 gas, costing \$15 to \$50+ per degree depending on gas prices).
- **Solana:** Storage is funded via a **refundable rent-exemption deposit**:
  $$\text{Deposit} = (128 + 226) \text{ bytes} \times 6{,}960 \text{ lamports/byte} = 2{,}463{,}840 \text{ lamports} \approx 0.00246 \text{ SOL}$$
  At \$35/SOL, this costs **less than \$0.09 (approx. ₹6–7)** per degree and keeps the record active on the ledger permanently.

---

## 5. Smart Contract Instructions

### `issue_degree`
- **Signer:** University Registrar (must sign and fund rent deposit).
- **Seeds:** `[b"degree", university.key(), roll_number]`.
- **Invariants Enforced:**
  - `roll_number.len() <= 16`
  - `student_name.len() <= 48`
  - `degree_title.len() <= 64`
  - `cgpa <= 1000`
  - Sets `status = CredentialStatus::Active`.

### `revoke_degree`
- **Authority Check:** `has_one = university @ ErrorCode::UnauthorizedIssuer`.
- **Invariants:**
  - Requires `status != Revoked`.
  - Sets `status = Revoked`.
  - **Does NOT close the account:** Omitting `close = ...` ensures the revoked credential remains on-chain permanently for audit transparency.
