import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect, assert } from "chai";

describe("AlmaChain protocol integration tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DegreeRegistry as Program<any>;

  const university = Keypair.generate();
  const student = Keypair.generate();
  const attacker = Keypair.generate();

  const rollNumber = "1913128";
  const studentName = "Sheshank Chandra Pothu";
  const degreeTitle = "B.Tech Computer Science & Engineering";
  const graduationYear = 2023;
  const cgpa = 832;

  let degreePda: PublicKey;
  let degreeBump: number;

  before(async () => {
    const airdropAmount = 5 * LAMPORTS_PER_SOL;
    const txUni = await provider.connection.requestAirdrop(university.publicKey, airdropAmount);
    await provider.connection.confirmTransaction(txUni);

    const txAttacker = await provider.connection.requestAirdrop(attacker.publicKey, airdropAmount);
    await provider.connection.confirmTransaction(txAttacker);

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

    const record = await program.account.degreeRecord.fetch(degreePda);
    assert.equal(record.university.toBase58(), university.publicKey.toBase58());
    assert.equal(record.studentWallet.toBase58(), student.publicKey.toBase58());
    assert.equal(record.rollNumber, rollNumber);
    assert.equal(record.studentName, studentName);
    assert.deepEqual(record.status, { active: {} });
  });

  it("2. Deterministic Lookup: Resolves credential using ONLY PDA seeds without prior address knowledge", async () => {
    const [lookupAddress] = await PublicKey.findProgramAddress(
      [
        Buffer.from("degree"),
        university.publicKey.toBuffer(),
        Buffer.from("1913128"),
      ],
      program.programId
    );

    assert.equal(lookupAddress.toBase58(), degreePda.toBase58());
    const verifiedRecord = await program.account.degreeRecord.fetch(lookupAddress);
    assert.equal(verifiedRecord.studentName, "Sheshank Chandra Pothu");
  });

  it("3. Immutability / Re-issuance Prevention: Re-issuing the same roll number fails", async () => {
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
      expect(err.toString()).to.satisfy((msg: string) => {
        return (
          msg.includes("already in use") ||
          msg.includes("custom program error: 0x0") ||
          msg.includes("Instruction: Initialize") ||
          msg.includes("failed to send transaction")
        );
      });
    }
  });
});
