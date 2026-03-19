/** History screen — displays paginated scan history with real-time SSE updates. */
import type { Metadata } from "next";
import { HistoryClient } from "./history-client";

export const metadata: Metadata = {
  title: "Scan History — QR Scanner",
  description: "Browse and search your scan history",
};

export default function HistoryPage(): React.ReactElement {
  return <HistoryClient />;
}
