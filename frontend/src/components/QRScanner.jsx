import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Upload, Loader2, CameraOff } from "lucide-react";

export const QRScanner = ({ onResult, onClose }) => {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("loading"); // loading | camera | fallback
  const [message, setMessage] = useState("");
  const [decoding, setDecoding] = useState(false);
  const containerId = "qr-reader-region";

  useEffect(() => {
    const html5Qr = new Html5Qrcode(containerId, { verbose: false });
    scannerRef.current = html5Qr;
    let active = true;

    const qrbox = (vw, vh) => {
      const size = Math.max(50, Math.floor(Math.min(vw, vh) * 0.7));
      return { width: size, height: size };
    };

    html5Qr
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox },
        (decodedText) => {
          if (active) {
            active = false;
            onResult(decodedText);
          }
        },
        () => {}
      )
      .then(() => {
        startedRef.current = true;
        setMode("camera");
      })
      .catch((err) => {
        console.error("QR camera error", err);
        setMessage("Fotocamera non disponibile o permesso negato. Carica una foto del QR / vCard.");
        setMode("fallback");
      });

    return () => {
      const s = scannerRef.current;
      if (s && startedRef.current) {
        s.stop().then(() => s.clear()).catch(() => {});
        startedRef.current = false;
      }
    };
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !scannerRef.current) return;
    setDecoding(true);
    setMessage("");
    try {
      if (startedRef.current) {
        await scannerRef.current.stop().catch(() => {});
        startedRef.current = false;
      }
      const text = await scannerRef.current.scanFile(file, false);
      onResult(text);
    } catch (err) {
      console.error("QR file decode error", err);
      setMessage("Nessun QR code riconosciuto nell'immagine. Riprova con una foto più nitida e ravvicinata.");
      setMode("fallback");
    } finally {
      setDecoding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6" data-testid="qr-scanner-overlay">
      <button
        onClick={() => onClose()}
        data-testid="qr-scanner-close"
        className="absolute top-5 right-5 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
      >
        <X className="w-7 h-7" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        data-testid="qr-file-input"
      />

      {mode === "loading" && (
        <div className="flex flex-col items-center text-white gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-heading">Avvio fotocamera...</p>
        </div>
      )}

      {mode === "camera" && <p className="text-white font-heading text-lg mb-4">Inquadra il QR / vCard</p>}

      {mode === "fallback" && (
        <div className="flex flex-col items-center text-center gap-4 max-w-sm">
          <CameraOff className="w-12 h-12 text-buscema-gold" />
          <p className="text-white/90 text-sm">{message}</p>
        </div>
      )}

      {/* Reader region: must stay mounted for camera preview and scanFile */}
      <div
        id={containerId}
        className={`w-full max-w-sm rounded-2xl overflow-hidden bg-black mt-2 ${mode === "camera" ? "" : "hidden"}`}
      />

      {(mode === "camera" || mode === "fallback") && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={decoding}
          data-testid="qr-upload-btn"
          className="mt-6 min-h-[56px] px-6 rounded-xl bg-buscema-gold hover:bg-buscema-gold/90 text-white font-semibold flex items-center gap-3 disabled:opacity-60"
        >
          {decoding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {decoding ? "Analisi immagine..." : "Carica foto del QR"}
        </button>
      )}
    </div>
  );
};
