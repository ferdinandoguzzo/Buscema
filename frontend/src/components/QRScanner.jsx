import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, CameraOff, RefreshCw, Loader2 } from "lucide-react";

// Live QR / vCard scanner: continuous real-time video parsing with a viewfinder.
// No file upload here — this is a pure streaming scanner.
export const QRScanner = ({ onResult, onClose }) => {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const handledRef = useRef(false);
  const [status, setStatus] = useState("loading"); // loading | scanning | error
  const [errorMsg, setErrorMsg] = useState("");
  const containerId = "qr-reader-region";

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (s && startedRef.current) {
      try {
        await s.stop();
        await s.clear();
      } catch (e) {
        /* noop */
      }
      startedRef.current = false;
    }
  };

  const startScanner = async () => {
    setStatus("loading");
    setErrorMsg("");
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(containerId, { verbose: false });
    }
    const html5Qr = scannerRef.current;

    const qrbox = (vw, vh) => {
      const size = Math.max(50, Math.floor(Math.min(vw, vh) * 0.7));
      return { width: size, height: size };
    };

    try {
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox, aspectRatio: 1.0 },
        (decodedText) => {
          if (!handledRef.current) {
            handledRef.current = true;
            onResult(decodedText);
          }
        },
        () => {} // per-frame decode failures: ignore
      );
      startedRef.current = true;
      setStatus("scanning");
    } catch (err) {
      console.warn("QR camera error", err);
      startedRef.current = false;
      setErrorMsg(
        "Impossibile accedere alla fotocamera. Consenti l'accesso alla fotocamera dalle impostazioni del browser e riprova."
      );
      setStatus("error");
    }
  };

  useEffect(() => {
    handledRef.current = false;
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async () => {
    await stopScanner();
    startScanner();
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6" data-testid="qr-scanner-overlay">
      <button
        onClick={handleClose}
        data-testid="qr-scanner-close"
        className="absolute top-5 right-5 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 z-10"
      >
        <X className="w-7 h-7" />
      </button>

      <p className="text-white font-heading text-lg mb-4">Inquadra il QR / vCard</p>

      {/* Live video region managed by html5-qrcode */}
      <div className="relative w-full max-w-sm">
        <div
          id={containerId}
          data-testid="qr-video-region"
          className="w-full rounded-2xl overflow-hidden bg-black aspect-square"
        />

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="font-heading text-sm">Avvio fotocamera...</p>
          </div>
        )}
      </div>

      {status === "scanning" && (
        <p className="text-white/70 text-sm mt-4 text-center max-w-xs">
          La scansione è automatica: appena il QR entra nel mirino verrà letto.
        </p>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center text-center gap-4 max-w-sm mt-6">
          <CameraOff className="w-12 h-12 text-buscema-gold" />
          <p className="text-white/90 text-sm">{errorMsg}</p>
          <button
            onClick={handleRetry}
            data-testid="qr-retry-btn"
            className="min-h-[52px] px-6 rounded-xl bg-buscema-gold hover:bg-buscema-gold/90 text-white font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> Riprova
          </button>
        </div>
      )}
    </div>
  );
};
