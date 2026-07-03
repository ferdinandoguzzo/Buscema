// Parse a vCard string (from a QR code) into Buscema anagrafica fields.
export function parseVCard(text) {
  const result = {
    ragione_sociale: "",
    nome_buyer: "",
    ruolo: "",
    email: "",
    cellulare: "",
    paese: "",
  };
  if (!text || !/BEGIN:VCARD/i.test(text)) return result;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.substring(0, idx).toUpperCase();
    const value = line.substring(idx + 1).trim();

    if (key.startsWith("FN")) {
      result.nome_buyer = value;
    } else if (key.startsWith("N") && !key.startsWith("NOTE") && !result.nome_buyer) {
      result.nome_buyer = value.split(";").filter(Boolean).reverse().join(" ").trim();
    } else if (key.startsWith("ORG")) {
      result.ragione_sociale = value.replace(/;/g, " ").trim();
    } else if (key.startsWith("TITLE") || key.startsWith("ROLE")) {
      result.ruolo = value;
    } else if (key.startsWith("EMAIL")) {
      if (!result.email) result.email = value;
    } else if (key.startsWith("TEL")) {
      if (!result.cellulare) result.cellulare = value;
    } else if (key.startsWith("ADR")) {
      const parts = value.split(";").filter(Boolean);
      if (parts.length) result.paese = parts[parts.length - 1].trim();
    }
  }
  return result;
}
