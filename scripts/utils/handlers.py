from fastapi import FastAPI, Request
from datetime import datetime, timedelta
import pywhatkit

app = FastAPI()

@app.post("/enviar_mensagem")
async def enviar_mensagem(request: Request):
    data = await request.json()
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
