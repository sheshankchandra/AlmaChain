use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Roll number exceeds the maximum allowed length of 16 characters.")]
    RollNumberTooLong,

    #[msg("Student name exceeds the maximum allowed length of 48 characters.")]
    NameTooLong,

    #[msg("Degree title exceeds the maximum allowed length of 64 characters.")]
    DegreeTitleTooLong,

    #[msg("The academic degree has already been revoked.")]
    AlreadyRevoked,

    #[msg("Unauthorized: Signer is not authorized to modify this degree record.")]
    UnauthorizedIssuer,

    #[msg("Invalid CGPA: Must be between 0 and 1000 (representing 0.00 to 10.00).")]
    InvalidCgpa,
}
