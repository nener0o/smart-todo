from datetime import datetime, timedelta


def test_tasks_require_auth(client):
    assert client.get("/api/tasks").status_code == 401


def test_create_task_extracts_date_from_text(auth_client):
    resp = auth_client.post("/api/tasks", json={"text": "завтра сходить к врачу", "category": "Здоровье"})
    assert resp.status_code == 201
    task = resp.json()
    assert task["title"] == "сходить к врачу"
    assert task["raw_text"] == "завтра сходить к врачу"
    assert task["category"] == "Здоровье"
    assert task["priority"] == "medium"
    expected = (datetime.now() + timedelta(days=1)).date().isoformat()
    assert task["due_at"].startswith(expected)


def test_explicit_due_overrides_parsed(auth_client):
    resp = auth_client.post("/api/tasks", json={"text": "завтра купить билеты", "due_at": "2030-01-01T10:00:00"})
    assert resp.json()["due_at"] == "2030-01-01T10:00:00"


def test_parse_preview(auth_client):
    resp = auth_client.post("/api/tasks/parse", json={"text": "сдать отчёт в пятницу в 15:00"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "сдать отчёт"
    assert body["due_at"].endswith("T15:00:00")
    assert "в пятницу" in body["matched"]


def test_update_toggle_delete(auth_client):
    task_id = auth_client.post("/api/tasks", json={"text": "купить молоко"}).json()["id"]

    upd = auth_client.patch(f"/api/tasks/{task_id}", json={"title": "купить кефир", "priority": "high"})
    assert upd.status_code == 200
    assert upd.json()["title"] == "купить кефир"
    assert upd.json()["priority"] == "high"

    toggled = auth_client.post(f"/api/tasks/{task_id}/toggle")
    assert toggled.json()["is_done"] is True

    assert auth_client.delete(f"/api/tasks/{task_id}").status_code == 204
    assert auth_client.get(f"/api/tasks/{task_id}").status_code == 404


def test_scopes_and_stats(auth_client):
    now = datetime.now().replace(microsecond=0)
    auth_client.post("/api/tasks", json={"text": "просроченная", "due_at": (now - timedelta(days=1)).isoformat()})
    auth_client.post("/api/tasks", json={"text": "сегодняшняя", "due_at": (now + timedelta(minutes=1)).isoformat()})
    auth_client.post("/api/tasks", json={"text": "будущая", "due_at": (now + timedelta(days=3)).isoformat()})
    auth_client.post("/api/tasks", json={"text": "без даты"})

    assert [t["title"] for t in auth_client.get("/api/tasks", params={"scope": "overdue"}).json()] == ["просроченная"]
    assert [t["title"] for t in auth_client.get("/api/tasks", params={"scope": "no_date"}).json()] == ["без даты"]
    assert len(auth_client.get("/api/tasks", params={"scope": "upcoming"}).json()) >= 1

    stats = auth_client.get("/api/tasks/stats").json()
    assert stats["total"] == 4
    assert stats["overdue"] == 1
    assert stats["done"] == 0


def test_categories_and_filters(auth_client):
    auth_client.post("/api/tasks", json={"text": "лекция", "category": "Учёба", "priority": "high"})
    auth_client.post("/api/tasks", json={"text": "пробежка", "category": "Спорт"})
    assert auth_client.get("/api/tasks/categories").json() == ["Спорт", "Учёба"]
    high = auth_client.get("/api/tasks", params={"priority": "high"}).json()
    assert [t["title"] for t in high] == ["лекция"]
    found = auth_client.get("/api/tasks", params={"search": "проб"}).json()
    assert [t["title"] for t in found] == ["пробежка"]


def test_user_cannot_see_others_tasks(client, auth_client):
    task_id = auth_client.post("/api/tasks", json={"text": "секрет"}).json()["id"]
    other = client.post("/api/auth/register", json={"email": "other@b.ru", "name": "Другой", "password": "123456"})
    headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    assert client.get(f"/api/tasks/{task_id}", headers=headers).status_code == 404
    assert client.get("/api/tasks", headers=headers).json() == []
