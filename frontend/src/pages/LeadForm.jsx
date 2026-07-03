import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  QrCode, Camera, ChefHat, History as HistoryIcon, Loader2,
  Building2, Package, FolderKanban, FlaskConical, Gauge, StickyNote, User, Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { QRScanner } from "@/components/QRScanner";
import { parseVCard } from "@/lib/vcard";
import { LOGO_URL } from "@/lib/brand";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EMPTY = {
  nome_fiera: "", anno: 2026,
  ragione_sociale: "", paese: "", nome_buyer: "", ruolo: "", email: "", cellulare: "",
  lingua: [], sesso: "",
  tipologia_azienda: [],
  interesse_brand: [], interesse_prodotti: [],
  packaging_canale: [], formato: "",
  progetto_tipo: [], progetto_volume: [],
  campioni_stato: [], campioni_prodotti: "",
  priorita: "", potenziale: 0,
  note: "", card_photo: null,
};

const Section = ({ icon: Icon, title, children }) => (
  <section className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-buscema-gold shadow-sm p-5 md:p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-buscema-green/5 flex items-center justify-center">
        <Icon className="w-5 h-5 text-buscema-gold" strokeWidth={2} />
      </div>
      <h2 className="font-heading text-lg font-semibold uppercase tracking-tight text-buscema-green">{title}</h2>
    </div>
    <div className="space-y-5">{children}</div>
  </section>
);

const Chip = ({ label, active, onClick, testid }) => (
  <button
    type="button"
    data-testid={testid}
    onClick={onClick}
    className={`min-h-[48px] px-4 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95 ${
      active
        ? "bg-buscema-green text-white border-buscema-green shadow-sm"
        : "bg-white text-gray-700 border-gray-200 hover:border-buscema-gold"
    }`}
  >
    {label}
  </button>
);

export default function LeadForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
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
      setForm({ ...EMPTY, nome_fiera: form.nome_fiera, anno: form.anno });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const CheckRow = ({ groupKey, options, prefix }) => (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          testid={`${prefix}-${opt.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
          active={inArr(groupKey, opt)}
          onClick={() => toggle(groupKey, opt)}
        />
      ))}
    </div>
  );

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
          <img src={LOGO_URL} alt="Buscema Gastronomia" className="h-12 w-auto" data-testid="brand-logo" />
          <Button
            variant="ghost"
            onClick={() => navigate("/storico")}
            data-testid="go-to-history-btn"
            className="text-buscema-green hover:bg-buscema-green/5 gap-2 h-11"
          >
            <HistoryIcon className="w-5 h-5" /> <span className="hidden sm:inline">Storico</span>
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

        {/* Anagrafica */}
        <Section icon={User} title="Anagrafica">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ragione Sociale" testid="input-ragione-sociale" value={form.ragione_sociale} onChange={(v) => set("ragione_sociale", v)} />
            <Field label="Paese" testid="input-paese" value={form.paese} onChange={(v) => set("paese", v)} />
            <Field label="Nome Buyer" testid="input-nome-buyer" value={form.nome_buyer} onChange={(v) => set("nome_buyer", v)} />
            <Field label="Ruolo" testid="input-ruolo" value={form.ruolo} onChange={(v) => set("ruolo", v)} />
            <Field label="E-mail" testid="input-email" type="email" value={form.email} onChange={(v) => set("email", v)} />
            <Field label="Cellulare / WhatsApp" testid="input-cellulare" type="tel" value={form.cellulare} onChange={(v) => set("cellulare", v)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lingua</Label>
            <CheckRow groupKey="lingua" options={["IT", "EN", "DE", "FR"]} prefix="lingua" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sesso</Label>
            <div className="flex flex-wrap gap-2.5">
              {["Uomo", "Donna"].map((s) => (
                <Chip key={s} label={s} testid={`sesso-${s.toLowerCase()}`} active={form.sesso === s} onClick={() => set("sesso", form.sesso === s ? "" : s)} />
              ))}
            </div>
          </div>
        </Section>

        {/* Tipologia azienda */}
        <Section icon={Building2} title="Tipologia Azienda">
          <CheckRow
            groupKey="tipologia_azienda"
            options={["Importatore", "Distributore", "Grossista", "Retail", "Ho.Re.Ca.", "Produttore", "Private Label", "E-commerce", "Altro"]}
            prefix="tipologia"
          />
        </Section>

        {/* Interesse */}
        <Section icon={Package} title="Interesse">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brand / Linea</Label>
            <CheckRow groupKey="interesse_brand" options={["Buscema", "Nonno Gino", "Entrambe"]} prefix="brand" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prodotti</Label>
            <CheckRow groupKey="interesse_prodotti" options={["Carciofi", "Peperoni", "Melanzane", "Funghi", "Pomodori", "Olive", "Creme", "Altro"]} prefix="prodotti" />
          </div>
        </Section>

        {/* Packaging */}
        <Section icon={Package} title="Packaging / Formato">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Canale</Label>
            <CheckRow groupKey="packaging_canale" options={["Retail", "Ho.Re.Ca.", "Industriale"]} prefix="canale" />
          </div>
          <Field label="Formato" testid="input-formato" value={form.formato} onChange={(v) => set("formato", v)} placeholder="Es. Vaso 314ml, latta 3kg..." />
        </Section>

        {/* Progetto */}
        <Section icon={FolderKanban} title="Progetto">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo di progetto</Label>
            <CheckRow groupKey="progetto_tipo" options={["Private Label", "Marchio esistente", "Nuovo progetto"]} prefix="progetto-tipo" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Volume</Label>
            <CheckRow groupKey="progetto_volume" options={["Test", "Pallet", "Container", "Annuale"]} prefix="volume" />
          </div>
        </Section>

        {/* Campioni */}
        <Section icon={FlaskConical} title="Campioni">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stato</Label>
            <CheckRow groupKey="campioni_stato" options={["Consegnati", "Da spedire"]} prefix="campioni" />
          </div>
          <Field label="Prodotti Campione" testid="input-campioni-prodotti" value={form.campioni_prodotti} onChange={(v) => set("campioni_prodotti", v)} />
        </Section>

        {/* Valutazione */}
        <Section icon={Gauge} title="Valutazione">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Priorità</Label>
            <div className="grid grid-cols-4 gap-2.5">
              {["A", "B", "C", "D"].map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`priorita-${p.toLowerCase()}`}
                  onClick={() => set("priorita", form.priorita === p ? "" : p)}
                  className={`min-h-[56px] rounded-xl border-2 font-heading text-xl font-bold transition-all active:scale-95 ${
                    form.priorita === p ? "bg-buscema-green text-white border-buscema-green" : "bg-white text-buscema-green border-gray-200 hover:border-buscema-gold"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Potenziale</Label>
            <StarRating value={form.potenziale} onChange={(v) => set("potenziale", v)} />
          </div>
        </Section>

        {/* Note */}
        <Section icon={StickyNote} title="Note">
          <Textarea
            data-testid="input-note"
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Note libere dell'operatore..."
            rows={5}
            className="rounded-xl text-base resize-none"
          />
        </Section>
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

const Field = ({ label, testid, value, onChange, type = "text", placeholder }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</Label>
    <Input
      data-testid={testid}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-h-[56px] rounded-xl text-base"
    />
  </div>
);
