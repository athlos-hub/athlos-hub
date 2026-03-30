import logging
from pathlib import Path

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import BackgroundTasks, HTTPException, status
from jinja2 import Environment, FileSystemLoader, select_autoescape

from auth_service.core.config import settings

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"


class MailService:

    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html", "xml"]),
    )

    @staticmethod
    def render_template(template_name: str, context: dict) -> str:
        try:
            template = MailService.env.get_template(template_name)
            return template.render(context)
        except Exception as e:
            logger.error(f"Erro ao renderizar template {template_name}: {e}")
            return None

    @staticmethod
    def send_email(to: str, subject: str, template_name: str, context: dict):
        html = MailService.render_template(template_name, context)

        if not html:
            return False

        msg = MIMEMultipart()
        msg['From'] = settings.EMAIL_FROM
        msg['To'] = to
        msg['Subject'] = subject
        msg.attach(MIMEText(html, 'html'))

        try:
            with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT) as server:
                server.starttls()
                server.login(settings.EMAIL_FROM, settings.EMAIL_PASSWORD)
                server.sendmail(msg['From'], to, msg.as_string())

            return True

        except Exception as e:
            logger.error(f"Falha ao enviar e-mail para {to}: {e}")
            return False

    @staticmethod
    def send_email_background(
        background: BackgroundTasks,
        to: str,
        subject: str,
        template_name: str,
        context: dict,
    ):
        background.add_task(MailService.send_email, to, subject, template_name, context)