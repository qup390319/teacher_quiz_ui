"""
Scenario 1 — Backend API concurrent stress test.

Models two user populations:
- TeacherUser (aaa001): list classes, view quizzes, view stats
- StudentUser (115001..115222): login, fetch assignments, submit answers

Excludes /api/llm/* and /api/ai/* (see llm_proxy.py for those).

Usage:
    uv run locust -f load-tests/backend_api.py \\
        --host http://localhost:8000 \\
        --users 200 --spawn-rate 20 --run-time 3m --headless
"""
import random

from locust import HttpUser, between, events, task

# ── Seed accounts (matches backend/app/seed/seed.py) ────────────────────────
TEACHER_ACCOUNT = "aaa001"

# Class A: 115001-115020, Class B: 115101-115118, Class C: 115201-115222
STUDENT_ACCOUNTS: list[str] = (
    [f"115{i:03d}" for i in range(1, 21)]
    + [f"115{i:03d}" for i in range(101, 119)]
    + [f"115{i:03d}" for i in range(201, 223)]
)

# Stress-test seed quizzes (from backend/app/seed)
DEMO_QUIZ_IDS = ["quiz-001", "quiz-002"]


def _login(client, account: str, password: str | None = None) -> bool:
    """Login and persist session cookie on the client. Returns True on success."""
    password = password or account  # seeded password equals account
    with client.post(
        "/api/auth/login",
        json={"account": account, "password": password},
        catch_response=True,
        name="/api/auth/login",
    ) as resp:
        if resp.status_code == 200:
            return True
        resp.failure(f"login failed: {resp.status_code} {resp.text[:200]}")
        return False


class TeacherUser(HttpUser):
    """Simulates a teacher browsing the dashboard."""

    wait_time = between(1, 3)
    weight = 1  # ~1 teacher per 5 students

    def on_start(self) -> None:
        self.logged_in = _login(self.client, TEACHER_ACCOUNT)

    @task(3)
    def list_classes(self) -> None:
        if not self.logged_in:
            return
        self.client.get("/api/classes", name="/api/classes")

    @task(3)
    def list_quizzes(self) -> None:
        if not self.logged_in:
            return
        self.client.get("/api/quizzes", name="/api/quizzes")

    @task(2)
    def get_quiz_detail(self) -> None:
        if not self.logged_in:
            return
        quiz_id = random.choice(DEMO_QUIZ_IDS)
        self.client.get(f"/api/quizzes/{quiz_id}", name="/api/quizzes/[id]")

    @task(2)
    def list_assignments(self) -> None:
        if not self.logged_in:
            return
        self.client.get("/api/assignments", name="/api/assignments")

    @task(2)
    def quiz_stats(self) -> None:
        if not self.logged_in:
            return
        quiz_id = random.choice(DEMO_QUIZ_IDS)
        self.client.get(
            f"/api/quizzes/{quiz_id}/stats",
            name="/api/quizzes/[id]/stats",
        )

    @task(1)
    def diagnosis_logs(self) -> None:
        if not self.logged_in:
            return
        self.client.get(
            "/api/teachers/diagnosis-logs",
            name="/api/teachers/diagnosis-logs",
        )


class StudentUser(HttpUser):
    """Simulates a student taking a quiz.

    Students can only read /api/quizzes/{id} if their class has an Assignment
    for that quiz (see backend/app/routers/quizzes.py:99-110). So on_start we
    fetch /api/assignments, cache the assigned quiz_ids, and only request those.
    """

    wait_time = between(2, 5)
    weight = 5  # majority of traffic

    def on_start(self) -> None:
        self.account = random.choice(STUDENT_ACCOUNTS)
        self.logged_in = _login(self.client, self.account)
        self.assigned_quiz_ids: list[str] = []
        if self.logged_in:
            try:
                resp = self.client.get("/api/assignments", name="/api/assignments")
                if resp.status_code == 200:
                    self.assigned_quiz_ids = [
                        a["quizId"] for a in resp.json()
                        if a.get("quizId")
                    ]
            except (ValueError, KeyError):
                pass  # leave empty — view_quiz will skip

    @task(3)
    def fetch_me(self) -> None:
        if not self.logged_in:
            return
        self.client.get("/api/auth/me", name="/api/auth/me")

    @task(3)
    def list_my_assignments(self) -> None:
        if not self.logged_in:
            return
        self.client.get("/api/assignments", name="/api/assignments")

    @task(2)
    def view_quiz(self) -> None:
        if not self.logged_in or not self.assigned_quiz_ids:
            return  # student has no assigned quizzes — skip rather than 403
        quiz_id = random.choice(self.assigned_quiz_ids)
        self.client.get(f"/api/quizzes/{quiz_id}", name="/api/quizzes/[id]")

    @task(1)
    def view_history(self) -> None:
        if not self.logged_in:
            return
        self.client.get(
            f"/api/students/{self.account}/history",
            name="/api/students/[id]/history",
        )


class AnonymousUser(HttpUser):
    """Tests login endpoint cold (no session reuse)."""

    wait_time = between(3, 8)
    weight = 1

    @task
    def cold_login(self) -> None:
        account = random.choice(STUDENT_ACCOUNTS)
        self.client.post(
            "/api/auth/login",
            json={"account": account, "password": account},
            name="/api/auth/login (cold)",
        )


# ── Pass/fail criteria reported at end ──────────────────────────────────────
@events.quitting.add_listener
def _check_thresholds(environment, **_kw) -> None:
    """Fail the run if SLOs are breached. Picked up by CI exit code."""
    stats = environment.stats.total
    p95 = stats.get_response_time_percentile(0.95)
    error_rate = (stats.num_failures / stats.num_requests) if stats.num_requests else 0

    threshold_p95 = 500  # ms
    threshold_err = 0.01

    print("\n── SLO check ────────────────────────────────")
    print(f"  total requests : {stats.num_requests}")
    print(f"  p50            : {stats.get_response_time_percentile(0.5):.0f} ms")
    print(f"  p95            : {p95:.0f} ms   (threshold {threshold_p95} ms)")
    print(f"  p99            : {stats.get_response_time_percentile(0.99):.0f} ms")
    print(f"  error rate     : {error_rate * 100:.2f} %    (threshold {threshold_err * 100:.2f} %)")
    breached = []
    if p95 > threshold_p95:
        breached.append(f"p95 {p95:.0f}ms > {threshold_p95}ms")
    if error_rate > threshold_err:
        breached.append(f"errors {error_rate * 100:.2f}% > {threshold_err * 100:.2f}%")
    if breached:
        print(f"  RESULT: FAIL — {', '.join(breached)}")
        environment.process_exit_code = 1
    else:
        print("  RESULT: PASS")
    print("─────────────────────────────────────────────\n")
