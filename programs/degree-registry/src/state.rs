use anchor_lang::prelude::*;

/// Status representing the lifecycle of an on-chain academic credential.
/// 
/// In Borsh serialization, an enum with fewer than 256 variants consumes exactly 1 byte
/// representing the variant discriminant (0 for Active, 1 for Revoked).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CredentialStatus {
    /// The credential is valid, unrevoked, and active.
    Active,
    /// The credential has been formally invalidated by the issuing university authority.
    Revoked,
}

/// On-chain state account holding an immutable, verifiable academic credential.
///
/// =========================================================================================
/// ALMACHAIN ARCHITECTURAL NOTE: SOULBOUND BY NATIVE PDA TOPOLOGY
/// =========================================================================================
/// Traditional credential implementations wrap SPL Tokens (ERC-721 equivalent) and attempt
/// to "freeze" accounts or intercept transfers. This creates unnecessary overhead, reliance
/// on token metadata programs (e.g. Metaplex), and security attack surfaces.
///
/// In this protocol:
/// 1. The account is a Program Derived Address (PDA) deterministically derived from:
///    `[b"degree", university.key().as_ref(), roll_number.as_bytes()]`.
/// 2. Ownership of the account belongs exclusively to this program (`degree_registry`).
/// 3. The `student_wallet` is stored as an immutable data attribute of the degree.
/// 4. The program exposes NO transfer, reassignment, or key-update instructions.
/// 5. Therefore, it is mathematically impossible for the credential to be sold, auctioned,
///    delegated, or transferred between wallets. It is natively and permanently "Soulbound"
///    to the student's cryptographic identity on the Solana ledger.
/// =========================================================================================
#[account]
pub struct DegreeRecord {
    /// The public key of the university authority (Registrar) that issued this degree.
    /// Acts as the single authorized entity permitted to revoke or manage this record.
    pub university: Pubkey,

    /// The recipient student's public key (their on-chain identity).
    pub student_wallet: Pubkey,

    /// Student institutional roll number (e.g., "1913128"), max 16 UTF-8 characters.
    pub roll_number: String,

    /// Full legal name of the student, max 48 UTF-8 characters.
    pub student_name: String,

    /// Degree title (e.g., "Bachelor of Technology in Computer Science"), max 64 UTF-8 characters.
    pub degree_title: String,

    /// Year of degree conferral / graduation (e.g., 2023).
    pub graduation_year: u16,

    /// Cumulative Grade Point Average (CGPA) scaled by 100 (e.g., 8.32 CGPA is stored as 832).
    /// Prevents floating point non-determinism in consensus validation.
    pub cgpa: u16,

    /// Current verification status of the degree (Active = 0, Revoked = 1).
    pub status: CredentialStatus,

    /// Unix timestamp (in seconds) of when the degree was issued, derived from Clock sysvar.
    pub issued_at: i64,

    /// Canonical PDA bump seed stored for cheap zero-CPI seed verification in subsequent calls.
    pub bump: u8,
}

impl DegreeRecord {
    // Maximum string bounds enforced during issuance
    pub const MAX_ROLL_NUMBER_LEN: usize = 16;
    pub const MAX_STUDENT_NAME_LEN: usize = 48;
    pub const MAX_DEGREE_TITLE_LEN: usize = 64;

    /// =====================================================================================
    /// EXACT MEMORY & SPACE CALCULATION (Borsh serialization layout):
    /// =====================================================================================
    /// 1. Anchor Account Discriminator: 8 bytes (Sha256("account:DegreeRecord")[..8])
    /// 2. university:                   32 bytes (Pubkey)
    /// 3. student_wallet:               32 bytes (Pubkey)
    /// 4. roll_number:                  4 bytes (String length prefix) + 16 bytes = 20 bytes
    /// 5. student_name:                 4 bytes (String length prefix) + 48 bytes = 52 bytes
    /// 6. degree_title:                 4 bytes (String length prefix) + 64 bytes = 68 bytes
    /// 7. graduation_year:              2 bytes (u16)
    /// 8. cgpa:                         2 bytes (u16)
    /// 9. status:                       1 byte  (CredentialStatus enum)
    /// 10. issued_at:                   8 bytes (i64)
    /// 11. bump:                        1 byte  (u8)
    /// -------------------------------------------------------------------------------------
    /// Total Byte Count: 8 + 32 + 32 + (4 + 16) + (4 + 48) + (4 + 64) + 2 + 2 + 1 + 8 + 1
    ///                 = 8 + 32 + 32 + 20 + 52 + 68 + 2 + 2 + 1 + 8 + 1
    ///                 = 226 bytes
    /// =====================================================================================
    pub const SPACE: usize = 8   // discriminator
        + 32                    // university
        + 32                    // student_wallet
        + (4 + Self::MAX_ROLL_NUMBER_LEN)  // roll_number
        + (4 + Self::MAX_STUDENT_NAME_LEN) // student_name
        + (4 + Self::MAX_DEGREE_TITLE_LEN) // degree_title
        + 2                     // graduation_year
        + 2                     // cgpa
        + 1                     // status
        + 8                     // issued_at
        + 1;                    // bump
}
