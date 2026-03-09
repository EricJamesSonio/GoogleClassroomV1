from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str
    MONGO_DB_NAME: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080

    AGORA_APP_ID: str = ""
    AGORA_APP_CERT: str = ""

    # Agora Cloud Recording — from Agora console → RESTful API
    AGORA_CUSTOMER_KEY: str = ""
    AGORA_CUSTOMER_SECRET: str = ""

    # Cloud storage for recordings (e.g. AWS S3)
    AGORA_STORAGE_VENDOR: int = 1       # 1=S3, 2=Google Cloud, 5=Alibaba
    AGORA_STORAGE_REGION: int = 0
    AGORA_STORAGE_BUCKET: str = ""
    AGORA_STORAGE_ACCESS_KEY: str = ""
    AGORA_STORAGE_SECRET_KEY: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    class Config:
        env_file = ".env"


settings = Settings()