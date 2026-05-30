from sqlalchemy.orm import Session

from app.models.entities import AuditEvent


def audit(db: Session, action: str, resource: str, detail: str = "", owner_id: int | None = None) -> AuditEvent:
    event = AuditEvent(owner_id=owner_id, action=action, resource=resource, detail=detail)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

