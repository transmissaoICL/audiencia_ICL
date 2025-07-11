from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import pywhatkit
import json

# Colocar no terminal para rodar o servidor
# uvicorn scripts.utils.handlers:app --reload --port 8000

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ou especifique ["http://localhost:3000"] por exemplo
    allow_credentials=True,
    allow_methods=["*"],  # permite POST, GET, OPTIONS etc.
    allow_headers=["*"],
)

@app.post("/api/whatsapp")
async def enviar_mensagem(request: Request):
    data = await request.json()
    group_name = data.get("grupo")
    mensagem = whatsappTextHandler(json.loads(data.get("audiencia")))
    
    now = datetime.now() + timedelta(minutes=1)

    try:
        # Envia mensagem para o grupo
        pywhatkit.sendwhatmsg_to_group_instantly(group_id=group_name, message=mensagem, wait_time=10, tab_close=True)
        return {"status": "mensagem enviada com sucesso"}
    except Exception as e:
        return {"status": f"erro: {e}"}

def whatsappTextHandler(data):
    print(data)
    audiencia_yt = 0
    audiencia_fb = 0
    audiencia_insta = 0
    audiencia_total = 0

    for canal in data:
        match canal.get('plataforma'):
            case 'YouTube':
                ultimo_dado = list(canal.get('dadosHistoricos').keys())[-1]
                audiencia_yt += canal.get('dadosHistoricos')[ultimo_dado]
                continue
            case 'Facebook':
                ultimo_dado = list(canal.get('dadosHistoricos').keys())[-1]
                audiencia_fb += canal.get('dadosHistoricos')[ultimo_dado]
                continue
            case 'Instagram':
                ultimo_dado = list(canal.get('dadosHistoricos').keys())[-1]
                audiencia_insta += canal.get('dadosHistoricos')[ultimo_dado]
                continue
    
    audiencia_total = audiencia_yt + audiencia_fb + audiencia_insta
    mensagem = f'*ICL NOTICIAS - Audiencia:* \n\n Facebook: {audiencia_fb} - Youtube: {audiencia_yt} - Instagram: {audiencia_insta}\n\n Total: {audiencia_total}'
    return mensagem