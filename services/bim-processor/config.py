"""Configuration management for BIM Processing Service"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }
    
    # Service configuration
    service_name: str = "BIM Processing Service"
    version: str = "1.0.0"
    port: int = 5000
    
    # API Gateway
    api_gateway_url: str = "http://localhost:4000"
    
    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:4000"
    
    # Authentication
    jwt_secret: str = "your-secret-key-here"
    
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/constructai"
    
    # File processing
    max_file_size_mb: int = 1024  # 1GB
    upload_dir: str = "/tmp/bim-uploads"
    
    # Processing
    max_concurrent_jobs: int = 5
    job_timeout_seconds: int = 3600  # 1 hour
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse allowed origins into a list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()
