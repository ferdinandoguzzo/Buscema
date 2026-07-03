import {
  Building2, Package, FolderKanban, FlaskConical, Gauge, StickyNote, User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";

export const Section = ({ icon: Icon, title, children }) => (
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

export const Chip = ({ label, active, onClick, testid }) => (
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

export const Field = ({ label, testid, value, onChange, type = "text", placeholder }) => (
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

export const LeadSections = ({ form, set, toggle, inArr }) => {
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
    <>
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
    </>
  );
};
