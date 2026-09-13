def test_register_returns_token_and_user(client):
    resp = client.post("/api/auth/register", json={"email": "a@b.ru", "name": "Аня", "password": "123456"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["access_token"]
    assert body["user"]["email"] == "a@b.ru"
    assert body["user"]["name"] == "Аня"


def test_register_duplicate_email_is_rejected(client):
    payload = {"email": "dup@b.ru", "name": "Дубль", "password": "123456"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


def test_register_validates_short_password(client):
    resp = client.post("/api/auth/register", json={"email": "a@b.ru", "name": "Аня", "password": "123"})
    assert resp.status_code == 422


def test_login_success_and_wrong_password(client):
    client.post("/api/auth/register", json={"email": "a@b.ru", "name": "Аня", "password": "123456"})
    ok = client.post("/api/auth/login", json={"email": "A@B.RU", "password": "123456"})
    assert ok.status_code == 200
    bad = client.post("/api/auth/login", json={"email": "a@b.ru", "password": "wrong"})
    assert bad.status_code == 401


def test_me_requires_token(client, auth_client):
    assert auth_client.get("/api/auth/me").json()["email"] == "student@example.com"
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer broken"})
    assert resp.status_code == 401
