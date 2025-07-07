from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import pywhatkit

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
    print(data)
    group_name = data.get("grupo")
    mensagem = data.get("mensagem")

    now = datetime.now() + timedelta(minutes=1)
    hour = now.hour
    minute = now.minute

    try:
        # Envia mensagem para o grupo
        pywhatkit.sendwhatmsg_to_group_instantly(f"{group_name}", mensagem, wait_time=10, tab_close=True)
        return {"status": "mensagem enviada com sucesso"}
    except Exception as e:
        return {"status": "erro", "detalhe": str(e)}

def whatsappTextHandler(data):


    return