import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { QrCode, Camera, History as HistoryIcon, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/QRScanner";
import { LeadSections } from "@/components/LeadSections";
import { parseVCard } from "@/lib/vcard";
import { LOGO_URL } from "@/lib/brand";
import { EMPTY_LEAD } from "@/lib/leadConstants";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LeadForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_LEAD);
  const [showScanner, setShowScanner] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const toggle = (key, val) =>
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  const inArr = (key, val) => form[key].includes(val);

  const handleQRResult = (text) => {
    setShowScanner(false);
    const data = parseVCard(text);
    const filled = Object.entries(data).filter(([, v]) => v);
    if (filled.length === 0) {
      toast.error("Nessun dato vCard riconosciuto nel QR");
      return;
    }
    setForm((f) => ({ ...f, ...Object.fromEntries(filled) }));
    toast.success(`Dati importati dal QR (${filled.length} campi)`);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      set("card_photo", dataUrl);
      setOcrLoading(true);
      try {
        const res = await axios.post(`${API}/leads/ocr`, { image_base64: dataUrl });
        const filled = Object.entries(res.data).filter(([, v]) => v);
        setForm((f) => ({ ...f, card_photo: dataUrl, ...Object.fromEntries(filled) }));
        toast.success(`Biglietto analizzato (${filled.length} campi riconosciuti)`);
      } catch (err) {
        toast.error(err.response?.data?.detail || "Errore durante l'analisi OCR");
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.ragione_sociale && !form.nome_buyer) {
      toast.error("Inserisci almeno Ragione Sociale o Nome Buyer");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/leads`, form);
      toast.success("Scheda salvata con successo");
      setForm({ ...EMPTY_LEAD, nome_fiera: form.nome_fiera, anno: form.anno });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {showScanner && (
        <QRScanner
          onResult={handleQRResult}
          onClose={(err) => {
            setShowScanner(false);
            if (err) toast.error(err);
          }}
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoto}
        data-testid="ocr-file-input"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={LOGO_URL} alt="Buscema Gastronomia" className="h-20 sm:h-24 w-auto -my-2" data-testid="brand-logo" />
          <Button
            variant="ghost"
            onClick={() => navigate("/storico")}
            data-testid="go-to-history-btn"
            className="text-buscema-green hover:bg-buscema-green hover:text-white gap-2 h-11 font-semibold transition-colors"
          >
            <HistoryIcon className="w-5 h-5" /> <span className="hidden sm:inline">Elenco Contatti Raccolti</span>
          </Button>
        </div>
        <div className="flex h-1 w-full">
          <div className="flex-1 bg-tricolor-green" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-tricolor-red" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 pb-32 space-y-6">
        <div className="text-center py-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-buscema-green">Scheda Contatto Buyer</h1>
        </div>

        {/* Sessione fiera */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nome Fiera</Label>
            <Input
              data-testid="input-nome-fiera"
              value={form.nome_fiera}
              onChange={(e) => set("nome_fiera", e.target.value)}
              placeholder="Es. Cibus 2026"
              className="min-h-[56px] rounded-xl text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Anno</Label>
            <Input
              data-testid="input-anno"
              type="number"
              value={form.anno}
              onChange={(e) => set("anno", parseInt(e.target.value) || 2026)}
              className="min-h-[56px] rounded-xl text-base"
            />
          </div>
        </div>

        {/* Trigger acquisizione */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            data-testid="scan-qr-btn"
            onClick={() => setShowScanner(true)}
            className="min-h-[64px] rounded-xl bg-buscema-green hover:bg-buscema-greenDark text-white text-base font-semibold gap-3 shadow-md"
          >
            <QrCode className="w-6 h-6" /> Scansiona QR / vCard
          </Button>
          <Button
            data-testid="scan-ocr-btn"
            onClick={() => fileRef.current?.click()}
            disabled={ocrLoading}
            variant="outline"
            className="min-h-[64px] rounded-xl border-2 border-buscema-gold text-buscema-gold hover:bg-buscema-gold hover:text-white text-base font-semibold gap-3 bg-white"
          >
            {ocrLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            {ocrLoading ? "Analisi in corso..." : "Foto Biglietto da Visita (OCR)"}
          </Button>
          {form.card_photo && (
            <img
              src={form.card_photo}
              alt="Biglietto"
              className="rounded-xl border border-gray-200 max-h-40 object-contain bg-white"
              data-testid="card-photo-preview"
            />
          )}
        </div>

        {/* Sezioni scheda */}
        <LeadSections form={form} set={set} toggle={toggle} inArr={inArr} />
      </main>

      {/* Sticky Save */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto">
          <Button
            data-testid="save-lead-btn"
            onClick={handleSave}
            disabled={saving}
            className="w-full min-h-[60px] rounded-xl bg-buscema-green hover:bg-buscema-greenDark text-white text-lg font-semibold gap-3 shadow-lg"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Salva Scheda
          </Button>
        </div>
      </div>
    </div>
  );
}
