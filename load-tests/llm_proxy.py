"""
Scenario 2 — LLM proxy stress test with a hard budget cap.

Hits /api/llm/chat, /api/llm/analyze-cause, and /api/ai/distractor-suggest.
Stops automatically once LLM_BUDGET requests have been issued — protects
against runaway cost. Uses fixed mock prompts so upstream caches can warm.

Usage:
    LLM_BUDGET=100 uv run locust -f load-tests/llm_proxy.py \\
        --host http://localhost:8000 \\
        --users 10 --spawn-rate 2 --run-time 10m --headless
"""
import os
import random
import threading

from locust import HttpUser, between, events, task

# ── Config ──────────────────────────────────────────────────────────────────
TEACHER_ACCOUNT = "aaa001"
LLM_BUDGET = int(os.environ.get("LLM_BUDGET", "100"))

# Fixed prompts — same input every time so vLLM / RAGFlow caches warm up,
# and so we measure proxy + upstream behaviour rather than prompt variance.
FIXED_CHAT_PROMPT = "用一句話解釋什麼是水溶液。"

FIXED_CAUSE_LOG = [
    {"role": "assistant", "content": "你覺得鹽加進水裡，鹽去哪裡了？"},
    {"role": "user", "content": "鹽不見了，變成水了。"},
    {"role": "assistant", "content": "為什麼會這樣想？"},
    {"role": "user", "content": "因為我看不到鹽了。"},
]

FIXED_DISTRACTOR_PAYLOAD = {
    "ragflowSessionId": "loadtest-fixed-session",
    "nodeId": "INe-II-3-02",
    "nodeName": "溶解",
    "misconceptionId": "M02-1",
    "misconceptionLabel": "物質溶解後就消失了",
    "misconceptionDetail": "學生認為固體溶解進水中後便不再存在。",
    "currentText": "鹽巴溶於水中後就消失了。",
    "stem": "把一匙鹽倒入水中攪拌至完全溶解，下列敘述何者正確？",
}


# ── Budget tracking ─────────────────────────────────────────────────────────
class Budget:
    """Thread-safe LLM call counter — caps total upstream calls."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        self.count = 0
        self._lock = threading.Lock()
        self.exhausted = False

    def consume(self) -> bool:
        with self._lock:
            if self.count >= self.limit:
                self.exhausted = True
                return False
            self.count += 1
            return True


BUDGET = Budget(LLM_BUDGET)


def _login(client, account: str) -> bool:
    with client.post(
        "/api/auth/login",
        json={"account": account, "password": account},
        catch_response=True,
        name="/api/auth/login",
    ) as resp:
        if resp.status_code == 200:
            return True
        resp.failure(f"login failed: {resp.status_code}")
        return False


class LlmUser(HttpUser):
    """Teacher-authenticated user hitting LLM/AI endpoints."""

    wait_time = between(2, 5)

    def on_start(self) -> None:
        self.logged_in = _login(self.client, TEACHER_ACCOUNT)

    def _guarded(self, label: str, fn) -> None:
        if not self.logged_in:
            return
        if not BUDGET.consume():
            # Out of budget — gracefully stop firing requests
            self.environment.runner.quit()
            return
        fn(label)

    @task(3)
    def chat(self) -> None:
        def _do(label: str) -> None:
            self.client.post(
                "/api/llm/chat",
                json={
                    "messages": [{"role": "user", "content": FIXED_CHAT_PROMPT}],
                    "temperature": 0.3,
                    "maxTokens": 200,
                },
                name=label,
                timeout=30,
            )

        self._guarded("/api/llm/chat", _do)

    @task(2)
    def analyze_cause(self) -> None:
        def _do(label: str) -> None:
            self.client.post(
                "/api/llm/analyze-cause",
                json={
                    "conversationLog": FIXED_CAUSE_LOG,
                    "misconceptionCode": "M02-1",
                    "misconceptionLabel": "物質溶解後就消失了",
                    "knowledgeNode": "INe-II-3-02",
                },
                name=label,
                timeout=30,
            )

        self._guarded("/api/llm/analyze-cause", _do)

    @task(1)
    def distractor_suggest(self) -> None:
        def _do(label: str) -> None:
            # Tweak session id slightly so RAGFlow doesn't dedupe entirely
            payload = dict(FIXED_DISTRACTOR_PAYLOAD)
            payload["ragflowSessionId"] = f"loadtest-{random.randint(1, 5)}"
            self.client.post(
                "/api/ai/distractor-suggest",
                json=payload,
                name="/api/ai/distractor-suggest",
                timeout=60,
            )

        self._guarded("/api/ai/distractor-suggest", _do)


# ── Pass/fail criteria ──────────────────────────────────────────────────────
@events.quitting.add_listener
def _check_thresholds(environment, **_kw) -> None:
    stats = environment.stats.total
    p95 = stats.get_response_time_percentile(0.95)
    error_rate = (stats.num_failures / stats.num_requests) if stats.num_requests else 0

    threshold_p95 = 8000  # ms — LLM is slow, give it room
    threshold_err = 0.05

    print("\n── LLM proxy SLO check ──────────────────────")
    print(f"  budget used    : {BUDGET.count} / {BUDGET.limit}")
    if BUDGET.exhausted:
        print("  (budget exhausted — test stopped early to cap cost)")
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
