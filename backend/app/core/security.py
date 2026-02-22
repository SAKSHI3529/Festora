from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    # Check if passwords match
    # hashed_password from DB is str, needs to be bytes
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
        
    return bcrypt.checkpw(plain_password, hashed_password)

def get_password_hash(password):
    # Hash a password
    if isinstance(password, str):
        password = password.encode('utf-8')
    # gensalt() generates a salt and hashpw() returns the hash
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())
    # Return as string for storage
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt
