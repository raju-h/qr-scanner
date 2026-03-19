/** Scanner screen — main entry point, renders camera feed with scan overlay. */
import { ErrorBoundary } from "@/components/error-boundary";
import { ScannerView } from "@/components/scanner/scanner-view";

export default function ScannerPage(): React.ReactElement {
  return (
    <ErrorBoundary
      heading="Scanner encountered an error"
      message="The camera scanner hit a problem. Tap below to retry."
    >
      <ScannerView />
    </ErrorBoundary>
  );
}
