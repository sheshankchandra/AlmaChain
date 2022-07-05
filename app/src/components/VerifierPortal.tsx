import React, { useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  DEVNET_RPC,
  DEMO_NIT_SILCHAR_UNIVERSITY,
  fetchDegreeRecord,
  formatCgpa,
  formatTimestamp,
  DegreeRecordData,
} from "../utils/solana";

export const VerifierPortal: React.FC = () => {
  const wallet = useWallet();

  // Search input state
  const [rollNumber, setRollNumber] = useState("1913128");
  const [universityKey, setUniversityKey] = useState(
    DEMO_NIT_SILCHAR_UNIVERSITY.toBase58()
  );
  const [showAuthoritySettings, setShowAuthoritySettings] = useState(false);

  // Search execution status
  const [isSearching, setIsSearching] = useState(false);
  const [degree, setDegree] = useState<DegreeRecordData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    setDegree(null);
    setHasSearched(true);

    try {
      let uniPubkey: PublicKey;
      try {
        uniPubkey = new PublicKey(universityKey.trim());
      } catch {
        throw new Error("Invalid University Registrar public key address.");
      }

      const connection = new Connection(DEVNET_RPC, "confirmed");
      const record = await fetchDegreeRecord(connection, uniPubkey, rollNumber.trim());

      if (record) {
        setDegree(record);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to query the Solana ledger.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 16px" }}>
      {/* Intro Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#f0f6fc",
            margin: "0 0 8px 0",
            letterSpacing: "-0.3px",
          }}
        >
          AlmaChain · Academic Credential Verification System
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#8b949e", lineHeight: 1.5 }}>
          Search and verify student convocation degrees directly against the Solana blockchain ledger.
          <br />
          No wallet connection or login required for third-party verifiers.
        </p>
      </div>

      {/* Clean Institutional Search Form */}
      <div
        style={{
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "20px 24px",
          marginBottom: "28px",
        }}
      >
        <form onSubmit={handleVerify}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="Enter Student Roll Number (e.g. 1913128)"
              required
              style={{
                flex: 1,
                backgroundColor: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: "6px",
                padding: "10px 14px",
                color: "#f0f6fc",
                fontSize: "14px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={isSearching}
              style={{
                backgroundColor: "#238636",
                color: "#ffffff",
                border: "1px solid rgba(240, 246, 252, 0.1)",
                borderRadius: "6px",
                padding: "0 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isSearching ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isSearching ? "Searching..." : "Verify Record"}
            </button>
          </div>

          {/* Institutional Settings Toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #21262d",
              fontSize: "12px",
              color: "#8b949e",
            }}
          >
            <span>
              Institution: <strong style={{ color: "#c9d1d9" }}>National Institute of Technology Silchar</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowAuthoritySettings(!showAuthoritySettings)}
              style={{
                background: "none",
                border: "none",
                color: "#58a6ff",
                fontSize: "12px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showAuthoritySettings ? "Hide Authority Options" : "Authority Key Options ▾"}
            </button>
          </div>

          {showAuthoritySettings && (
            <div
              style={{
                marginTop: "10px",
                backgroundColor: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              <label style={{ display: "block", fontSize: "11.5px", color: "#8b949e", marginBottom: "6px" }}>
                Target University Authority Public Key:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={universityKey}
                  onChange={(e) => setUniversityKey(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: "#161b22",
                    border: "1px solid #30363d",
                    borderRadius: "4px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    color: "#f0f6fc",
                    fontFamily: "monospace",
                  }}
                />
                {wallet.publicKey && (
                  <button
                    type="button"
                    onClick={() => setUniversityKey(wallet.publicKey!.toBase58())}
                    style={{
                      backgroundColor: "#21262d",
                      border: "1px solid #30363d",
                      color: "#58a6ff",
                      borderRadius: "4px",
                      padding: "4px 10px",
                      fontSize: "11.5px",
                      cursor: "pointer",
                    }}
                  >
                    My Connected Key
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUniversityKey(DEMO_NIT_SILCHAR_UNIVERSITY.toBase58())}
                  style={{
                    backgroundColor: "#21262d",
                    border: "1px solid #30363d",
                    color: "#8b949e",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    fontSize: "11.5px",
                    cursor: "pointer",
                  }}
                >
                  Reset Default
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Query Error Notice */}
      {errorMessage && (
        <div
          style={{
            backgroundColor: "#220000",
            border: "1px solid #da3633",
            color: "#f85149",
            borderRadius: "6px",
            padding: "12px 16px",
            fontSize: "13px",
            marginBottom: "20px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Not Found Notice */}
      {hasSearched && !degree && !isSearching && !errorMessage && (
        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "8px",
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#f0f6fc", fontWeight: 600, fontSize: "15px" }}>
            No Record Found on Ledger
          </div>
          <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: "13px" }}>
            No degree certificate has been notarized under Scholar Roll Number: <strong>{rollNumber}</strong>.
          </p>
        </div>
      )}

      {/* Formal Academic Degree Certificate Document */}
      {degree && (
        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "10px",
            padding: "36px 40px",
            position: "relative",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* Institutional Document Header */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "1px solid #30363d",
              paddingBottom: "22px",
              marginBottom: "26px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#58a6ff",
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                marginBottom: "4px",
              }}
            >
              National Institute of Technology Silchar
            </div>
            <div style={{ fontSize: "12px", color: "#8b949e", marginBottom: "8px" }}>
              An Institute of National Importance under Ministry of Education, Government of India
            </div>
            <h2
              style={{
                fontSize: "19px",
                fontWeight: 700,
                color: "#f0f6fc",
                margin: "10px 0 0 0",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Academic Degree Certificate
            </h2>
          </div>

          {/* Verification Status Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor:
                degree.status === "Active"
                  ? "rgba(63, 185, 80, 0.08)"
                  : "rgba(248, 81, 73, 0.08)",
              border:
                degree.status === "Active"
                  ? "1px solid rgba(63, 185, 80, 0.25)"
                  : "1px solid rgba(248, 81, 73, 0.25)",
              borderRadius: "6px",
              padding: "10px 16px",
              marginBottom: "28px",
            }}
          >
            <span style={{ fontSize: "12.5px", color: "#c9d1d9" }}>
              Cryptographic Consensus Verification:
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: degree.status === "Active" ? "#3fb950" : "#f85149",
                letterSpacing: "0.5px",
              }}
            >
              {degree.status === "Active"
                ? "● VALID & ACTIVE (AUTHENTIC)"
                : "● REVOKED BY INSTITUTION"}
            </span>
          </div>

          {/* Formal Conferred Degree Statement */}
          <div style={{ lineHeight: "1.8", color: "#c9d1d9", fontSize: "14.5px", marginBottom: "28px" }}>
            This is to certify that{" "}
            <strong style={{ color: "#ffffff", fontSize: "16px" }}>{degree.studentName}</strong>,
            bearing Scholar Roll Number{" "}
            <strong style={{ color: "#58a6ff", fontFamily: "monospace" }}>{degree.rollNumber}</strong>,
            having successfully completed all prescribed courses of study and passed the requisite examinations,
            has been admitted to the degree of
            <div
              style={{
                color: "#f0f6fc",
                fontSize: "17px",
                fontWeight: 700,
                margin: "12px 0",
                padding: "10px 14px",
                backgroundColor: "#0d1117",
                borderLeft: "3px solid #1f6feb",
                borderRadius: "0 4px 4px 0",
              }}
            >
              {degree.degreeTitle}
            </div>
            with a Cumulative Grade Point Average of{" "}
            <strong style={{ color: "#3fb950" }}>{formatCgpa(degree.cgpa)}</strong> in the Class of{" "}
            <strong style={{ color: "#ffffff" }}>{degree.graduationYear}</strong>.
          </div>

          {/* Structured Document Metadata */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              backgroundColor: "#0d1117",
              border: "1px solid #21262d",
              borderRadius: "6px",
              padding: "14px 18px",
              fontSize: "12px",
              marginBottom: "28px",
            }}
          >
            <div>
              <span style={{ color: "#8b949e", display: "block" }}>Conferral Date</span>
              <strong style={{ color: "#f0f6fc", marginTop: "2px", display: "block" }}>
                {formatTimestamp(degree.issuedAt)}
              </strong>
            </div>

            <div>
              <span style={{ color: "#8b949e", display: "block" }}>Account Authority</span>
              <strong style={{ color: "#f0f6fc", marginTop: "2px", display: "block" }}>
                Registrar, NIT Silchar
              </strong>
            </div>

            <div>
              <span style={{ color: "#8b949e", display: "block" }}>Student Identity</span>
              <strong
                style={{
                  color: "#f0f6fc",
                  marginTop: "2px",
                  display: "block",
                  fontFamily: "monospace",
                }}
              >
                {degree.studentWallet.toBase58().slice(0, 6)}...{degree.studentWallet.toBase58().slice(-6)}
              </strong>
            </div>
          </div>

          {/* On-Chain Verification Ledger Footer */}
          <div
            style={{
              borderTop: "1px solid #30363d",
              paddingTop: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: "#8b949e",
            }}
          >
            <div>
              <span>Solana State Account (PDA): </span>
              <span style={{ fontFamily: "monospace", color: "#c9d1d9" }}>
                {degree.pdaAddress.toBase58()}
              </span>
            </div>

            <a
              href={`https://explorer.solana.com/address/${degree.pdaAddress.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#58a6ff",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Solana Explorer ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
