import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Lock, ArrowLeft, Download, Search, Star, Loader2, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LOGO_URL } from "@/lib/brand";
import { LeadDetail } from "@/components/LeadDetail";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "buscema_history_token";

const PRIORITY_COLORS = {
  A: "bg-buscema-green text-white",
  B: "bg-buscema-gold text-white",
  C: "bg-amber-100 text-amber-800",
  D: "bg-gray-100 text-gray-600",
};

export default function History() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fPriorita, setFPriorita] = useState("all");
  const [fFiera, setFFiera] = useState("");
  const [fRagione, setFRagione] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const buildParams = useCallback(() => {
    const p = {};
    if (fPriorita && fPriorita !== "all") p.priorita = fPriorita;
    if (fFiera) p.fiera = fFiera;
    if (fRagione) p.ragione_sociale = fRagione;
    return p;
  }, [fPriorita, fFiera, fRagione]);

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: buildParams(),
      });
      setLeads(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        toast.error("Sessione scaduta, effettua di nuovo l'accesso");
      } else {
        toast.error("Errore nel caricamento");
      }
    } finally {
      setLoading(false);
    }
  }, [token, buildParams]);

  useEffect(() => {
    if (token) fetchLeads();
  }, [token, fetchLeads]);

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await axios.post(`${API}/history/auth`, { password });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setToken(res.data.token);
      toast.success("Accesso effettuato");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Password errata");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/leads/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params: buildParams(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "buscema_leads.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export CSV avviato");
    } catch (err) {
      toast.error("Errore durante l'export");
    }
  };

  // ---------------- Login screen ----------------
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-buscema-green p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <img src={LOGO_URL} alt="Buscema" className="h-28 w-auto" data-testid="login-logo" />
            <div className="flex items-center gap-2 text-buscema-green">
              <Lock className="w-5 h-5" />
              <h1 className="font-heading text-xl font-semibold">Elenco Contatti Raccolti</h1>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Password Operatore</Label>
            <Input
              data-testid="history-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="min-h-[56px] rounded-xl text-base"
            />
          </div>
          <Button
            data-testid="history-login-btn"
            onClick={handleLogin}
            disabled={authLoading || !password}
            className="w-full min-h-[56px] rounded-xl bg-buscema-green hover:bg-buscema-greenDark text-white text-base font-semibold"
          >
            {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accedi"}
          </Button>
          <button
            onClick={() => navigate("/")}
            className="w-full text-sm text-gray-500 hover:text-buscema-green flex items-center justify-center gap-1"
            data-testid="back-to-form-link"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alla scheda
          </button>
        </div>
      </div>
    );
  }

  // ---------------- History list ----------------
  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="back-btn" className="text-buscema-green">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading text-lg font-semibold text-buscema-green">Elenco Contatti Raccolti</h1>
          </div>
          <Button data-testid="export-csv-btn" onClick={handleExport} className="bg-buscema-gold hover:bg-buscema-gold/90 text-white gap-2 h-11 rounded-xl">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Esporta CSV</span>
          </Button>
        </div>
        <div className="flex h-1 w-full">
          <div className="flex-1 bg-tricolor-green" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-tricolor-red" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              data-testid="filter-ragione-input"
              value={fRagione}
              onChange={(e) => setFRagione(e.target.value)}
              placeholder="Cerca Ragione Sociale"
              className="min-h-[52px] rounded-xl pl-10"
            />
          </div>
          <Input
            data-testid="filter-fiera-input"
            value={fFiera}
            onChange={(e) => setFFiera(e.target.value)}
            placeholder="Filtra per Fiera"
            className="min-h-[52px] rounded-xl"
          />
          <Select value={fPriorita} onValueChange={setFPriorita}>
            <SelectTrigger data-testid="filter-priorita-select" className="min-h-[52px] rounded-xl">
              <SelectValue placeholder="Priorità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le priorità</SelectItem>
              <SelectItem value="A">Priorità A</SelectItem>
              <SelectItem value="B">Priorità B</SelectItem>
              <SelectItem value="C">Priorità C</SelectItem>
              <SelectItem value="D">Priorità D</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-gray-500" data-testid="leads-count">{leads.length} contatti trovati</p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-buscema-green" /></div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400" data-testid="empty-state">
            <Inbox className="w-12 h-12 mb-3" />
            <p>Nessun contatto registrato</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leads.map((l) => (
              <button
                key={l.id}
                type="button"
                data-testid={`lead-card-${l.id}`}
                onClick={() => setSelectedId(l.id)}
                className="text-left bg-white rounded-2xl border border-gray-200 border-l-4 border-l-buscema-gold p-4 shadow-sm transition-all hover:shadow-md hover:border-l-buscema-green active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-buscema-green truncate">{l.ragione_sociale || "—"}</h3>
                    <p className="text-sm text-gray-600 truncate">{l.nome_buyer} {l.ruolo && `· ${l.ruolo}`}</p>
                  </div>
                  {l.priorita && (
                    <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm ${PRIORITY_COLORS[l.priorita] || "bg-gray-100"}`}>
                      {l.priorita}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-4 h-4" fill={n <= l.potenziale ? "#C5A059" : "none"} color={n <= l.potenziale ? "#C5A059" : "#D1D5DB"} />
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-500 space-y-0.5">
                  {l.email && <p className="truncate">✉ {l.email}</p>}
                  {l.cellulare && <p className="truncate">📱 {l.cellulare}</p>}
                  <p className="text-xs text-gray-400 pt-1">{l.nome_fiera} {l.anno} · {l.paese}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {selectedId && (
        <LeadDetail
          leadId={selectedId}
          token={token}
          onClose={() => setSelectedId(null)}
          onSaved={fetchLeads}
        />
      )}
    </div>
  );
}
