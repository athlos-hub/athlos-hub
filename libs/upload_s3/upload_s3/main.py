import boto3
from uuid import uuid4
from fastapi import UploadFile

def upload_file(
    file: UploadFile,
    aws_access_key_id: str,
    aws_secret_access_key: str,
    aws_region: str,
    aws_bucket: str,
    prefix: str
):

    file_key = f"{prefix}{uuid4()}_{file.filename}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region
    )

    s3.upload_fileobj(
        file.file,
        aws_bucket,
        file_key,
        ExtraArgs={"ContentType": file.content_type}
    )

    url = f"https://{aws_bucket}.s3.{aws_region}.amazonaws.com/{file_key}"

    return {
        "key": file_key,
        "url": url
    }

