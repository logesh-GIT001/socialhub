from sqlalchemy.orm import Session
from app.models.all import Notification, User


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",  # info, warning, success, error
) -> Notification:
    """Creates an in-app notification for a user and returns it."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notify_role_members(
    db: Session,
    role_name: str,
    title: str,
    message: str,
    notification_type: str = "info",
) -> None:
    """Sends notifications to all users who belong to a specific role (e.g. CEO, Reviewer)."""
    users = db.query(User).filter(User.roles.any(name=role_name)).all()
    for user in users:
        create_notification(db, user.id, title, message, notification_type)
