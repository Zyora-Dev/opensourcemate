from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

@router.post("/", response_model=schemas.UserResponse)
def complete_onboarding(
    body: schemas.OnboardingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.onboarding_completed:
        raise HTTPException(status_code=400, detail="Onboarding already completed")

    current_user.name = body.name
    current_user.mobile = body.mobile
    current_user.user_type = body.user_type
    current_user.website = body.website
    current_user.linkedin = body.linkedin
    current_user.onboarding_completed = True

    db.commit()
    db.refresh(current_user)
    return current_user
