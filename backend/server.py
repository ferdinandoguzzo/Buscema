from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import json
import logging
import uuid
import jwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
HISTORY_PASSWORD = os.environ.get('HISTORY_PASSWORD', 'buscema2026')
JWT_SECRET = os.environ.get('HISTORY_JWT_SECRET', 'change-me')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ----------------------------- Models -----------------------------
class Lead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome_fiera: str = ""
    anno: int = 2026
    # Anagrafica
    ragione_sociale: str = ""
    paese: str = ""
    nome_buyer: str = ""
    ruolo: str = ""
    email: str = ""
    cellulare: str = ""
    lingua: List[str] = []
    sesso: str = ""
    # Tipologia azienda
    tipologia_azienda: List[str] = []
    # Interesse
    interesse_brand: List[str] = []
    interesse_prodotti: List[str] = []
    # Packaging
    packaging_canale: List[str] = []
    formato: str = ""
    # Progetto
    progetto_tipo: List[str] = []
    progetto_volume: List[str] = []
    # Campioni
    campioni_stato: List[str] = []
    campioni_prodotti: str = ""
    # Valutazione
    priorita: str = ""
    potenziale: int = 0
    # Note
    note: str = ""
    # Allegato
    card_photo: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OCRRequest(BaseModel):
    image_base64: str


class AuthRequest(BaseModel):
    password: str


# ----------------------------- Auth -----------------------------
def create_token() -> str:
    payload = {"role": "operator", "exp": datetime.now(timezone.utc) + timedelta(days=1)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autorizzato")
    token = authorization.split(" ", 1)[1]
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessione scaduta o non valida")
    return True


@api_router.post("/history/auth")
async def history_auth(req: AuthRequest):
    if req.password != HISTORY_PASSWORD:
        raise HTTPException(status_code=401, detail="Password errata")
    return {"token": create_token()}


# ----------------------------- OCR -----------------------------
@api_router.post("/leads/ocr")
async def ocr_business_card(req: OCRRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Chiave LLM non configurata")
    b64 = req.image_base64
    if "," in b64 and b64.strip().startswith("data:"):
        b64 = b64.split(",", 1)[1]
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=(
                "Sei un assistente OCR per biglietti da visita. "
                "Estrai i dati dal biglietto e rispondi SOLO con JSON valido, "
                "senza testo aggiuntivo, con queste chiavi: "
                "ragione_sociale, nome_buyer, ruolo, email, cellulare, paese. "
                "Se un campo non è presente lascialo come stringa vuota."
            ),
        ).with_model("anthropic", "claude-sonnet-4-6")
        image = ImageContent(image_base64=b64)
        msg = UserMessage(
            text="Estrai i dati anagrafici da questo biglietto da visita e restituiscili in JSON.",
            file_contents=[image],
        )
        response = await chat.send_message(msg)
        text = response.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
        start, end = text.find("{"), text.rfind("}")
        data = json.loads(text[start:end + 1]) if start != -1 else {}
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore OCR: {str(e)}")

    keys = ["ragione_sociale", "nome_buyer", "ruolo", "email", "cellulare", "paese"]
    return {k: str(data.get(k, "") or "") for k in keys}


# ----------------------------- Leads -----------------------------
@api_router.post("/leads", response_model=Lead)
async def create_lead(lead: Lead):
    doc = lead.model_dump()
    await db.leads.insert_one(doc)
    return lead


@api_router.get("/leads", response_model=List[Lead])
async def list_leads(
    priorita: Optional[str] = None,
    fiera: Optional[str] = None,
    ragione_sociale: Optional[str] = None,
    _: bool = Depends(verify_token),
):
    query = {}
    if priorita:
        query["priorita"] = priorita
    if fiera:
        query["nome_fiera"] = {"$regex": fiera, "$options": "i"}
    if ragione_sociale:
        query["ragione_sociale"] = {"$regex": ragione_sociale, "$options": "i"}
    docs = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [Lead(**d) for d in docs]


@api_router.get("/leads/export")
async def export_leads(
    priorita: Optional[str] = None,
    fiera: Optional[str] = None,
    ragione_sociale: Optional[str] = None,
    _: bool = Depends(verify_token),
):
    query = {}
    if priorita:
        query["priorita"] = priorita
    if fiera:
        query["nome_fiera"] = {"$regex": fiera, "$options": "i"}
    if ragione_sociale:
        query["ragione_sociale"] = {"$regex": ragione_sociale, "$options": "i"}
    docs = await db.leads.find(query, {"_id": 0, "card_photo": 0}).sort("created_at", -1).to_list(5000)

    columns = [
        ("created_at", "Data"), ("nome_fiera", "Fiera"), ("anno", "Anno"),
        ("ragione_sociale", "Ragione Sociale"), ("paese", "Paese"),
        ("nome_buyer", "Nome Buyer"), ("ruolo", "Ruolo"), ("email", "Email"),
        ("cellulare", "Cellulare/WhatsApp"), ("lingua", "Lingua"), ("sesso", "Sesso"),
        ("tipologia_azienda", "Tipologia Azienda"),
        ("interesse_brand", "Brand"), ("interesse_prodotti", "Prodotti"),
        ("packaging_canale", "Canale"), ("formato", "Formato"),
        ("progetto_tipo", "Tipo Progetto"), ("progetto_volume", "Volume"),
        ("campioni_stato", "Campioni Stato"), ("campioni_prodotti", "Campioni Prodotti"),
        ("priorita", "Priorità"), ("potenziale", "Potenziale"), ("note", "Note"),
    ]
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow([c[1] for c in columns])
    for d in docs:
        row = []
        for key, _label in columns:
            val = d.get(key, "")
            if isinstance(val, list):
                val = ", ".join(val)
            row.append(val)
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=buscema_leads.csv"},
    )


@api_router.get("/")
async def root():
    return {"message": "Buscema Gastronomia API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
