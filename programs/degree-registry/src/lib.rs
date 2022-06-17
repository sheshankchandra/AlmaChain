use anchor_lang::prelude::*;

pub mod errors;
pub mod state;

use errors::ErrorCode;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/// =========================================================================================
/// ALMACHAIN: ON-CHAIN ACADEMIC CREDENTIALING PROTOCOL VIA SOULBOUND STATE ACCOUNTS
/// Department of Computer Science & Engineering, National Institute of Technology Silchar
/// =========================================================================================
/// 
/// WHY THIS DESIGN IS NATURALLY SOULBOUND:
/// In conventional blockchain token standards (ERC-721, SPL Token), an asset is transferable
/// by default because the token program contains `transfer`, `approve`, and `set_authority`
/// instructions. Projects seeking "soulbound" behavior on EVM or SPL often patch this by
/// overriding transfers, adding blacklists, or freezing token accounts—fragile band-aids.
///
/// In contrast, Solana's native account model separates execution code (Programs) from
/// data storage (Accounts). A Solana account can ONLY be modified by the program assigned
/// as its `owner`.
///
/// In this `degree-registry` program:
/// 1. The `DegreeRecord` account is owned exclusively by this smart contract.
/// 2. The account PDA is derived from `[b"degree", university_pubkey, roll_number]`.
/// 3. The `student_wallet` is stored as an immutable cryptographic identifier in account data.
/// 4. This program EXPOSES NO INSTRUCTION TO:
///    - Transfer the account to another wallet
///    - Update or mutate the `student_wallet` pubkey
///    - Delegate approval or custody of the record
///
/// Because the program is the sole entity with authority to write to this account, and
/// because its state transition graph completely omits transfer mechanics, the credential
/// is mathematically and immutably locked to the student identity. It is natively Soulbound
/// at the distributed state machine layer without requiring secondary wrappers or off-chain
/// enforcement.
/// =========================================================================================

#[program]
pub mod degree_registry {
    use super::*;

    /// Issues an immutable academic credential directly into a dedicated Solana PDA.
    ///
    /// # Parameters:
    /// - `roll_number`: Institutional student identification (e.g., "1913128"), max 16 chars.
    /// - `student_name`: Student full name, max 48 chars.
    /// - `degree_title`: Degree conferring title, max 64 chars.
    /// - `graduation_year`: Year of graduation (u16).
    /// - `cgpa`: Cumulative Grade Point Average scaled by 100 (e.g., 8.32 -> 832).
    pub fn issue_degree(
        ctx: Context<IssueDegree>,
        roll_number: String,
        student_name: String,
        degree_title: String,
        graduation_year: u16,
        cgpa: u16,
    ) -> Result<()> {
        // Enforce boundary constraints to protect account size and prevent buffer overruns
        require!(
            roll_number.len() <= DegreeRecord::MAX_ROLL_NUMBER_LEN,
            ErrorCode::RollNumberTooLong
        );
        require!(
            student_name.len() <= DegreeRecord::MAX_STUDENT_NAME_LEN,
            ErrorCode::NameTooLong
        );
        require!(
            degree_title.len() <= DegreeRecord::MAX_DEGREE_TITLE_LEN,
            ErrorCode::DegreeTitleTooLong
        );
        require!(
            cgpa <= 1000,
            ErrorCode::InvalidCgpa
        );

        let degree_record = &mut ctx.accounts.degree_record;
        let clock = Clock::get()?;

        degree_record.university = ctx.accounts.university.key();
        degree_record.student_wallet = ctx.accounts.student_wallet.key();
        degree_record.roll_number = roll_number.clone();
        degree_record.student_name = student_name;
        degree_record.degree_title = degree_title;
        degree_record.graduation_year = graduation_year;
        degree_record.cgpa = cgpa;
        degree_record.status = CredentialStatus::Active;
        degree_record.issued_at = clock.unix_timestamp;
        degree_record.bump = *ctx.bumps.get("degree_record").unwrap();

        msg!(
            "Academic Credential Issued: Roll Number '{}' for Student '{}' by University '{}'",
            roll_number,
            degree_record.student_wallet,
            degree_record.university
        );

        emit!(DegreeConferredEvent {
            university: degree_record.university,
            student_wallet: degree_record.student_wallet,
            roll_number: degree_record.roll_number.clone(),
            graduation_year: degree_record.graduation_year,
            cgpa: degree_record.cgpa,
            issued_at: degree_record.issued_at,
        });

        Ok(())
    }

    /// Revokes an academic credential in case of academic misconduct, administrative recall,
    /// or degree cancellation.
    ///
    /// CRITICAL AUDITABILITY NOTE:
    /// Notice that this instruction does NOT close the account (no `close = ...` constraint).
    /// The account remains permanently on the Solana ledger with status = `Revoked`.
    /// This ensures complete cryptographic transparency and audit history—an employer or
    /// verification body can deterministically see that the credential existed but was
    /// subsequently invalidated by the university.
    pub fn revoke_degree(ctx: Context<RevokeDegree>) -> Result<()> {
        let degree_record = &mut ctx.accounts.degree_record;
        let clock = Clock::get()?;

        // Prevent redundant revocation
        require!(
            degree_record.status != CredentialStatus::Revoked,
            ErrorCode::AlreadyRevoked
        );

        degree_record.status = CredentialStatus::Revoked;

        msg!(
            "Academic Credential REVOKED: Roll Number '{}' under University '{}'",
            degree_record.roll_number,
            degree_record.university
        );

        emit!(DegreeRevokedEvent {
            university: ctx.accounts.university.key(),
            roll_number: degree_record.roll_number.clone(),
            revoked_at: clock.unix_timestamp,
        });

        Ok(())
    }
}

/// Event emitted upon successful degree conferral and on-chain account allocation.
#[event]
pub struct DegreeConferredEvent {
    pub university: Pubkey,
    pub student_wallet: Pubkey,
    pub roll_number: String,
    pub graduation_year: u16,
    pub cgpa: u16,
    pub issued_at: i64,
}

/// Event emitted when an academic credential is invalidated by the Registrar authority.
#[event]
pub struct DegreeRevokedEvent {
    pub university: Pubkey,
    pub roll_number: String,
    pub revoked_at: i64,
}

/// Accounts context for the `issue_degree` instruction.
#[derive(Accounts)]
#[instruction(roll_number: String)]
pub struct IssueDegree<'info> {
    /// The derived PDA storing the degree record.
    /// Seed layout: ["degree", university_pubkey, roll_number_bytes]
    /// This ensures:
    /// 1. Each roll number within an issuing university is globally unique on-chain.
    /// 2. Any verifier can deterministically compute this address without an off-chain indexer.
    #[account(
        init,
        payer = university,
        space = DegreeRecord::SPACE,
        seeds = [
            b"degree",
            university.key().as_ref(),
            roll_number.as_bytes()
        ],
        bump
    )]
    pub degree_record: Account<'info, DegreeRecord>,

    /// The University Registrar authority. Must sign the transaction and fund rent exemption.
    #[account(mut)]
    pub university: Signer<'info>,

    /// The student's Solana wallet address.
    /// 
    /// CHECK: This account does not execute instructions and is not required to sign.
    /// It serves purely as an immutable public key identity record bound to the credential.
    pub student_wallet: AccountInfo<'info>,

    /// Solana System Program required for account creation and rent transfer.
    pub system_program: Program<'info, System>,
}

/// Accounts context for the `revoke_degree` instruction.
#[derive(Accounts)]
pub struct RevokeDegree<'info> {
    /// The degree record PDA to be revoked.
    /// `has_one = university` enforces that the signer MUST be the identical authority
    /// that originally issued the credential.
    #[account(
        mut,
        has_one = university @ ErrorCode::UnauthorizedIssuer,
        seeds = [
            b"degree",
            degree_record.university.as_ref(),
            degree_record.roll_number.as_bytes()
        ],
        bump = degree_record.bump
    )]
    pub degree_record: Account<'info, DegreeRecord>,

    /// The university signing authority attempting revocation.
    pub university: Signer<'info>,
}
