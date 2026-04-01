from typing import Optional

import boto3
from fastapi import UploadFile
from auth_service.utils.s3_upload import upload_file

from auth_service.core.exceptions.user import AvatarUploadError


def upload_image(
    file: UploadFile,
    aws_access_key_id: str,
    aws_secret_access_key: str,
    aws_region: str,
    aws_bucket: str,
    prefix: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    team_id: Optional[str] = None,
) -> dict[str, str]:
    """Faz upload de imagem para o S3."""

    id_count = sum(1 for x in (user_id, organization_id, team_id) if x)
    if id_count > 1:
        raise AvatarUploadError(
            "Informe apenas um identificador: user_id, organization_id ou team_id"
        )

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

    s3 = boto3.client(
        "s3",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region,
    )

    parts = [prefix]

    if user_id:
        parts.append(user_id)

    if organization_id:
        parts.append(organization_id)

    if team_id:
        parts.append(team_id)

    prefix = "/".join(parts) + "/"

    try:
        response = s3.list_objects_v2(Bucket=aws_bucket, Prefix=prefix)
        if "Contents" in response:
            for obj in response["Contents"]:
                s3.delete_object(Bucket=aws_bucket, Key=obj["Key"])
    except Exception as e:
        raise AvatarUploadError("Erro ao limpar imagens antigas") from e

    result = upload_file(
        file,
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        aws_region=aws_region,
        aws_bucket=aws_bucket,
        prefix=prefix,
    )

    return result
