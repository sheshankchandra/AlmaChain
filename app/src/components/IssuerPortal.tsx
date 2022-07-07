import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import {
  getDegreePda,
  issueDegreeDevnetNative,
  updateLocalCredentialStatus,
  getLocalCredential,
} from "../utils/solana";

export const IssuerPortal: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Form input state
  const [studentName, setStudentName] = useState("Sheshank Chandra Pothu");
  const [rollNumber, setRollNumber] = useState("1913128");
  const [studentWalletStr, setStudentWalletStr] = useState(
    wallet.publicKey ? wallet.publicKey.toBase58() : "55pVZYujV1YeBgc8ceN72qN3SdfwDU13BGeJQKnx25GG"
  );
  const [degreeTitle, setDegreeTitle] = useState(
    "Bachelor of Technology in Computer Science & Engineering"
  );
  const [graduationYear, setGraduationYear] = useState("2023");
  const [cgpa, setCgpa] = useState("8.32");

  // Operational state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [issuedPda, setIssuedPda] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRevocationPanel, setShowRevocationPanel] = useState(false);
  const [revokeRollNumber, setRevokeRollNumber] = useState("");

  const loadSampleScholar = () => {
    setStudentName("Sheshank Chandra Pothu");
    setRollNumber("1913128");
    setStudentWalletStr(wallet.publicKey?.toBase58() || "55pVZYujV1YeBgc8ceN72qN3SdfwDU13BGeJQKnx25GG");
    setDegreeTitle("Bachelor of Technology in Computer Science & Engineering");
    setGraduationYear("2023");
    setCgpa("8.32");
    setErrorMessage(null);
  };

  const handleIssueDegree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) {
      setErrorMessage("Please connect the authorized Registrar wallet first.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setTxSignature(null);
    setIsSubmitting(true);

    try {
      const trimmedRoll = rollNumber.trim();
      const trimmedName = studentName.trim();
      const trimmedDegree = degreeTitle.trim();
      const gradYearNum = parseInt(graduationYear, 10);
      const cgpaFloat = parseFloat(cgpa);

      if (!trimmedRoll || !trimmedName || !trimmedDegree) {
        throw new Error("All candidate degree fields are required.");
      }

      let studentPubkey: PublicKey;
      try {
        studentPubkey = new PublicKey(studentWalletStr.trim());
      } catch {
        throw new Error("Invalid Student Solana public key address.");
      }

      const scaledCgpa = Math.round(cgpaFloat * 100);

      const result = await issueDegreeDevnetNative(
        connection,
        wallet,
        trimmedRoll,
        trimmedName,
        studentPubkey,
        trimmedDegree,
        gradYearNum,
        scaledCgpa
      );

      setIssuedPda(result.pdaAddress.toBase58());
      setTxSignature(result.txSignature);
      setSuccessMessage(`Academic degree successfully notarized for Roll No. ${trimmedRoll}.`);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || err.toString();
      if (msg.includes("Blockhash not found")) {
        setErrorMessage(
          "Network Mismatch: Please ensure Phantom is set to Devnet (Settings > Developer Settings > Change Network > Devnet)."
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey) {
      setErrorMessage("Connect registrar wallet first.");
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const trimmed = revokeRollNumber.trim();
      const [pda] = await getDegreePda(wallet.publicKey, trimmed);
      const existing = getLocalCredential(pda);
      if (!existing) {
        throw new Error(`No credential found on record for Roll No. ${trimmed}`);
      }
      if (existing.status === "Revoked") {
        throw new Error("This credential has already been revoked.");
      }
      updateLocalCredentialStatus(pda, "Revoked");
      setSuccessMessage(`Degree for Roll No. ${trimmed} has been successfully revoked.`);
      setRevokeRollNumber("");
    } catch (err: any) {
      setErrorMessage(err.message || err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 16px" }}>
      {/* Registrar Session Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ fontSize: "11.5px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            Registrar Signing Authority
          </div>
          <div
            style={{
              fontSize: "13px",
              color: wallet.publicKey ? "#f0f6fc" : "#8b949e",
              fontWeight: 500,
              fontFamily: "monospace",
              marginTop: "2px",
            }}
          >
            {wallet.publicKey ? wallet.publicKey.toBase58() : "Wallet Disconnected"}
          </div>
        </div>
        <WalletMultiButton />
      </div>

      {/* Main Administrative Form */}
      <div
        style={{
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "28px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#f0f6fc" }}>
              Degree Record Notarization
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#8b949e" }}>
              Issues a verifiable, soulbound credential account on the Solana ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSampleScholar}
            style={{
              backgroundColor: "#21262d",
              color: "#c9d1d9",
              border: "1px solid #30363d",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Fill Sample Scholar
          </button>
        </div>

        <form onSubmit={handleIssueDegree}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={labelStyle}>Student Full Legal Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Sheshank Chandra Pothu"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Institutional Roll Number</label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 1913128"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Student Solana Public Key (Soulbound Identity)</label>
            <input
              type="text"
              value={studentWalletStr}
              onChange={(e) => setStudentWalletStr(e.target.value)}
              placeholder="Base58 Public Key"
              required
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: "13px" }}
            />
            <span style={{ fontSize: "11.5px", color: "#8b949e", display: "block", marginTop: "4px" }}>
              The credential state account permanently records this address without any transfer instructions.
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Degree Program & Department</label>
            <input
              type="text"
              value={degreeTitle}
              onChange={(e) => setDegreeTitle(e.target.value)}
              placeholder="e.g. Bachelor of Technology in Computer Science & Engineering"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label style={labelStyle}>Graduation Year</label>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Cumulative GPA (10.0 scale)</label>
              <input
                type="number"
                step="0.01"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !wallet.publicKey}
            style={{
              width: "100%",
              backgroundColor: wallet.publicKey ? "#238636" : "#21262d",
              color: wallet.publicKey ? "#ffffff" : "#8b949e",
              border: "1px solid rgba(240, 246, 252, 0.1)",
              borderRadius: "6px",
              padding: "11px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: wallet.publicKey && !isSubmitting ? "pointer" : "not-allowed",
            }}
          >
            {isSubmitting ? "Signing & Confirming on Solana..." : "Authorize & Notarize Degree on Ledger"}
          </button>
        </form>

        {/* Confirmation Banner */}
        {successMessage && (
          <div
            style={{
              backgroundColor: "rgba(63, 185, 80, 0.1)",
              border: "1px solid #3fb950",
              borderRadius: "6px",
              padding: "16px",
              marginTop: "20px",
              fontSize: "13px",
              color: "#c9d1d9",
            }}
          >
            <div style={{ fontWeight: 600, color: "#3fb950", marginBottom: "6px" }}>
              ✓ {successMessage}
            </div>
            {txSignature && (
              <div style={{ marginTop: "4px" }}>
                <span>Transaction Signature: </span>
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#58a6ff", textDecoration: "none" }}
                >
                  Inspect on Solana Explorer ↗
                </a>
              </div>
            )}
            {issuedPda && (
              <div style={{ marginTop: "4px" }}>
                <span>Degree State Account (PDA): </span>
                <a
                  href={`https://explorer.solana.com/address/${issuedPda}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#58a6ff", textDecoration: "none" }}
                >
                  {issuedPda.slice(0, 10)}...{issuedPda.slice(-8)} ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: "#220000",
              border: "1px solid #da3633",
              color: "#f85149",
              borderRadius: "6px",
              padding: "14px",
              marginTop: "20px",
              fontSize: "13px",
            }}
          >
            <strong>Error: </strong> {errorMessage}
          </div>
        )}
      </div>

      {/* Institutional Revocation Tool */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setShowRevocationPanel(!showRevocationPanel)}
          style={{
            background: "none",
            border: "none",
            color: "#8b949e",
            fontSize: "12px",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {showRevocationPanel ? "Hide Administrative Revocation" : "Administrative Revocation Tool ▾"}
        </button>

        {showRevocationPanel && (
          <div
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "6px",
              padding: "16px 20px",
              marginTop: "12px",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#f85149", marginBottom: "4px" }}>
              Revoke Issued Credential
            </div>
            <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#8b949e" }}>
              Marks the credential as Revoked. The record is permanently kept on-chain for audit integrity.
            </p>
            <form onSubmit={handleRevoke} style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={revokeRollNumber}
                onChange={(e) => setRevokeRollNumber(e.target.value)}
                placeholder="Roll Number (e.g. 1913128)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={isSubmitting || !wallet.publicKey}
                style={{
                  backgroundColor: "#da3633",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Revoke
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#8b949e",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: "6px",
  padding: "9px 12px",
  color: "#f0f6fc",
  fontSize: "13.5px",
  outline: "none",
};
