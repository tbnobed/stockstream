import { QRTestGenerator } from "@/components/qr-test-generator";

export default function QRTest() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">QR Code Testing</h1>
        <p className="text-muted-foreground">
          Generate QR codes to test the scanner functionality
        </p>
      </div>
      
      <QRTestGenerator />
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Generate a QR code, then use the scanner in Sales or Inventory to test.</p>
        <p>The scanner should detect SKUs like "SHI-BLA-LX-052" automatically.</p>
      </div>
    </div>
  );
}