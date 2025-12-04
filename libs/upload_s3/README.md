# Implementação do UPLOAD no S3

## Passo 01
Definir a lib nas dependencias do pyproject.toml do serviço:
    `upload_s3 = {path = "../../libs/upload_s3"}`

## Passo 2
Atualize as dependencias e instale-as

## Passo 3
Definir as variaveis de ambiente referentes ao bucket nos settings.py do serviço, as mesmas podem ser identificadas no .env

## Passo 4
Implemente o enpoint. Ex:
```
    from upload_s3.main import upload_file
    from fastapi import UploadFile

    @app.post("/upload")
    async def upload(file: UploadFile):
        
        result = upload_file(
            file,
            aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
            aws_region=settings.AWS_BUCKET_REGION,
            aws_bucket=settings.AWS_BUCKET_NAME
        )

        return result
```

O endpoint retorna a url de acesso do arquivo no Bucket