"""
Jellyfin Venda System - Backend Funcional e Robusto
Arquivo principal: main.py
Persistência: JSON (simples e funcional)
"""

from __future__ import annotations
import os
import json
import secrets
import smtplib
import requests
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from email.message import EmailMessage
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler

try:
    import mercadopago
except:
    mercadopago = None

# ============================================================================
# CONFIGURAÇÕES E CONSTANTES
# ============================================================================

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000")
SECRET_KEY = os.getenv("SECRET_KEY", "chave-secreta-padrao-mudar")
ADMIN_USER = os.getenv("ADM_SUPREMO_LOGIN", "admin")
ADMIN_PASS = os.getenv("ADM_SUPREMO_PASSWORD", "admin")

# Caminhos de persistência (tudo em /app/backend/data/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

PATHS = {
    "config": os.path.join(DATA_DIR, "config.json"),
    "clientes": os.path.join(DATA_DIR, "clientes.json"),
    "giftcards": os.path.join(DATA_DIR, "giftcards.json"),
    "revendedores": os.path.join(DATA_DIR, "revendedores.json"),
    "lotes": os.path.join(DATA_DIR, "lotes.json"),
    "pendentes": os.path.join(DATA_DIR, "pendentes.json"),
    "logs": os.path.join(DATA_DIR, "logs.json"),
    "emails": os.path.join(DATA_DIR, "email_config.json"),
    "funcionarios": os.path.join(DATA_DIR, "funcionarios.json"),
    "landing": os.path.join(DATA_DIR, "landing_config.json"),
}

# ============================================================================
# FUNÇÕES DE PERSISTÊNCIA (JSON)
# ============================================================================

def load_json(path: str, default: Any = None) -> Any:
    """Carrega JSON de arquivo, retorna default se não existir."""
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        log_error(f"Erro ao carregar {path}: {e}")
    return default if default is not None else {}

def save_json(path: str, data: Any) -> bool:
    """Salva JSON em arquivo. Retorna True se sucesso."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        log_error(f"Erro ao salvar {path}: {e}")
        return False

def log_event(tipo: str, origem: str, mensagem: str):
    """Adiciona log ao sistema."""
    logs = load_json(PATHS["logs"], [])
    logs.insert(0, {
        "id": len(logs) + 1,
        "tipo": tipo,
        "origem": origem,
        "mensagem": mensagem,
        "data": datetime.utcnow().isoformat() + "Z"
    })
    # Limita a 1000 logs
    if len(logs) > 1000:
        logs = logs[:1000]
    save_json(PATHS["logs"], logs)

def log_info(origem: str, mensagem: str):
    log_event("info", origem, mensagem)

def log_error(mensagem: str):
    log_event("error", "sistema", mensagem)
    print(f"[ERRO] {mensagem}")

def log_warning(origem: str, mensagem: str):
    log_event("warning", origem, mensagem)

# ============================================================================
# CONFIGURAÇÕES DO SISTEMA
# ============================================================================

def get_config() -> Dict[str, Any]:
    """Retorna configurações atuais do sistema (merge env + JSON)."""
    defaults = {
        # Jellyfin
        "jellyfin_url": os.getenv("JELLYFIN_URL", ""),
        "jellyfin_api_key": os.getenv("JELLYFIN_API_KEY", ""),
        # Mercado Pago
        "mp_access_token": os.getenv("MERCADO_PAGO_ACCESS_TOKEN", ""),
        "mp_webhook_url": os.getenv("MERCADO_PAGO_NOTIFICATION_URL", f"{APP_BASE_URL}/api/mp/webhook"),
        # Preços
        "preco_mensal": "29.90",
        "preco_trial": "1.00",
        "preco_giftcard": "29.90",
        # Durações
        "dias_assinatura": "30",
        "dias_trial": "7",
        "dias_giftcard": "30",
        # SMTP
        "smtp_host": "",
        "smtp_port": "587",
        "smtp_user": "",
        "smtp_pass": "",
        "smtp_from": "",
        "smtp_tls": "true",
        # WhatsApp (Evolution)
        "evolution_url": "",
        "evolution_key": "",
        "evolution_instance": "",
        "whatsapp_template": "Olá {{nome}}! Sua assinatura foi ativada. Acesse: {{jellyfin_url}}",
        # Landing
        "landing_enabled": "true",
        "landing_title": "Jellyfin Premium",
        "landing_subtitle": "Teste 7 dias por apenas R$ 1,00",
    }
    
    saved = load_json(PATHS["config"], {})
    defaults.update(saved)
    return defaults

def save_config(cfg: Dict[str, Any]) -> bool:
    """Salva configurações no JSON."""
    return save_json(PATHS["config"], cfg)

def get_float_config(key: str, default: float = 0.0) -> float:
    """Pega config como float."""
    try:
        return float(get_config().get(key, default))
    except:
        return default

def get_int_config(key: str, default: int = 0) -> int:
    """Pega config como int."""
    try:
        return int(get_config().get(key, default))
    except:
        return default

# ============================================================================
# INTEGRAÇÃO JELLYFIN
# ============================================================================

class JellyfinService:
    """Toda a integração com Jellyfin centralizada aqui."""
    
    @staticmethod
    def get_headers() -> Dict[str, str]:
        cfg = get_config()
        return {
            "X-Emby-Token": cfg.get("jellyfin_api_key", ""),
            "Content-Type": "application/json",
        }
    
    @staticmethod
    def get_base_url() -> str:
        return get_config().get("jellyfin_url", "").rstrip("/")
    
    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """Testa conexão com Jellyfin."""
        try:
            url = f"{cls.get_base_url()}/System/Info/Public"
            r = requests.get(url, headers=cls.get_headers(), timeout=10)
            return {"ok": r.status_code == 200, "status": r.status_code}
        except Exception as e:
            return {"ok": False, "error": str(e)}
    
    @classmethod
    def list_users(cls) -> List[Dict]:
        """Lista todos os usuários do Jellyfin."""
        try:
            url = f"{cls.get_base_url()}/Users"
            r = requests.get(url, headers=cls.get_headers(), timeout=15)
            if r.status_code == 200:
                return r.json() if isinstance(r.json(), list) else []
        except Exception as e:
            log_error(f"Erro ao listar usuários Jellyfin: {e}")
        return []
    
    @classmethod
    def find_user_by_name(cls, username: str) -> Optional[str]:
        """Procura usuário pelo nome (email), retorna ID se encontrar."""
        users = cls.list_users()
        username_lower = username.lower().strip()
        for u in users:
            if isinstance(u, dict):
                name = str(u.get("Name", "")).lower().strip()
                if name == username_lower:
                    return str(u.get("Id", ""))
        return None
    
    @classmethod
    def create_user(cls, username: str, password: str) -> Optional[str]:
        """Cria usuário no Jellyfin. Se já existir, retorna o ID existente."""
        try:
            # Primeiro tenta criar
            url = f"{cls.get_base_url()}/Users/New"
            r = requests.post(url, headers=cls.get_headers(), json={"Name": username}, timeout=15)
            
            if r.status_code in (200, 201):
                data = r.json()
                user_id = str(data.get("Id", ""))
                log_info("jellyfin", f"Usuário criado: {username} (ID: {user_id})")
            elif r.status_code == 400:
                # Provavelmente já existe, procura
                user_id = cls.find_user_by_name(username)
                if user_id:
                    log_info("jellyfin", f"Usuário já existia, reutilizando: {username}")
                else:
                    log_error(f"Falha ao criar usuário {username} e não encontrado na lista")
                    return None
            else:
                log_error(f"Falha ao criar usuário {username}: {r.status_code}")
                return None
            
            # Define senha
            if user_id:
                cls.set_password(user_id, password)
                cls.apply_policy(user_id)
            
            return user_id
            
        except Exception as e:
            log_error(f"Erro ao criar usuário Jellyfin: {e}")
            return None
    
    @classmethod
    def set_password(cls, user_id: str, password: str) -> bool:
        """Define senha do usuário."""
        try:
            url = f"{cls.get_base_url()}/Users/{user_id}/Password"
            r = requests.post(
                url, 
                headers=cls.get_headers(), 
                json={"CurrentPw": "", "NewPw": password},
                timeout=15
            )
            return r.status_code in (200, 204)
        except Exception as e:
            log_error(f"Erro ao definir senha: {e}")
            return False
    
    @classmethod
    def apply_policy(cls, user_id: str) -> bool:
        """Aplica policy de acesso (sem transcoding)."""
        try:
            # Primeiro pega a policy atual
            url = f"{cls.get_base_url()}/Users/{user_id}/Policy"
            r = requests.get(url, headers=cls.get_headers(), timeout=15)
            
            policy = r.json() if r.status_code == 200 and isinstance(r.json(), dict) else {}
            
            # Modifica para permitir playback sem transcoding
            policy["EnableMediaPlayback"] = True
            policy["EnableAudioPlaybackTranscoding"] = False
            policy["EnableVideoPlaybackTranscoding"] = False
            policy["EnableVideoPlaybackRemuxing"] = True
            policy["ForceRemoteSourceTranscoding"] = False
            policy["EnableAllFolders"] = True
            
            # Salva
            r2 = requests.post(url, headers=cls.get_headers(), json=policy, timeout=15)
            return r2.status_code in (200, 204)
            
        except Exception as e:
            log_error(f"Erro ao aplicar policy: {e}")
            return False
    
    @classmethod
    def delete_user(cls, user_id: str) -> bool:
        """Remove usuário do Jellyfin."""
        try:
            url = f"{cls.get_base_url()}/Users/{user_id}"
            r = requests.delete(url, headers=cls.get_headers(), timeout=15)
            return r.status_code in (200, 204)
        except Exception as e:
            log_error(f"Erro ao deletar usuário: {e}")
            return False

# ============================================================================
# INTEGRAÇÃO MERCADO PAGO
# ============================================================================

class MercadoPagoService:
    """Integração com Mercado Pago."""
    
    _sdk = None
    
    @classmethod
    def get_sdk(cls):
        """Retorna SDK inicializado ou None."""
        if cls._sdk is None and mercadopago:
            token = get_config().get("mp_access_token", "")
            if token:
                cls._sdk = mercadopago.SDK(token)
        return cls._sdk
    
    @classmethod
    def is_configured(cls) -> bool:
        return bool(cls.get_sdk())
    
    @classmethod
    def create_preference(cls, title: str, price: float, quantity: int, 
                         payer_email: str, external_ref: str) -> Dict[str, Any]:
        """Cria preferência de pagamento no MP."""
        sdk = cls.get_sdk()
        if not sdk:
            raise HTTPException(500, "Mercado Pago não configurado")
        
        preference_data = {
            "items": [{
                "title": title,
                "quantity": quantity,
                "unit_price": float(price),
                "currency_id": "BRL",
            }],
            "payer": {"email": payer_email},
            "external_reference": external_ref,
            "back_urls": {
                "success": f"{APP_BASE_URL}/?status=success&ref={external_ref}",
                "failure": f"{APP_BASE_URL}/?status=failure&ref={external_ref}",
                "pending": f"{APP_BASE_URL}/?status=pending&ref={external_ref}",
            },
            "auto_return": "approved",
            "notification_url": get_config().get("mp_webhook_url", ""),
        }
        
        result = sdk.preference().create(preference_data)
        
        if result.get("status") not in (200, 201):
            raise HTTPException(502, f"Erro MP: {result}")
        
        body = result.get("response", {})
        return {
            "preference_id": body.get("id"),
            "payment_url": body.get("init_point") or body.get("sandbox_init_point"),
        }
    
    @classmethod
    def get_payment(cls, payment_id: str) -> Optional[Dict]:
        """Busca pagamento por ID."""
        sdk = cls.get_sdk()
        if not sdk:
            return None
        
        try:
            result = sdk.payment().get(payment_id)
            if result.get("status") in (200, 201):
                return result.get("response", {})
        except Exception as e:
            log_error(f"Erro ao buscar pagamento {payment_id}: {e}")
        return None

# ============================================================================
# SERVIÇO DE EMAIL
# ============================================================================

class EmailService:
    """Envio de emails SMTP."""
    
    @classmethod
    def send(cls, to_email: str, subject: str, html_content: str) -> bool:
        """Envia email. Retorna True se sucesso."""
        cfg = get_config()
        
        host = cfg.get("smtp_host", "")
        port = int(cfg.get("smtp_port", "587"))
        user = cfg.get("smtp_user", "")
        password = cfg.get("smtp_pass", "")
        from_email = cfg.get("smtp_from", user)
        
        if not host or not from_email:
            log_warning("email", "SMTP não configurado")
            return False
        
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to_email
            msg.set_content("Email em HTML")
            msg.add_alternative(html_content, subtype="html")
            
            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=30)
            else:
                server = smtplib.SMTP(host, port, timeout=30)
            
            with server:
                if port != 465:
                    try:
                        server.starttls()
                    except:
                        pass
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
            
            log_info("email", f"Email enviado para {to_email}: {subject}")
            return True
            
        except Exception as e:
            log_error(f"Falha ao enviar email: {e}")
            return False
    
    @classmethod
    def send_welcome(cls, nome: str, email: str, senha: str, jellyfin_url: str) -> bool:
        """Email de boas-vindas."""
        subject = "Bem-vindo ao Jellyfin Premium!"
        html = f"""
        <h2>Olá {nome}!</h2>
        <p>Sua assinatura foi ativada com sucesso.</p>
        <p><strong>Dados de acesso:</strong></p>
        <ul>
            <li>Email: {email}</li>
            <li>Senha: {senha}</li>
            <li>Acesse: <a href="{jellyfin_url}">{jellyfin_url}</a></li>
        </ul>
        """
        return cls.send(email, subject, html)
    
    @classmethod
    def send_giftcards(cls, to_email: str, codigos: List[str], lote_id: str) -> bool:
        """Email com códigos de gift cards."""
        subject = f"Seus Gift Cards - Lote {lote_id}"
        codigos_html = "<br>".join([f"<code>{c}</code>" for c in codigos])
        html = f"""
        <h2>Seus Gift Cards foram liberados!</h2>
        <p><strong>Lote:</strong> {lote_id}</p>
        <p><strong>Códigos:</strong></p>
        {codigos_html}
        <p>Para resgatar, acesse nossa página e clique em "Resgatar Gift Card".</p>
        """
        return cls.send(to_email, subject, html)

# ============================================================================
# SERVIÇO WHATSAPP (Evolution)
# ============================================================================

class WhatsAppService:
    """Envio de mensagens via Evolution API."""
    
    @classmethod
    def send(cls, telefone: str, mensagem: str) -> bool:
        """Envia mensagem WhatsApp."""
        cfg = get_config()
        
        base_url = cfg.get("evolution_url", "").rstrip("/")
        api_key = cfg.get("evolution_key", "")
        instance = cfg.get("evolution_instance", "")
        
        if not base_url or not api_key or not instance:
            return False
        
        try:
            # Normaliza telefone (só números)
            numero = "".join(c for c in telefone if c.isdigit())
            if not numero:
                return False
            
            url = f"{base_url}/message/sendText/{instance}"
            headers = {"apikey": api_key, "Content-Type": "application/json"}
            payload = {"number": numero, "text": mensagem}
            
            r = requests.post(url, headers=headers, json=payload, timeout=20)
            if r.status_code in (200, 201, 202):
                log_info("whatsapp", f"Mensagem enviada para {numero}")
                return True
            else:
                log_warning("whatsapp", f"Falha ao enviar: {r.status_code}")
                return False
                
        except Exception as e:
            log_error(f"Erro WhatsApp: {e}")
            return False
    
    @classmethod
    def send_welcome(cls, nome: str, email: str, senha: str, telefone: str) -> bool:
        """Envia mensagem de boas-vindas."""
        cfg = get_config()
        template = cfg.get("whatsapp_template", "Olá {{nome}}! Sua assinatura foi ativada.")
        
        mensagem = template.replace("{{nome}}", nome).replace("{{email}}", email).replace("{{senha}}", senha)
        
        return cls.send(telefone, mensagem)

# ============================================================================
# MODELOS DE DADOS (CRUD)
# ============================================================================

class ClienteModel:
    """Operações com clientes."""
    
    @classmethod
    def listar(cls) -> List[Dict]:
        return load_json(PATHS["clientes"], [])
    
    @classmethod
    def salvar(cls, clientes: List[Dict]) -> bool:
        return save_json(PATHS["clientes"], clientes)
    
    @classmethod
    def buscar_por_email(cls, email: str) -> Optional[Dict]:
        clientes = cls.listar()
        email_lower = email.lower().strip()
        for c in clientes:
            if isinstance(c, dict) and c.get("email", "").lower().strip() == email_lower:
                return c
        return None
    
    @classmethod
    def criar(cls, nome: str, email: str, telefone: str, senha: str, 
              origem: str = "manual", validade_dias: Optional[int] = None) -> Optional[Dict]:
        """Cria cliente e usuário Jellyfin."""
        
        # Verifica se já existe ativo
        existente = cls.buscar_por_email(email)
        if existente and existente.get("ativo"):
            raise HTTPException(409, "Email já cadastrado e ativo")
        
        # Dias de validade
        if validade_dias is None:
            validade_dias = get_int_config("dias_assinatura", 30)
        
        now = datetime.utcnow()
        expira = now + timedelta(days=validade_dias)
        
        # Cria no Jellyfin
        jf_id = JellyfinService.create_user(email, senha)
        if not jf_id:
            raise HTTPException(502, "Falha ao criar usuário no Jellyfin")
        
        # Dados do cliente
        cliente = {
            "id": existente.get("id") if existente else secrets.token_hex(8),
            "nome": nome,
            "email": email,
            "telefone": telefone,
            "senha": senha,  # Em produção deveria ser hash
            "jellyfin_id": jf_id,
            "ativo": True,
            "origem": origem,
            "criado_em": now.isoformat() + "Z",
            "expira_em": expira.isoformat() + "Z",
        }
        
        # Salva
        clientes = cls.listar()
        if existente:
            # Atualiza existente
            for i, c in enumerate(clientes):
                if c.get("email") == email:
                    clientes[i] = cliente
                    break
        else:
            clientes.append(cliente)
        
        cls.salvar(clientes)
        
        # Notificações
        try:
            EmailService.send_welcome(nome, email, senha, JellyfinService.get_base_url())
        except:
            pass
        
        if telefone:
            try:
                WhatsAppService.send_welcome(nome, email, senha, telefone)
            except:
                pass
        
        log_info("cliente", f"Cliente criado/reativado: {email} (origem: {origem})")
        return cliente
    
    @classmethod
    def desativar(cls, email: str) -> bool:
        """Desativa cliente e remove do Jellyfin."""
        clientes = cls.listar()
        for c in clientes:
            if c.get("email") == email:
                jf_id = c.get("jellyfin_id")
                if jf_id:
                    JellyfinService.delete_user(jf_id)
                c["ativo"] = False
                c["desativado_em"] = datetime.utcnow().isoformat() + "Z"
                cls.salvar(clientes)
                log_info("cliente", f"Cliente desativado: {email}")
                return True
        return False
    
    @classmethod
    def verificar_expirados(cls):
        """Job que roda periodicamente para expirar clientes."""
        agora = datetime.utcnow().isoformat()
        clientes = cls.listar()
        expirados = 0
        
        for c in clientes:
            if c.get("ativo") and c.get("expira_em", "") < agora:
                jf_id = c.get("jellyfin_id")
                if jf_id:
                    JellyfinService.delete_user(jf_id)
                c["ativo"] = False
                c["expirado_em"] = agora
                expirados += 1
                log_info("cliente", f"Cliente expirado: {c.get('email')}")
        
        if expirados > 0:
            cls.salvar(clientes)
            log_info("expiry_job", f"{expirados} clientes expirados")

class GiftCardModel:
    """Operações com gift cards."""
    
    @classmethod
    def listar(cls) -> List[Dict]:
        data = load_json(PATHS["giftcards"], {"cards": []})
        return data.get("cards", [])
    
    @classmethod
    def salvar(cls, cards: List[Dict]) -> bool:
        return save_json(PATHS["giftcards"], {"cards": cards})
    
    @classmethod
    def buscar_por_codigo(cls, codigo: str) -> Optional[Dict]:
        cards = cls.listar()
        codigo_upper = codigo.upper().strip()
        for c in cards:
            if isinstance(c, dict) and c.get("code", "").upper().strip() == codigo_upper:
                return c
        return None
    
    @classmethod
    def gerar(cls, quantidade: int = 1, valor: float = None, lote_id: str = None) -> List[Dict]:
        """Gera novos gift cards."""
        if valor is None:
            valor = get_float_config("preco_giftcard", 29.90)
        
        cards = cls.listar()
        novos = []
        
        for _ in range(quantidade):
            codigo = f"GIFT-{secrets.token_hex(4).upper()}"
            card = {
                "id": secrets.token_hex(8),
                "code": codigo,
                "valor": valor,
                "status": "novo",
                "lote_id": lote_id,
                "criado_em": datetime.utcnow().isoformat() + "Z",
                "usado_em": None,
                "usado_por": None,
            }
            cards.append(card)
            novos.append(card)
        
        cls.salvar(cards)
        log_info("giftcard", f"{quantidade} gift cards gerados (lote: {lote_id})")
        return novos
    
    @classmethod
    def resgatar(cls, codigo: str, nome: str, email: str, telefone: str, senha: str) -> Dict:
        """Resgata gift card e cria cliente."""
        card = cls.buscar_por_codigo(codigo)
        
        if not card:
            raise HTTPException(404, "Gift Card não encontrado")
        
        if card.get("status") != "novo":
            raise HTTPException(400, "Gift Card já foi utilizado ou está inválido")
        
        # Dias de validade do gift card
        dias = get_int_config("dias_giftcard", 30)
        
        # Cria cliente
        cliente = ClienteModel.criar(
            nome=nome,
            email=email,
            telefone=telefone,
            senha=senha,
            origem="giftcard",
            validade_dias=dias
        )
        
        # Marca como usado
        card["status"] = "usado"
        card["usado_em"] = datetime.utcnow().isoformat() + "Z"
        card["usado_por"] = email
        
        # Salva
        cards = cls.listar()
        for i, c in enumerate(cards):
            if c.get("code") == codigo:
                cards[i] = card
                break
        cls.salvar(cards)
        
        log_info("giftcard", f"Gift Card resgatado: {codigo} por {email}")
        return {"cliente": cliente, "giftcard": card}

class RevendedorModel:
    """Operações com revendedores."""
    
    @classmethod
    def listar(cls) -> List[Dict]:
        return load_json(PATHS["revendedores"], [])
    
    @classmethod
    def salvar(cls, revs: List[Dict]) -> bool:
        return save_json(PATHS["revendedores"], revs)
    
    @classmethod
    def buscar_por_id(cls, rev_id: str) -> Optional[Dict]:
        revs = cls.listar()
        for r in revs:
            if r.get("id") == rev_id:
                return r
        return None
    
    @classmethod
    def criar(cls, nome: str, usuario: str, email: str = "") -> Dict:
        revs = cls.listar()
        
        # Verifica se usuário já existe
        for r in revs:
            if r.get("usuario") == usuario:
                raise HTTPException(409, "Usuário já existe")
        
        rev = {
            "id": secrets.token_hex(8),
            "nome": nome,
            "usuario": usuario,
            "email": email,
            "ativo": True,
            "criado_em": datetime.utcnow().isoformat() + "Z",
        }
        revs.append(rev)
        cls.salvar(revs)
        log_info("revendedor", f"Revendedor criado: {usuario}")
        return rev
    
    @classmethod
    def deletar(cls, rev_id: str) -> bool:
        revs = cls.listar()
        novo = [r for r in revs if r.get("id") != rev_id]
        if len(novo) == len(revs):
            return False
        cls.salvar(novo)
        log_info("revendedor", f"Revendedor removido: {rev_id}")
        return True

class LoteModel:
    """Lotes de gift cards para revendedores."""
    
    @classmethod
    def listar(cls) -> List[Dict]:
        return load_json(PATHS["lotes"], [])
    
    @classmethod
    def salvar(cls, lotes: List[Dict]) -> bool:
        return save_json(PATHS["lotes"], lotes)
    
    @classmethod
    def buscar_por_id(cls, lote_id: str) -> Optional[Dict]:
        lotes = cls.listar()
        for l in lotes:
            if l.get("id") == lote_id:
                return l
        return None
    
    @classmethod
    def criar(cls, revendedor_id: str, quantidade: int, valor: float) -> Dict:
        """Cria lote para revendedor."""
        rev = RevendedorModel.buscar_por_id(revendedor_id)
        if not rev:
            raise HTTPException(404, "Revendedor não encontrado")
        
        lote_id = secrets.token_hex(8)
        lote = {
            "id": lote_id,
            "revendedor_id": revendedor_id,
            "revendedor_nome": rev.get("nome"),
            "revendedor_email": rev.get("email"),
            "quantidade": quantidade,
            "valor": valor,
            "status": "pendente",
            "giftcards": [],
            "pagamento_url": None,
            "external_ref": f"LOTE-{lote_id}",
            "criado_em": datetime.utcnow().isoformat() + "Z",
        }
        
        lotes = cls.listar()
        lotes.append(lote)
        cls.salvar(lotes)
        
        log_info("lote", f"Lote criado: {lote_id} para {rev.get('nome')}")
        return lote
    
    @classmethod
    def gerar_pagamento(cls, lote_id: str) -> Dict:
        """Gera preferência MP para o lote."""
        lote = cls.buscar_por_id(lote_id)
        if not lote:
            raise HTTPException(404, "Lote não encontrado")
        
        # Cria pagamento no MP
        pref = MercadoPagoService.create_preference(
            title=f"Lote Gift Cards ({lote['quantidade']}x)",
            price=lote["valor"],
            quantity=1,
            payer_email=lote.get("revendedor_email", "admin@local"),
            external_ref=lote["external_ref"]
        )
        
        lote["pagamento_url"] = pref["payment_url"]
        lote["preference_id"] = pref["preference_id"]
        
        # Salva
        lotes = cls.listar()
        for i, l in enumerate(lotes):
            if l.get("id") == lote_id:
                lotes[i] = lote
                break
        cls.salvar(lotes)
        
        # Envia email com link
        if lote.get("revendedor_email"):
            EmailService.send(
                lote["revendedor_email"],
                "Link de Pagamento - Gift Cards",
                f"<p>Olá {lote['revendedor_nome']},</p><p>Seu link de pagamento: <a href='{pref['payment_url']}'>{pref['payment_url']}</a></p>"
            )
        
        return lote
    
    @classmethod
    def aprovar_pagamento(cls, external_ref: str) -> bool:
        """Aprova lote após pagamento (webhook)."""
        if not external_ref.startswith("LOTE-"):
            return False
        
        lote_id = external_ref.replace("LOTE-", "")
        lote = cls.buscar_por_id(lote_id)
        
        if not lote:
            return False
        
        if lote.get("status") == "aprovado":
            return True  # Já aprovado
        
        # Gera gift cards
        cards = GiftCardModel.gerar(
            quantidade=lote["quantidade"],
            valor=lote.get("valor", 29.90) / lote["quantidade"],
            lote_id=lote_id
        )
        
        lote["status"] = "aprovado"
        lote["giftcards"] = [c["code"] for c in cards]
        lote["aprovado_em"] = datetime.utcnow().isoformat() + "Z"
        
        # Salva
        lotes = cls.listar()
        for i, l in enumerate(lotes):
            if l.get("id") == lote_id:
                lotes[i] = lote
                break
        cls.salvar(lotes)
        
        # Envia email com códigos
        if lote.get("revendedor_email"):
            EmailService.send_giftcards(
                lote["revendedor_email"],
                lote["giftcards"],
                lote_id
            )
        
        log_info("lote", f"Lote aprovado: {lote_id}")
        return True

class PendenteModel:
    """Registros de pagamento pendentes (clientes novos)."""
    
    @classmethod
    def listar(cls) -> List[Dict]:
        return load_json(PATHS["pendentes"], [])
    
    @classmethod
    def salvar(cls, pendentes: List[Dict]) -> bool:
        return save_json(PATHS["pendentes"], pendentes)
    
    @classmethod
    def criar(cls, nome: str, email: str, telefone: str, senha: str, 
              tipo: str = "assinatura") -> Dict:
        """Cria registro pendente de ativação."""
        pendentes = cls.listar()
        
        # Remove pendente antigo do mesmo email
        pendentes = [p for p in pendentes if p.get("email") != email]
        
        ref = f"PEND-{secrets.token_hex(6)}"
        pendente = {
            "id": ref,
            "nome": nome,
            "email": email,
            "telefone": telefone,
            "senha": senha,
            "tipo": tipo,  # 'assinatura' ou 'trial'
            "status": "pendente",
            "criado_em": datetime.utcnow().isoformat() + "Z",
        }
        
        pendentes.append(pendente)
        cls.salvar(pendentes)
        return pendente
    
    @classmethod
    def buscar_por_ref(cls, ref: str) -> Optional[Dict]:
        pendentes = cls.listar()
        for p in pendentes:
            if p.get("id") == ref:
                return p
        return None
    
    @classmethod
    def ativar(cls, ref: str) -> Optional[Dict]:
        """Ativa cliente após pagamento."""
        pendente = cls.buscar_por_ref(ref)
        if not pendente:
            return None
        
        if pendente.get("status") == "ativado":
            return pendente  # Já ativado
        
        # Determina dias de validade
        if pendente.get("tipo") == "trial":
            dias = get_int_config("dias_trial", 7)
            origem = "trial"
        else:
            dias = get_int_config("dias_assinatura", 30)
            origem = "assinatura"
        
        # Cria cliente
        cliente = ClienteModel.criar(
            nome=pendente["nome"],
            email=pendente["email"],
            telefone=pendente.get("telefone", ""),
            senha=pendente["senha"],
            origem=origem,
            validade_dias=dias
        )
        
        # Marca como ativado
        pendente["status"] = "ativado"
        pendente["ativado_em"] = datetime.utcnow().isoformat() + "Z"
        
        pendentes = cls.listar()
        for i, p in enumerate(pendentes):
            if p.get("id") == ref:
                pendentes[i] = pendente
                break
        cls.salvar(pendentes)
        
        log_info("pendente", f"Ativado: {ref} -> {pendente['email']}")
        return cliente

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(title="Jellyfin Venda API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tokens de admin (memória)
admin_tokens: Dict[str, Dict] = {}

def require_admin(request: Request):
    """Verifica se requisição é de admin autenticado."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Não autenticado")
    token = auth.replace("Bearer ", "")
    if token not in admin_tokens:
        raise HTTPException(401, "Token inválido")
    return admin_tokens[token]

# ============================================================================
# ENDPOINTS PÚBLICOS
# ============================================================================

@app.get("/api/health")
def health_check():
    """Check de saúde da API."""
    return {
        "ok": True,
        "version": "2.0.0",
        "mp_configured": MercadoPagoService.is_configured(),
        "jf_configured": bool(JellyfinService.get_base_url()),
    }

@app.get("/api/config/public")
def get_public_config():
    """Configurações públicas (landing page)."""
    cfg = get_config()
    return {
        "landing_enabled": cfg.get("landing_enabled", "true") == "true",
        "landing_title": cfg.get("landing_title", "Jellyfin Premium"),
        "landing_subtitle": cfg.get("landing_subtitle", ""),
        "preco_mensal": get_float_config("preco_mensal", 29.90),
        "preco_trial": get_float_config("preco_trial", 1.00),
    }

@app.post("/api/registro")
def registrar_cliente(payload: Dict[str, Any]):
    """Registro de novo cliente (cria pendente + pagamento)."""
    nome = str(payload.get("nome", "")).strip()
    email = str(payload.get("email", "")).strip()
    telefone = str(payload.get("telefone", "")).strip()
    senha = str(payload.get("senha", "")).strip()
    tipo = payload.get("tipo", "assinatura")  # 'assinatura' ou 'trial'
    
    if not nome or not email or not senha:
        raise HTTPException(400, "Nome, email e senha são obrigatórios")
    
    # Verifica se já existe ativo
    existente = ClienteModel.buscar_por_email(email)
    if existente and existente.get("ativo"):
        raise HTTPException(409, "Email já cadastrado e ativo")
    
    # Cria pendente
    pendente = PendenteModel.criar(nome, email, telefone, senha, tipo)
    
    # Cria pagamento MP
    if tipo == "trial":
        preco = get_float_config("preco_trial", 1.00)
        titulo = "Teste 7 Dias - Jellyfin Premium"
    else:
        preco = get_float_config("preco_mensal", 29.90)
        titulo = "Assinatura Mensal - Jellyfin Premium"
    
    try:
        pref = MercadoPagoService.create_preference(
            title=titulo,
            price=preco,
            quantity=1,
            payer_email=email,
            external_ref=pendente["id"]
        )
        return {
            "payment_url": pref["payment_url"],
            "reference": pendente["id"],
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Erro ao criar preferência: {e}")
        raise HTTPException(502, "Erro ao criar pagamento")

@app.post("/api/registro/giftcard")
def resgatar_giftcard(payload: Dict[str, Any]):
    """Resgate de gift card."""
    codigo = str(payload.get("codigo", "")).strip()
    nome = str(payload.get("nome", "")).strip()
    email = str(payload.get("email", "")).strip()
    telefone = str(payload.get("telefone", "")).strip()
    senha = str(payload.get("senha", "")).strip()
    
    if not codigo or not nome or not email or not senha:
        raise HTTPException(400, "Todos os campos são obrigatórios")
    
    resultado = GiftCardModel.resgatar(codigo, nome, email, telefone, senha)
    return resultado

# ============================================================================
# WEBHOOKS MERCADO PAGO
# ============================================================================

@app.post("/api/mp/webhook")
@app.post("/api/mercadopago/webhook")
def webhook_mercadopago(notification: Dict[str, Any]):
    """Recebe notificações de pagamento do Mercado Pago."""
    try:
        # Extrai payment_id
        payment_id = None
        if isinstance(notification.get("data"), dict):
            payment_id = notification["data"].get("id")
        elif notification.get("id"):
            payment_id = notification["id"]
        
        if not payment_id:
            return {"ok": True, "ignored": True}
        
        # Busca pagamento no MP
        payment = MercadoPagoService.get_payment(str(payment_id))
        if not payment:
            return {"ok": False, "error": "Pagamento não encontrado"}
        
        status = payment.get("status")
        external_ref = payment.get("external_reference", "")
        
        if status != "approved":
            return {"ok": True, "status": status, "activated": False}
        
        # Processa ativação
        activated = False
        
        # 1. Pendente de cliente novo
        if external_ref.startswith("PEND-"):
            cliente = PendenteModel.ativar(external_ref)
            activated = bool(cliente)
        
        # 2. Lote de revendedor
        elif external_ref.startswith("LOTE-"):
            activated = LoteModel.aprovar_pagamento(external_ref)
        
        return {
            "ok": True,
            "status": status,
            "external_ref": external_ref,
            "activated": activated,
        }
        
    except Exception as e:
        log_error(f"Erro no webhook: {e}")
        return {"ok": False, "error": str(e)}

# ============================================================================
# ENDPOINTS ADMIN
# ============================================================================

@app.post("/api/admin/login")
def admin_login(payload: Dict[str, Any]):
    """Login no painel admin."""
    usuario = payload.get("usuario", "")
    senha = payload.get("senha", "")
    
    if usuario == ADMIN_USER and senha == ADMIN_PASS:
        token = secrets.token_urlsafe(32)
        admin_tokens[token] = {"usuario": usuario, "tipo": "supremo"}
        return {"token": token, "tipo": "supremo"}
    
    raise HTTPException(401, "Credenciais inválidas")

@app.get("/api/admin/dashboard")
def admin_dashboard(request: Request):
    """Dados para dashboard."""
    require_admin(request)
    
    clientes = ClienteModel.listar()
    giftcards = GiftCardModel.listar()
    
    ativos = len([c for c in clientes if c.get("ativo")])
    total_gc = len(giftcards)
    usados_gc = len([g for g in giftcards if g.get("status") == "usado"])
    
    return {
        "clientes_total": len(clientes),
        "clientes_ativos": ativos,
        "giftcards_total": total_gc,
        "giftcards_usados": usados_gc,
    }

@app.get("/api/admin/clientes")
def admin_listar_clientes(request: Request):
    """Lista todos os clientes."""
    require_admin(request)
    return ClienteModel.listar()

@app.post("/api/admin/clientes")
def admin_criar_cliente(request: Request, payload: Dict[str, Any]):
    """Cria cliente manualmente."""
    require_admin(request)
    
    cliente = ClienteModel.criar(
        nome=payload.get("nome", ""),
        email=payload.get("email", ""),
        telefone=payload.get("telefone", ""),
        senha=payload.get("senha", ""),
        origem="manual"
    )
    return cliente

@app.delete("/api/admin/clientes/{email}")
def admin_deletar_cliente(email: str, request: Request):
    """Desativa cliente."""
    require_admin(request)
    ok = ClienteModel.desativar(email)
    return {"ok": ok}

@app.get("/api/admin/giftcards")
def admin_listar_giftcards(request: Request):
    """Lista gift cards."""
    require_admin(request)
    return GiftCardModel.listar()

@app.post("/api/admin/giftcards/gerar")
def admin_gerar_giftcards(request: Request, payload: Dict[str, Any]):
    """Gera novos gift cards."""
    require_admin(request)
    
    quantidade = int(payload.get("quantidade", 1))
    valor = payload.get("valor")
    
    cards = GiftCardModel.gerar(
        quantidade=quantidade,
        valor=float(valor) if valor else None
    )
    return {"gerados": len(cards), "cards": cards}

@app.get("/api/admin/revendedores")
def admin_listar_revendedores(request: Request):
    """Lista revendedores."""
    require_admin(request)
    return RevendedorModel.listar()

@app.post("/api/admin/revendedores")
def admin_criar_revendedor(request: Request, payload: Dict[str, Any]):
    """Cria revendedor."""
    require_admin(request)
    
    rev = RevendedorModel.criar(
        nome=payload.get("nome", ""),
        usuario=payload.get("usuario", ""),
        email=payload.get("email", "")
    )
    return rev

@app.delete("/api/admin/revendedores/{rev_id}")
def admin_deletar_revendedor(rev_id: str, request: Request):
    """Remove revendedor."""
    require_admin(request)
    ok = RevendedorModel.deletar(rev_id)
    return {"ok": ok}

@app.get("/api/admin/lotes")
def admin_listar_lotes(request: Request):
    """Lista lotes."""
    require_admin(request)
    return LoteModel.listar()

@app.post("/api/admin/lotes")
def admin_criar_lote(request: Request, payload: Dict[str, Any]):
    """Cria lote para revendedor."""
    require_admin(request)
    
    lote = LoteModel.criar(
        revendedor_id=payload.get("revendedor_id", ""),
        quantidade=int(payload.get("quantidade", 1)),
        valor=float(payload.get("valor", 100.0))
    )
    return lote

@app.post("/api/admin/lotes/{lote_id}/pagamento")
def admin_gerar_pagamento_lote(lote_id: str, request: Request):
    """Gera link de pagamento para lote."""
    require_admin(request)
    lote = LoteModel.gerar_pagamento(lote_id)
    return lote

@app.get("/api/admin/config")
def admin_get_config(request: Request):
    """Retorna configurações completas."""
    require_admin(request)
    return get_config()

@app.post("/api/admin/config")
def admin_save_config(request: Request, payload: Dict[str, Any]):
    """Salva configurações."""
    require_admin(request)
    ok = save_config(payload)
    return {"ok": ok}

@app.post("/api/admin/config/test-email")
def admin_test_email(request: Request, payload: Dict[str, Any]):
    """Testa configuração SMTP."""
    require_admin(request)
    
    to = payload.get("email", "")
    if not to:
        raise HTTPException(400, "Email é obrigatório")
    
    ok = EmailService.send(to, "Teste SMTP", "<p>Se você recebeu, o SMTP está configurado!</p>")
    return {"ok": ok}

@app.get("/api/admin/logs")
def admin_get_logs(request: Request):
    """Retorna logs do sistema."""
    require_admin(request)
    return load_json(PATHS["logs"], [])

# ============================================================================
# JOB DE EXPIRAÇÃO
# ============================================================================

def expiry_job():
    """Job que expira clientes."""
    try:
        ClienteModel.verificar_expirados()
    except Exception as e:
        log_error(f"Erro no job de expiração: {e}")

# Inicializa scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(expiry_job, "interval", minutes=5)  # A cada 5 minutos
scheduler.start()

# ============================================================================
# SERVIR FRONTEND ESTATICOS
# ============================================================================

# Verifica se existe build do frontend
_STATIC_DIR = os.path.join(BASE_DIR, "..", "frontend", "build")
_ADMIN_STATIC_DIR = os.path.join(BASE_DIR, "..", "admin", "build")

if os.path.exists(_STATIC_DIR):
    app.mount("/", StaticFiles(directory=_STATIC_DIR, html=True), name="frontend")
    
if os.path.exists(_ADMIN_STATIC_DIR):
    app.mount("/admin", StaticFiles(directory=_ADMIN_STATIC_DIR, html=True), name="admin")

# ============================================================================
# INICIALIZAÇÃO
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("="*50)
    print("Jellyfin Venda API 2.0")
    print(f"Data: {datetime.utcnow().isoformat()}")
    print(f"MP Configurado: {MercadoPagoService.is_configured()}")
    print(f"Data Dir: {DATA_DIR}")
    print(f"Frontend: {_STATIC_DIR if os.path.exists(_STATIC_DIR) else 'N/A'}")
    print(f"Admin: {_ADMIN_STATIC_DIR if os.path.exists(_ADMIN_STATIC_DIR) else 'N/A'}")
    print("="*50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
