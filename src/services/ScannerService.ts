import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

export class ScannerService {
  static isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  static async scan(): Promise<string | null> {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') return null;

    const { barcodes } = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.QrCode,
      ],
    });

    return barcodes[0]?.rawValue ?? null;
  }
}
