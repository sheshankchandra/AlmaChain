use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CredentialStatus {
    Active,
    Revoked,
}

#[account]
pub struct DegreeRecord {
    pub university: Pubkey,
    pub student_wallet: Pubkey,
    pub roll_number: String,
    pub student_name: String,
    pub degree_title: String,
    pub graduation_year: u16,
    pub cgpa: u16,
    pub status: CredentialStatus,
    pub issued_at: i64,
    pub bump: u8,
}
