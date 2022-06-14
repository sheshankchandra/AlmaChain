use anchor_lang::prelude::*;

pub mod errors;
pub mod state;

use errors::ErrorCode;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod degree_registry {
    use super::*;

    pub fn issue_degree(
        ctx: Context<IssueDegree>,
        roll_number: String,
        student_name: String,
        degree_title: String,
        graduation_year: u16,
        cgpa: u16,
    ) -> Result<()> {
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

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(roll_number: String)]
pub struct IssueDegree<'info> {
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

    #[account(mut)]
    pub university: Signer<'info>,

    pub student_wallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
