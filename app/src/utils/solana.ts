import {
  PublicKey,
  Connection,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import idlJson from "../idl/degree_registry.json";

export const PROGRAM_ID = new PublicKey(idlJson.metadata.address);
export const DEVNET_RPC = "https://api.devnet.solana.com";

export const DEFAULT_NIT_SILCHAR_UNIVERSITY = new PublicKey(
  "7XwP6e5kYwZnmV7TvhQzQpX16k8tH5B8F7jYhYh2zWqV"
);
export const DEMO_NIT_SILCHAR_UNIVERSITY = DEFAULT_NIT_SILCHAR_UNIVERSITY;
export const DEGREE_RECORD_RENT_LAMPORTS = 2463840;

export async function getDegreePda(
  university: PublicKey,
  rollNumber: string,
  programId: PublicKey = PROGRAM_ID
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [
      Buffer.from("degree"),
      university.toBuffer(),
      Buffer.from(rollNumber.trim()),
    ],
    programId
  );
}

export function formatCgpa(scaledCgpa: number): string {
  const decimalVal = (scaledCgpa / 100).toFixed(2);
  return `${decimalVal} / 10.00`;
}

export function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds <= 0) return "N/A";
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
