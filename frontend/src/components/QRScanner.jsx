import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

export const QRScanner = ({ onResult, onClose }) => {
  const scannerRef = useRef(null);
  const containerId = "qr-reader-region";

  useEffect(() => {
    const html5Qr = new Html5Qrcode(containerId);
    scannerRef.current = html5Qr;
    let active = true;

    html5Qr
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (active) {
            active = false;
            onResult(decodedText);
          }
        },
        () => {}
      )
      .catch((err) => {
        console.error("QR start error", err);
        onClose(err?.message || "Impossibile avviare la fotocamera");
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" data-testid="qr-scanner-overlay">
      <button
        onClick={() => onClose()}
        data-testid="qr-scanner-close"
        className="absolute top-5 right-5 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
      >
        <X className="w-7 h-7" />
      </button>
      <p className="text-white font-heading text-lg mb-4">Inquadra il QR / vCard</p>
      <div id={containerId} className="w-full max-w-sm rounded-2xl overflow-hidden bg-black" />
    </div>
  );
};
