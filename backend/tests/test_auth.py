from app.core.security import get_password_hash, verify_password, encrypt_token, decrypt_token
from app.models.all import User


def test_password_hashing():
    pwd = "MySuperSecretPassword123!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed)
    assert not verify_password("wrong_pwd", hashed)


def test_token_encryption():
    token = "ya29.a0AfB_byC2-long-google-oauth-access-token"
    encrypted = encrypt_token(token)
    assert encrypted != token
    
    decrypted = decrypt_token(encrypted)
    assert decrypted == token


def test_login_flow(client):
    # Test logging in with the default seeded CEO account
    payload = {
        "email": "ceo@socialhub.corp",
        "password": "AdminPassword123!"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "ceo@socialhub.corp"
    
    # Test login with bad password
    bad_payload = {
        "email": "ceo@socialhub.corp",
        "password": "WrongPassword!"
    }
    bad_response = client.post("/api/v1/auth/login", json=bad_payload)
    assert bad_response.status_code == 400
    assert bad_response.json()["detail"] == "Incorrect email or password"


def test_create_user_admin(client):
    # Login as CEO to get token
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "ceo@socialhub.corp",
        "password": "AdminPassword123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Invite a new Marketing Manager
    payload = {
        "email": "manager@socialhub.corp",
        "full_name": "Marketing Manager",
        "password": "ManagerPass123!",
        "roles": ["Marketing Manager"],
        "is_active": True
    }
    
    response = client.post("/api/v1/users/", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "manager@socialhub.corp"
    
    # Now verify the user is in the database and has the roles
    login_manager_resp = client.post("/api/v1/auth/login", json={
        "email": "manager@socialhub.corp",
        "password": "ManagerPass123!"
    })
    assert login_manager_resp.status_code == 200
    assert "Marketing Manager" in [r["name"] for r in login_manager_resp.json()["user"]["roles"]]
