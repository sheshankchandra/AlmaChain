import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Polyfill Node.js Buffer for Solana Web3 and Anchor runtime in browser
if (typeof window !== "undefined") {
  (window as any).Buffer = (window as any).Buffer || Buffer;
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
