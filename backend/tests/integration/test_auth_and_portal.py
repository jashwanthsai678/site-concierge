from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import auth, onboarding, portal
from app.models.business import Business
from app.models.knowledge import KnowledgeCategory, KnowledgeItem
from app.models.token_usage import TokenUsageLog
from app.utils.security import hash_password

EMAIL = "owner@auth-test.example"
PASSWORD = "correct-horse-battery-staple"


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(portal.router)
    app.include_router(onboarding.router)

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


async def _seed_business(db_session: AsyncSession, **overrides) -> Business:
    business = Business(
        slug=overrides.get("slug", "auth-test-biz"),
        email=overrides.get("email", EMAIL),
        hashed_password=hash_password(overrides.get("password", PASSWORD)),
        name="Auth Test Biz",
        industry="services",
        greeting_template="Hi!",
        persona_description="You are helpful.",
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.commit()
    return business


async def test_login_returns_a_token_for_correct_credentials(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["business"]["slug"] == "auth-test-biz"


async def test_login_rejects_wrong_password(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.post("/api/auth/login", json={"email": EMAIL, "password": "wrong-password"})
    assert response.status_code == 401


async def test_login_rejects_unknown_email(db_session: AsyncSession):
    client = _make_client(db_session)
    response = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})
    assert response.status_code == 401


async def _login(client: TestClient) -> str:
    response = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    return response.json()["token"]


async def test_portal_me_requires_auth(db_session: AsyncSession):
    client = _make_client(db_session)
    response = client.get("/api/portal/me")
    assert response.status_code == 401


async def test_portal_me_returns_the_logged_in_business(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)
    token = await _login(client)

    response = client.get("/api/portal/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["slug"] == "auth-test-biz"


async def test_portal_me_patch_updates_only_sent_fields(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)
    token = await _login(client)

    response = client.patch(
        "/api/portal/me", json={"persona_description": "Updated persona."},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Auth Test Biz"  # untouched


async def test_portal_knowledge_add_list_update_delete_round_trip(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)
    token = await _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    add_response = client.post(
        "/api/portal/knowledge", headers=headers,
        json={"items": [{"category": "faq", "question": "Q?", "content": "A."}]},
    )
    assert add_response.status_code == 201

    list_response = client.get("/api/portal/knowledge", headers=headers)
    items = list_response.json()
    assert len(items) == 1
    item_id = items[0]["id"]

    update_response = client.patch(
        f"/api/portal/knowledge/{item_id}", headers=headers, json={"content": "Updated answer."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["content"] == "Updated answer."

    delete_response = client.delete(f"/api/portal/knowledge/{item_id}", headers=headers)
    assert delete_response.status_code == 204

    final_list = client.get("/api/portal/knowledge", headers=headers).json()
    assert final_list == []


async def test_portal_knowledge_cannot_touch_another_businesss_item(db_session: AsyncSession):
    business_a = await _seed_business(db_session, slug="biz-a", email="a@example.com")
    await _seed_business(db_session, slug="biz-b", email="b@example.com", password="different-password")

    other_item = KnowledgeItem(
        business_id=business_a.id, category=KnowledgeCategory.FAQ, question="Q", content="A", display_order=0,
    )
    db_session.add(other_item)
    await db_session.flush()
    await db_session.commit()

    client = _make_client(db_session)
    login_b = client.post("/api/auth/login", json={"email": "b@example.com", "password": "different-password"})
    headers = {"Authorization": f"Bearer {login_b.json()['token']}"}

    response = client.delete(f"/api/portal/knowledge/{other_item.id}", headers=headers)
    assert response.status_code == 404


async def test_logout_invalidates_the_token(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)
    token = await _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/portal/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/portal/me", headers=headers).status_code == 401


async def test_usage_summary_sums_by_call_type_and_flags_estimates(db_session: AsyncSession):
    business = await _seed_business(db_session)
    db_session.add_all([
        TokenUsageLog(business_id=business.id, call_type="reply", total_tokens=100, is_estimated=True),
        TokenUsageLog(business_id=business.id, call_type="reply", total_tokens=50, is_estimated=True),
        TokenUsageLog(
            business_id=business.id, call_type="extraction",
            prompt_tokens=30, completion_tokens=20, total_tokens=50, is_estimated=False,
        ),
    ])
    await db_session.commit()

    client = _make_client(db_session)
    token = await _login(client)

    response = client.get("/api/portal/usage", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "total_tokens": 200,
        "reply_tokens": 150,
        "extraction_tokens": 50,
        "call_count": 3,
        "includes_estimates": True,
    }


async def test_usage_summary_is_scoped_to_the_logged_in_business_only(db_session: AsyncSession):
    business_a = await _seed_business(db_session, slug="usage-a", email="usage-a@example.com")
    business_b = await _seed_business(
        db_session, slug="usage-b", email="usage-b@example.com", password="different-password",
    )
    db_session.add_all([
        TokenUsageLog(business_id=business_a.id, call_type="reply", total_tokens=100),
        TokenUsageLog(business_id=business_b.id, call_type="reply", total_tokens=999),
    ])
    await db_session.commit()

    client = _make_client(db_session)
    login_a = client.post("/api/auth/login", json={"email": "usage-a@example.com", "password": PASSWORD})
    headers = {"Authorization": f"Bearer {login_a.json()['token']}"}

    response = client.get("/api/portal/usage", headers=headers)

    assert response.json()["total_tokens"] == 100  # business_b's 999 must not leak in
