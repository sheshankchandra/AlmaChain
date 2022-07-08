import React, { useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { DEVNET_RPC } from "./utils/solana";
import { IssuerPortal } from "./components/IssuerPortal";
import { VerifierPortal } from "./components/VerifierPortal";

import "@solana/wallet-adapter-react-ui/styles.css";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"verifier" | "issuer">("verifier");

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={DEVNET_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div
            style={{
              minHeight: "100vh",
              backgroundColor: "#0d1117",
              color: "#e6edf3",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {/* Academic Navigation Bar */}
            <header
              style={{
                borderBottom: "1px solid #30363d",
                backgroundColor: "#161b22",
                position: "sticky",
                top: 0,
                zIndex: 50,
              }}
            >
              <div
                style={{
                  maxWidth: "940px",
                  margin: "0 auto",
                  padding: "14px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {/* Institutional Branding */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      backgroundColor: "#1f6feb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#ffffff",
                      letterSpacing: "0.5px",
                    }}
                  >
                    NIT
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#f0f6fc", lineHeight: 1.2 }}>
                      AlmaChain — NIT Silchar Registry
                    </div>
                    <div style={{ fontSize: "12px", color: "#8b949e", marginTop: "2px" }}>
                      On-Chain Soulbound Degrees · Solana Protocol
                    </div>
                  </div>
                </div>

                {/* Clean Tab Navigation */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#0d1117",
                      borderRadius: "6px",
                      padding: "3px",
                      border: "1px solid #30363d",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab("verifier")}
                      style={{
                        backgroundColor: activeTab === "verifier" ? "#21262d" : "transparent",
                        color: activeTab === "verifier" ? "#f0f6fc" : "#8b949e",
                        border: activeTab === "verifier" ? "1px solid #30363d" : "1px solid transparent",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Public Verifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("issuer")}
                      style={{
                        backgroundColor: activeTab === "issuer" ? "#21262d" : "transparent",
                        color: activeTab === "issuer" ? "#f0f6fc" : "#8b949e",
                        border: activeTab === "issuer" ? "1px solid #30363d" : "1px solid transparent",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Registrar Portal
                    </button>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      color: "#3fb950",
                      backgroundColor: "rgba(63, 185, 80, 0.1)",
                      border: "1px solid rgba(63, 185, 80, 0.3)",
                      borderRadius: "12px",
                      padding: "3px 9px",
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#3fb950",
                      }}
                    />
                    Devnet
                  </span>
                </div>
              </div>
            </header>

            {/* Main Application Area */}
            <main style={{ paddingTop: "32px", paddingBottom: "48px" }}>
              {activeTab === "verifier" ? <VerifierPortal /> : <IssuerPortal />}
            </main>

            {/* Academic Research Attribution Footer */}
            <footer
              style={{
                borderTop: "1px solid #21262d",
                backgroundColor: "#161b22",
                padding: "24px 20px",
                textAlign: "center",
                color: "#8b949e",
                fontSize: "12.5px",
                lineHeight: "1.6",
              }}
            >
              <div style={{ maxWidth: "880px", margin: "0 auto" }}>
                <div>
                  Built by <strong>Sheshank Chandra Pothu</strong> (Roll No. 1913128) under the mentorship of{" "}
                  <strong>Dr. Malaya Dutta Borah</strong> during <strong>S.N. Bose Summer Research Internship 2022</strong>.
                </div>
                <div style={{ color: "#6e7681", fontSize: "11.5px", marginTop: "4px" }}>
                  Department of Computer Science & Engineering · National Institute of Technology Silchar
                </div>
              </div>
            </footer>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
