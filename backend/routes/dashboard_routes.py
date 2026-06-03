from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/", response_model=schemas.UserResponse)
def dashboard(current_user: models.User = Depends(get_current_user)):
    if not current_user.onboarding_completed:
        raise HTTPException(status_code=403, detail="Complete onboarding first")
    return current_user
