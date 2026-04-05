"""Upload de imagem para anexos em posts sociais (S3, sem apagar histórico no prefixo)."""

from fastapi import UploadFile

from auth_service.core.exceptions.user import AvatarUploadError
from auth_service.utils.s3_upload import upload_file


def upload_social_post_image(
    file: UploadFile,
    *,
    keycloak_id: str,
    aws_access_key_id: str,
    aws_secret_access_key: str,
    aws_region: str,
    aws_bucket: str,
) -> dict[str, str]:
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/jpg",
    }
    if file.content_type not in allowed_types:
        raise AvatarUploadError("Tipo de arquivo não permitido. Use apenas imagens")

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > 5 * 1024 * 1024:
        raise AvatarUploadError("Arquivo muito grande. Máximo: 5MB")

    prefix = f"social-posts/{keycloak_id}/"
    return upload_file(
        file,
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        aws_region=aws_region,
        aws_bucket=aws_bucket,
        prefix=prefix,
    )
