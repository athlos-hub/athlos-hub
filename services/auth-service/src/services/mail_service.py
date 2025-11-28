import resend
import logging
from fastapi import HTTPException, status, BackgroundTasks
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
from ..config.settings import settings

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"

resend.api_key = settings.RESEND_API_KEY


class MailService:

    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html", "xml"])
    )

    @staticmethod
    def render_template(template_name: str, context: dict) -> str:
        try:
            template = MailService.env.get_template(template_name)
            return template.render(context)
        except Exception as e:
            logger.error(f"Erro ao renderizar template {template_name}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao renderizar template de e-mail"
            )

    @staticmethod
    def send_email(to: str, subject: str, template_name: str, context: dict):
        html = MailService.render_template(template_name, context)

        try:
            response = resend.Emails.send({
                "from": "AthlosHub <nao-responda@athloshub.com.br>",
                "to": to,
                "subject": subject,
                "html": html
            })

            if isinstance(response, dict) and "error" in response:
                logger.error(f"Erro Resend: {response['error']}")
                raise HTTPException(500, "Erro ao enviar e-mail (Resend)")

            return response

        except Exception as e:
            logger.error(f"Falha ao enviar e-mail: {e}")
            raise HTTPException(500, "Falha no envio de e-mail")

    @staticmethod
    def send_email_background(
        background: BackgroundTasks,
        to: str,
        subject: str,
        template_name: str,
        context: dict
    ):
        background.add_task(MailService.send_email, to, subject, template_name, context)