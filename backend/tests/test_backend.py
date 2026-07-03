"""
Backend tests for Buscema Gastronomia lead capture app.
Covers: /api/history/auth, /api/leads (POST/GET), /api/leads/export, /api/leads/ocr
"""
import os
import io
import base64
import uuid
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fall back to frontend .env if env not exported when running pytest locally
    from pathlib import Path
    fe_env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if fe_env.exists():
        for line in fe_env.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api"
PASSWORD = "buscema2026"


# ------------------------------------------------------------------ fixtures
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(api):
    r = api.post(f"{API}/history/auth", json={"password": PASSWORD})
    assert r.status_code == 200, f"Auth failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def business_card_b64():
    """Generate a realistic-looking business card PNG with printed text."""
    img = Image.new("RGB", (900, 520), color=(250, 248, 240))
    draw = ImageDraw.Draw(img)
    # Try to load a truetype font, fall back to default
    def get_font(size):
        for path in [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]:
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    pass
        return ImageFont.load_default()

    font_big = get_font(44)
    font_med = get_font(28)
    font_sml = get_font(22)

    # Decorative bar
    draw.rectangle([0, 0, 900, 12], fill=(30, 90, 50))
    draw.rectangle([0, 508, 900, 520], fill=(197, 160, 89))

    draw.text((40, 40), "TEST_ACME IMPORT SRL", font=font_big, fill=(30, 90, 50))
    draw.text((40, 110), "Fine Italian Food Distribution", font=font_sml, fill=(90, 90, 90))
    draw.text((40, 180), "Marco Rossi", font=font_med, fill=(0, 0, 0))
    draw.text((40, 220), "Purchasing Manager", font=font_sml, fill=(80, 80, 80))
    draw.text((40, 290), "Email:  marco.rossi@acmeimport.it", font=font_sml, fill=(0, 0, 0))
    draw.text((40, 330), "Mobile: +39 335 1234567", font=font_sml, fill=(0, 0, 0))
    draw.text((40, 370), "Country: Italy", font=font_sml, fill=(0, 0, 0))
    draw.text((40, 430), "Via Roma 12, 20100 Milano - Italia", font=font_sml, fill=(120, 120, 120))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


# ------------------------------------------------------------------ auth
class TestHistoryAuth:
    def test_wrong_password_returns_401(self, api):
        r = api.post(f"{API}/history/auth", json={"password": "wrong-pass"})
        assert r.status_code == 401
        body = r.json()
        assert "detail" in body

    def test_correct_password_returns_token(self, api):
        r = api.post(f"{API}/history/auth", json={"password": PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert isinstance(data["token"], str) and len(data["token"]) > 20


# ------------------------------------------------------------------ leads CRUD
FULL_PAYLOAD = {
    "nome_fiera": "TEST_Cibus",
    "anno": 2026,
    "ragione_sociale": "TEST_ACME Import Srl",
    "paese": "Italia",
    "nome_buyer": "Marco Rossi",
    "ruolo": "Buyer",
    "email": "marco.rossi@acmeimport.it",
    "cellulare": "+39 335 1234567",
    "lingua": ["IT", "EN"],
    "sesso": "Uomo",
    "tipologia_azienda": ["Importatore", "Distributore"],
    "interesse_brand": ["Buscema", "Nonno Gino"],
    "interesse_prodotti": ["Carciofi", "Olive"],
    "packaging_canale": ["Retail", "Ho.Re.Ca."],
    "formato": "Vaso 314ml",
    "progetto_tipo": ["Private Label"],
    "progetto_volume": ["Container", "Annuale"],
    "campioni_stato": ["Da spedire"],
    "campioni_prodotti": "Carciofi grigliati",
    "priorita": "A",
    "potenziale": 5,
    "note": "TEST_ integration lead",
    "card_photo": None,
}


class TestLeadsCRUD:
    def test_create_lead_returns_id_and_persists(self, api, auth_headers):
        payload = dict(FULL_PAYLOAD)
        payload["ragione_sociale"] = f"TEST_ACME_{uuid.uuid4().hex[:6]}"
        r = api.post(f"{API}/leads", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert "id" in created and isinstance(created["id"], str)
        assert created["ragione_sociale"] == payload["ragione_sociale"]
        assert created["priorita"] == "A"
        assert created["potenziale"] == 5
        assert created["interesse_brand"] == ["Buscema", "Nonno Gino"]

        # Verify via GET (requires auth)
        g = api.get(f"{API}/leads", headers=auth_headers,
                    params={"ragione_sociale": payload["ragione_sociale"]})
        assert g.status_code == 200
        items = g.json()
        assert any(x["id"] == created["id"] for x in items), "Created lead not returned in list"
        found = next(x for x in items if x["id"] == created["id"])
        # Data assertions on persisted data
        assert found["nome_fiera"] == "TEST_Cibus"
        assert found["tipologia_azienda"] == ["Importatore", "Distributore"]
        assert found["formato"] == "Vaso 314ml"

    def test_list_leads_requires_auth(self, api):
        r = api.get(f"{API}/leads")
        assert r.status_code == 401

    def test_list_leads_bad_token(self, api):
        r = api.get(f"{API}/leads", headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401

    def test_filter_by_priorita(self, api, auth_headers):
        # ensure at least one B-priority lead
        p = dict(FULL_PAYLOAD)
        p["ragione_sociale"] = f"TEST_B_{uuid.uuid4().hex[:6]}"
        p["priorita"] = "B"
        api.post(f"{API}/leads", json=p)
        r = api.get(f"{API}/leads", headers=auth_headers, params={"priorita": "B"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all(x["priorita"] == "B" for x in items)

    def test_filter_by_fiera_regex(self, api, auth_headers):
        r = api.get(f"{API}/leads", headers=auth_headers, params={"fiera": "TEST_Cib"})
        assert r.status_code == 200
        items = r.json()
        assert all("TEST_Cib".lower() in x["nome_fiera"].lower() for x in items)
        assert len(items) >= 1

    def test_filter_by_ragione_sociale_regex(self, api, auth_headers):
        # create a distinctive one
        p = dict(FULL_PAYLOAD)
        marker = f"TEST_UNIQ_{uuid.uuid4().hex[:6]}"
        p["ragione_sociale"] = f"{marker} Srl"
        api.post(f"{API}/leads", json=p)
        r = api.get(f"{API}/leads", headers=auth_headers, params={"ragione_sociale": marker})
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 1
        assert items[0]["ragione_sociale"] == f"{marker} Srl"


# ------------------------------------------------------------------ single lead GET / PUT
class TestLeadGetUpdate:
    def _create(self, api, ragione="TEST_GetUpd"):
        p = dict(FULL_PAYLOAD)
        p["ragione_sociale"] = f"{ragione}_{uuid.uuid4().hex[:6]}"
        r = api.post(f"{API}/leads", json=p)
        assert r.status_code == 200, r.text
        return r.json()

    def test_get_single_lead_requires_auth(self, api):
        created = self._create(api)
        r = api.get(f"{API}/leads/{created['id']}")
        assert r.status_code == 401

    def test_get_single_lead_ok(self, api, auth_headers):
        created = self._create(api)
        r = api.get(f"{API}/leads/{created['id']}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == created["id"]
        assert data["ragione_sociale"] == created["ragione_sociale"]
        assert data["priorita"] == "A"
        assert data["potenziale"] == 5
        assert data["interesse_brand"] == ["Buscema", "Nonno Gino"]
        # No mongo _id leaked
        assert "_id" not in data

    def test_get_single_lead_not_found(self, api, auth_headers):
        r = api.get(f"{API}/leads/{uuid.uuid4()}", headers=auth_headers)
        assert r.status_code == 404

    def test_put_lead_requires_auth(self, api):
        created = self._create(api)
        r = api.put(f"{API}/leads/{created['id']}", json=created)
        assert r.status_code == 401

    def test_put_lead_updates_and_preserves_id_created_at(self, api, auth_headers):
        created = self._create(api, ragione="TEST_PutUpd")
        original_id = created["id"]
        original_created_at = created["created_at"]

        updated_payload = dict(created)
        updated_payload["ragione_sociale"] = created["ragione_sociale"] + "_MODIFICATA"
        updated_payload["priorita"] = "B"
        updated_payload["potenziale"] = 3
        updated_payload["note"] = "TEST_ updated via PUT"
        # Try to spoof id and created_at - backend must preserve original
        updated_payload["id"] = "spoofed-id-should-be-ignored"
        updated_payload["created_at"] = "1999-01-01T00:00:00+00:00"

        r = api.put(f"{API}/leads/{original_id}", json=updated_payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == original_id, "id must be preserved"
        assert data["created_at"] == original_created_at, "created_at must be preserved"
        assert data["ragione_sociale"].endswith("_MODIFICATA")
        assert data["priorita"] == "B"
        assert data["potenziale"] == 3
        assert data["note"] == "TEST_ updated via PUT"

        # Verify persistence via GET
        g = api.get(f"{API}/leads/{original_id}", headers=auth_headers)
        assert g.status_code == 200
        fetched = g.json()
        assert fetched["id"] == original_id
        assert fetched["created_at"] == original_created_at
        assert fetched["ragione_sociale"].endswith("_MODIFICATA")
        assert fetched["priorita"] == "B"
        assert fetched["potenziale"] == 3

    def test_put_lead_not_found(self, api, auth_headers):
        payload = dict(FULL_PAYLOAD)
        r = api.put(f"{API}/leads/{uuid.uuid4()}", json=payload, headers=auth_headers)
        assert r.status_code == 404


# ------------------------------------------------------------------ single lead DELETE
class TestLeadDelete:
    def _create(self, api, ragione="TEST_Del"):
        p = dict(FULL_PAYLOAD)
        p["ragione_sociale"] = f"{ragione}_{uuid.uuid4().hex[:6]}"
        r = api.post(f"{API}/leads", json=p)
        assert r.status_code == 200, r.text
        return r.json()

    def test_delete_lead_requires_auth(self, api):
        created = self._create(api)
        r = api.delete(f"{API}/leads/{created['id']}")
        assert r.status_code == 401
        body = r.json()
        assert "detail" in body

    def test_delete_lead_bad_token(self, api):
        created = self._create(api)
        r = api.delete(f"{API}/leads/{created['id']}",
                       headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401

    def test_delete_lead_ok_and_persisted(self, api, auth_headers):
        created = self._create(api, ragione="TEST_DelOK")
        lead_id = created["id"]
        r = api.delete(f"{API}/leads/{lead_id}", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("deleted") is True
        assert body.get("id") == lead_id
        # GET should now 404
        g = api.get(f"{API}/leads/{lead_id}", headers=auth_headers)
        assert g.status_code == 404
        # And the lead is gone from the list
        lst = api.get(f"{API}/leads", headers=auth_headers,
                      params={"ragione_sociale": created["ragione_sociale"]})
        assert lst.status_code == 200
        assert all(item["id"] != lead_id for item in lst.json())

    def test_delete_lead_not_found(self, api, auth_headers):
        r = api.delete(f"{API}/leads/{uuid.uuid4()}", headers=auth_headers)
        assert r.status_code == 404
        body = r.json()
        assert "detail" in body

    def test_delete_lead_idempotent_second_call_404(self, api, auth_headers):
        created = self._create(api, ragione="TEST_DelIdem")
        lead_id = created["id"]
        r1 = api.delete(f"{API}/leads/{lead_id}", headers=auth_headers)
        assert r1.status_code == 200
        r2 = api.delete(f"{API}/leads/{lead_id}", headers=auth_headers)
        assert r2.status_code == 404


# ------------------------------------------------------------------ export
class TestExport:
    def test_export_requires_auth(self, api):
        r = api.get(f"{API}/leads/export")
        assert r.status_code == 401

    def test_export_returns_csv_semicolon_no_photo_col(self, api, auth_headers):
        r = api.get(f"{API}/leads/export", headers=auth_headers)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        text = r.text
        header_line = text.splitlines()[0]
        # Semicolon delimiter
        assert ";" in header_line
        # Expected columns
        for col in ["Data", "Fiera", "Anno", "Ragione Sociale", "Priorità", "Potenziale", "Note"]:
            assert col in header_line, f"Missing column {col} in CSV header: {header_line}"
        # card_photo must NOT be present as a column
        assert "card_photo" not in text.lower()
        assert "Foto" not in header_line  # no photo-related header

    def test_export_respects_filter(self, api, auth_headers):
        r = api.get(f"{API}/leads/export", headers=auth_headers, params={"priorita": "A"})
        assert r.status_code == 200
        text = r.text
        lines = text.splitlines()
        assert len(lines) >= 2  # header + at least one row (we created A above)
        # Priorità column - check every data row has A in that column
        header = lines[0].split(";")
        try:
            pi = header.index("Priorità")
        except ValueError:
            pytest.fail(f"Priorità column not found in {header}")
        for row in lines[1:]:
            cols = row.split(";")
            if len(cols) > pi:
                assert cols[pi] == "A", f"Row not filtered to A: {row}"


# ------------------------------------------------------------------ OCR
class TestOCR:
    def test_ocr_extracts_business_card_fields(self, api, business_card_b64):
        r = api.post(f"{API}/leads/ocr", json={"image_base64": business_card_b64}, timeout=90)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        # Required keys always present
        required = {"ragione_sociale", "nome_buyer", "ruolo", "email", "cellulare", "paese"}
        assert required.issubset(set(data.keys()))
        # At least some fields must be non-empty (real OCR)
        non_empty = {k: v for k, v in data.items() if v}
        assert len(non_empty) >= 3, f"Too few fields extracted: {data}"
        # Loose content checks: at least one of these should reflect card content
        joined = " ".join(str(v).lower() for v in data.values())
        assert ("rossi" in joined) or ("acme" in joined) or ("marco" in joined), (
            f"OCR result doesn't contain expected card content: {data}"
        )

    def test_ocr_with_data_url_prefix(self, api, business_card_b64):
        data_url = f"data:image/png;base64,{business_card_b64}"
        r = api.post(f"{API}/leads/ocr", json={"image_base64": data_url}, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "ragione_sociale" in data
