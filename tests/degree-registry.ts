import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect, assert } from "chai";

describe("AlmaChain protocol integration tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // In Anchor 0.24.2, program is loaded via workspace
  const program = anchor.workspace.DegreeRegistry as Program<any>;

  // Keypairs for cryptographic actors in the research experiment
  const university = Keypair.generate(); // The Registrar authority (NIT Silchar)
  const student = Keypair.generate();    // The recipient student identity
  const attacker = Keypair.generate();   // Rogue third party attempting unauthorized revocation

  // Benchmark academic credential payload
  const rollNumber = "1913128";
  const studentName = "Sheshank Chandra Pothu";
  const degreeTitle = "B.Tech Computer Science & Engineering";
  const graduationYear = 2023;
  const cgpa = 832; // Scaled x100 (8.32 CGPA)

  // PDA address & canonical bump
  let degreePda: PublicKey;
  let degreeBump: number;

  before(async () => {
    // Airdrop SOL to test actors on localnet
    const airdropAmount = 5 * LAMPORTS_PER_SOL;

    const txUni = await provider.connection.requestAirdrop(university.publicKey, airdropAmount);
    await provider.connection.confirmTransaction(txUni);

    const txAttacker = await provider.connection.requestAirdrop(attacker.publicKey, airdropAmount);
    await provider.connection.confirmTransaction(txAttacker);

    // Compute deterministic PDA using standard seeds
    [degreePda, degreeBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("degree"),
        university.publicKey.toBuffer(),
        Buffer.from(rollNumber),
      ],
      program.programId
    );
  });

  it("1. Happy Path: University signs and issues a degree for Roll No 1913128", async () => {
    // University issues the credential into the PDA
    const tx = await program.methods
      .issueDegree(
        rollNumber,
        studentName,
        degreeTitle,
        graduationYear,
        cgpa
      )
      .accounts({
        degreeRecord: degreePda,
        university: university.publicKey,
        studentWallet: student.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([university])
      .rpc();

    // Verify account state on-chain
    const record = await program.account.degreeRecord.fetch(degreePda);

    assert.equal(
      record.university.toBase58(),
      university.publicKey.toBase58(),
      "University authority pubkey must match the issuer"
    );
    assert.equal(
      record.studentWallet.toBase58(),
      student.publicKey.toBase58(),
      "Student identity pubkey must be permanently bound to record"
    );
    assert.equal(record.rollNumber, rollNumber, "Roll number must match input");
    assert.equal(record.studentName, studentName, "Student name must match input");
    assert.equal(record.degreeTitle, degreeTitle, "Degree title must match input");
    assert.equal(record.graduationYear, graduationYear, "Graduation year must match input");
    assert.equal(record.cgpa, cgpa, "Scaled CGPA must match input (832 = 8.32)");
    assert.deepEqual(record.status, { active: {} }, "Status must be Active on issuance");
    assert.isAbove(record.issuedAt.toNumber(), 0, "Unix timestamp must be recorded");
    assert.equal(record.bump, degreeBump, "Bump seed must match canonical derivation");
  });

  it("2. Deterministic Lookup: Resolves credential using ONLY PDA seeds without prior address knowledge", async () => {
    // An employer or graduate school needs zero centralized APIs or databases:
    // They only need: (1) University Pubkey, (2) Student Roll Number.
    const [lookupAddress] = await PublicKey.findProgramAddress(
      [
        Buffer.from("degree"),
        university.publicKey.toBuffer(),
        Buffer.from("1913128"),
      ],
      program.programId
    );

    assert.equal(
      lookupAddress.toBase58(),
      degreePda.toBase58(),
      "Derived lookup address must exactly match the on-chain degree PDA"
    );

    const verifiedRecord = await program.account.degreeRecord.fetch(lookupAddress);
    assert.equal(verifiedRecord.studentName, "Sheshank Chandra Pothu");
    assert.equal(verifiedRecord.cgpa, 832);
    assert.deepEqual(verifiedRecord.status, { active: {} });
  });

  it("3. Immutability / Re-issuance Prevention: Re-issuing the same roll number fails", async () => {
    // Attempt to overwrite the existing degree record for roll number 1913128
    try {
      await program.methods
        .issueDegree(
          rollNumber,
          "Fraudulent Student Name",
          "M.Tech Data Science",
          2024,
          999
        )
        .accounts({
          degreeRecord: degreePda,
          university: university.publicKey,
          studentWallet: Keypair.generate().publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([university])
        .rpc();

      assert.fail("Transaction should have failed because the PDA is already initialized");
    } catch (err: any) {
      // In Anchor, attempting to re-init an allocated account throws a system error (account already in use)
      expect(err.toString()).to.satisfy((msg: string) => {
        return (
          msg.includes("already in use") ||
          msg.includes("custom program error: 0x0") ||
          msg.includes("Instruction: Initialize") ||
          msg.includes("failed to send transaction")
        );
      });
    }

    // Verify original data remains untampered
    const record = await program.account.degreeRecord.fetch(degreePda);
    assert.equal(record.studentName, "Sheshank Chandra Pothu");
    assert.equal(record.cgpa, 832);
  });

  it("4. Unauthorized Revocation: Attacker fails to revoke degree", async () => {
    // Attacker signs instead of university
    try {
      await program.methods
        .revokeDegree()
        .accounts({
          degreeRecord: degreePda,
          university: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();

      assert.fail("Revocation should have been rejected for unauthorized signer");
    } catch (err: any) {
      // Must fail with ConstraintHasOne or UnauthorizedIssuer error code
      expect(err.toString()).to.satisfy((msg: string) => {
        return (
          msg.includes("UnauthorizedIssuer") ||
          msg.includes("ConstraintHasOne") ||
          msg.includes("2001") ||
          msg.includes("A has_one constraint was violated") ||
          msg.includes("Unauthorized")
        );
      });
    }

    // Verify credential remains Active
    const record = await program.account.degreeRecord.fetch(degreePda);
    assert.deepEqual(record.status, { active: {} });
  });

  it("5. Authorized Revocation: University authority revokes degree and preserves historical state", async () => {
    // Legitimate university authority executes revocation
    await program.methods
      .revokeDegree()
      .accounts({
        degreeRecord: degreePda,
        university: university.publicKey,
      })
      .signers([university])
      .rpc();

    // Verify state transition
    const revokedRecord = await program.account.degreeRecord.fetch(degreePda);
    assert.deepEqual(
      revokedRecord.status,
      { revoked: {} },
      "Credential status must transition to Revoked"
    );

    // Verify all original student data remains fully intact on-chain for auditability
    assert.equal(revokedRecord.studentName, "Sheshank Chandra Pothu");
    assert.equal(revokedRecord.rollNumber, "1913128");
    assert.equal(revokedRecord.cgpa, 832);

    // Attempting to revoke again must fail with AlreadyRevoked error
    try {
      await program.methods
        .revokeDegree()
        .accounts({
          degreeRecord: degreePda,
          university: university.publicKey,
        })
        .signers([university])
        .rpc();

      assert.fail("Subsequent revocation must fail with AlreadyRevoked");
    } catch (err: any) {
      expect(err.toString()).to.satisfy((msg: string) => {
        return (
          msg.includes("AlreadyRevoked") ||
          msg.includes("6003") ||
          msg.includes("already been revoked")
        );
      });
    }
  });
});
