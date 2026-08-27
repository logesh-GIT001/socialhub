from sqlalchemy.orm import Session
from app.models.all import User, Role, Permission
from app.core.security import get_password_hash

# List of all required permissions in the system
PERMISSIONS_LIST = [
    {"name": "users:manage", "description": "Invite, disable, delete users"},
    {"name": "roles:manage", "description": "Assign roles and modify permissions"},
    {"name": "social_accounts:connect", "description": "Connect and disconnect official social profiles"},
    {"name": "social_accounts:view", "description": "View connection statuses of accounts"},
    {"name": "posts:create", "description": "Create new drafts or posts"},
    {"name": "posts:edit", "description": "Edit existing drafts or posts"},
    {"name": "posts:delete", "description": "Delete drafts or posts"},
    {"name": "posts:approve", "description": "Approve or reject draft posts in workflow"},
    {"name": "posts:bypass_approval", "description": "Directly approve own posts and bypass validation reviews"},
    {"name": "posts:publish", "description": "Trigger instant post publication"},
    {"name": "posts:view", "description": "View drafts, scheduled, and published posts"},
    {"name": "media:upload", "description": "Upload files, images, and videos to the media library"},
    {"name": "media:view", "description": "View and search media library assets"},
    {"name": "analytics:view", "description": "View performance dashboard and charts"},
    {"name": "audit:view", "description": "View security audit logs"},
    {"name": "settings:manage", "description": "Configure global system settings"},
]

# Roles mapping to lists of permissions they hold
ROLE_PERMISSIONS_MAP = {
    "CEO": [
        "users:manage",
        "social_accounts:connect",
        "social_accounts:view",
        "posts:create",
        "posts:edit",
        "posts:delete",
        "posts:approve",
        "posts:bypass_approval",
        "posts:publish",
        "posts:view",
        "media:upload",
        "media:view",
        "analytics:view",
        "audit:view",
        "settings:manage",
    ],
    "Administrator": [
        "users:manage",
        "roles:manage",
        "social_accounts:view",
        "posts:view",
        "media:view",
        "analytics:view",
        "audit:view",
        "settings:manage",
        "posts:bypass_approval",
    ],
    "Marketing Manager": [
        "social_accounts:view",
        "posts:create",
        "posts:edit",
        "posts:delete",
        "posts:approve",
        "posts:bypass_approval",
        "posts:publish",
        "posts:view",
        "media:upload",
        "media:view",
        "analytics:view",
    ],
    "Marketing Executive": [
        "social_accounts:view",
        "posts:create",
        "posts:edit",
        "posts:view",
        "media:upload",
        "media:view",
    ],
    "HR": [
        "social_accounts:view",
        "posts:create",
        "posts:edit",
        "posts:bypass_approval",
        "posts:publish",
        "posts:view",
        "media:upload",
        "media:view",
        "analytics:view",
    ],
    "Designer": [
        "posts:view",
        "media:upload",
        "media:view",
    ],
    "Reviewer": [
        "social_accounts:view",
        "posts:approve",
        "posts:view",
        "media:view",
    ],
}


def seed_database(db: Session) -> None:
    """Populates permissions, roles, maps them, and creates a default CEO account."""
    # 1. Create Permissions
    permission_instances = {}
    for p_data in PERMISSIONS_LIST:
        existing = db.query(Permission).filter(Permission.name == p_data["name"]).first()
        if not existing:
            perm = Permission(name=p_data["name"], description=p_data["description"])
            db.add(perm)
            db.flush()
            permission_instances[p_data["name"]] = perm
        else:
            permission_instances[p_data["name"]] = existing

    # 2. Create Roles and associate Permissions
    role_instances = {}
    for role_name, perm_names in ROLE_PERMISSIONS_MAP.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=f"Default system {role_name} role")
            db.add(role)
            db.flush()
        
        # Clear existing to overwrite/align permissions
        role.permissions = []
        for p_name in perm_names:
            if p_name in permission_instances:
                role.permissions.append(permission_instances[p_name])
        db.flush()
        role_instances[role_name] = role

    # 3. Create Default CEO/Admin User
    ceo_email = "ceo@socialhub.corp"
    existing_ceo = db.query(User).filter(User.email == ceo_email).first()
    if not existing_ceo:
        default_ceo = User(
            email=ceo_email,
            full_name="Chief Executive Officer",
            hashed_password=get_password_hash("AdminPassword123!"),
            is_active=True,
        )
        db.add(default_ceo)
        db.flush()
        # Assign CEO and Administrator role to default user
        default_ceo.roles.append(role_instances["CEO"])
        default_ceo.roles.append(role_instances["Administrator"])
        db.flush()

    db.commit()
