import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Save, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LeadSections } from "@/components/LeadSections";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LeadDetail = ({ leadId, token, onClose, onSaved }) => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/leads/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm(res.data);
      } catch (err) {
        toast.error("Errore nel caricamento della scheda");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [leadId, token, onClose]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const toggle = (key, val) =>
    setForm((f) => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  const inArr = (key, val) => (form[key] || []).includes(val);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/leads/${leadId}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Modifiche salvate");
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Scheda eliminata");
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error("Errore durante l'eliminazione");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center" data-testid="lead-detail-overlay">
      <div className="bg-gray-50 w-full max-w-3xl h-full overflow-y-auto relative">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold text-buscema-green truncate">
              {loading ? "Caricamento..." : form?.ragione_sociale || form?.nome_buyer || "Scheda contatto"}
            </h2>
            {form?.created_at && (
              <p className="text-xs text-gray-400">
                Inserita il {new Date(form.created_at).toLocaleString("it-IT")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!loading && form && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button data-testid="lead-detail-delete-btn" className="p-2 rounded-full hover:bg-red-50 text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="delete-confirm-dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare la scheda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione è irreversibile. La scheda di{" "}
                      <span className="font-semibold text-buscema-green">{form.ragione_sociale || form.nome_buyer || "questo contatto"}</span>{" "}
                      verrà rimossa definitivamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="delete-cancel-btn">Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      data-testid="delete-confirm-btn"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleting ? "Eliminazione..." : "Elimina"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <button onClick={onClose} data-testid="lead-detail-close" className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {loading || !form ? (
          <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-buscema-green" /></div>
        ) : (
          <>
            <main className="px-4 md:px-8 py-6 pb-32 space-y-6">
              {/* Sessione fiera */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nome Fiera</Label>
                  <Input
                    data-testid="detail-input-nome-fiera"
                    value={form.nome_fiera}
                    onChange={(e) => set("nome_fiera", e.target.value)}
                    className="min-h-[56px] rounded-xl text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Anno</Label>
                  <Input
                    data-testid="detail-input-anno"
                    type="number"
                    value={form.anno}
                    onChange={(e) => set("anno", parseInt(e.target.value) || 2026)}
                    className="min-h-[56px] rounded-xl text-base"
                  />
                </div>
              </div>

              {form.card_photo && (
                <img
                  src={form.card_photo}
                  alt="Biglietto da visita"
                  className="rounded-xl border border-gray-200 max-h-56 object-contain bg-white w-full"
                  data-testid="detail-card-photo"
                />
              )}

              <LeadSections form={form} set={set} toggle={toggle} inArr={inArr} />
            </main>

            {/* Sticky Save */}
            <div className="fixed bottom-0 inset-x-0 z-10 bg-white/95 backdrop-blur border-t border-gray-200 p-4">
              <div className="max-w-3xl mx-auto flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  data-testid="lead-detail-cancel-btn"
                  className="min-h-[56px] rounded-xl border-2 border-gray-300 text-gray-600 px-6"
                >
                  Annulla
                </Button>
                <Button
                  data-testid="lead-detail-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 min-h-[56px] rounded-xl bg-buscema-green hover:bg-buscema-greenDark text-white text-lg font-semibold gap-3 shadow-lg"
                >
                  {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  Salva Modifiche
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
