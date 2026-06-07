"""
Scenario 3 — Full student quiz + AI dialogue stress test.

Simulates the complete student journey end-to-end:
  login → GET quiz → POST answers (phase 1)
        → 2-round /api/llm/chat per question (phase 2 follow-up)
        → /api/llm/analyze-cause for misconception questions
        → POST /api/answers/followups (persist results)

Token usage is tracked from the `usage` field in each /api/llm/chat response
(promptTokens + completionTokens). /api/llm/analyze-cause does not expose
usage in its response, so an estimate of 800 tokens/call is used for that
endpoint (based on conversation log + system prompt size).

vLLM is the upstream, so there is no per-call cost. DB contains test
data, so writes are safe.

Usage:
    python -m locust -f load-tests/student_dialogue.py \\
        --host https://teacher-quiz.hsueh.tw \\
        --users 40 --spawn-rate 5 --run-time 5m --headless \\
        --csv load-tests/reports/dialogue-2026-06-07-v3
"""
import itertools
import json
import random
import threading
from pathlib import Path

from locust import HttpUser, between, events, task

# ── Token counter (thread-safe) ───────────────────────────────────────────────
class _TokenCounter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.prompt = 0
        self.completion = 0
        # analyze-cause doesn't expose usage; use a fixed estimate per call
        self.analyze_cause_calls = 0
        self.ANALYZE_CAUSE_EST = 800  # tokens/call (conservative estimate)

    def add_chat(self, usage: dict | None) -> None:
        if not usage:
            return
        with self._lock:
            self.prompt += usage.get("promptTokens", 0)
            self.completion += usage.get("completionTokens", 0)

    def add_analyze_cause(self) -> None:
        with self._lock:
            self.analyze_cause_calls += 1

    @property
    def total(self) -> int:
        return self.prompt + self.completion + self.analyze_cause_calls * self.ANALYZE_CAUSE_EST

    def summary(self) -> str:
        est = self.analyze_cause_calls * self.ANALYZE_CAUSE_EST
        return (
            f"  chat prompt tokens    : {self.prompt:,}\n"
            f"  chat completion tokens: {self.completion:,}\n"
            f"  analyze-cause (est.)  : {est:,}  ({self.analyze_cause_calls} calls × {self.ANALYZE_CAUSE_EST} est.)\n"
            f"  TOTAL tokens          : {self.total:,}"
        )


TOKENS = _TokenCounter()

# ── Seed accounts (matches backend/app/seed/seed.py) ────────────────────────
STUDENT_ACCOUNTS: list[str] = (
    [f"115{i:03d}" for i in range(1, 21)]        # class-A: 115001-115020
    + [f"115{i:03d}" for i in range(101, 119)]   # class-B: 115101-115118
    + [f"115{i:03d}" for i in range(201, 223)]   # class-C: 115201-115222
)

# class_id → list of (assignment_id, quiz_id)  — from backend/app/seed/data/assignments.json
# Each VU gets a unique account so no two VUs share the same student.
# This prevents false 500s from concurrent followup upserts on the same row.
_account_iter = itertools.cycle(STUDENT_ACCOUNTS)
_account_lock = threading.Lock()


def _claim_account() -> str:
    with _account_lock:
        return next(_account_iter)


CLASS_ASSIGNMENTS: dict[str, list[tuple[str, str]]] = {
    "class-A": [("assign-001", "quiz-001"), ("assign-004", "quiz-002")],
    "class-B": [("assign-002", "quiz-001")],
    "class-C": [("assign-003", "quiz-001")],
}

# Simulated student dialogue replies — varied enough to avoid trivial caching
_REPLIES_R1 = [
    "因為我覺得糖不見了",
    "上課老師說的",
    "不知道耶，我猜的",
    "看起來就是這樣啊",
    "因為水變甜了所以糖應該還在",
    "我覺得是蒸發掉了",
    "可能是沉到底了",
]
_REPLIES_R2 = [
    "喔，那這樣的話我不確定",
    "好像是這樣，因為看不見",
    "對，粒子變很小看不到了",
    "不一定，要看情況",
    "應該還在裡面吧",
    "我覺得它消失了",
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _login(client, account: str) -> bool:
    with client.post(
        "/api/auth/login",
        json={"account": account, "password": account},
        catch_response=True,
        name="/api/auth/login",
    ) as resp:
        if resp.status_code == 200:
            return True
        resp.failure(f"login failed {resp.status_code}")
        return False


def _build_r1_prompt(stem: str, tag: str, option_text: str) -> str:
    """Prompt asking the AI to generate a gentle one-sentence follow-up question."""
    return (
        "你是「科學偵探」，請用一句溫和的問句引導學生說出他的想法（不要直接說答案對不對）。\n\n"
        f"題目：{stem}\n學生選擇：{tag}. {option_text}\n\n請只輸出一句追問。"
    )


def _build_r2_messages(
    r1_prompt: str, ai_r1: str, student_r1: str,
) -> list[dict]:
    return [
        {"role": "user", "content": r1_prompt},
        {"role": "assistant", "content": ai_r1},
        {"role": "user", "content": student_r1},
        {
            "role": "user",
            "content": "根據學生回答，請再追問一句，引導他更深入思考，不要給答案。",
        },
    ]


# ── Main user class ───────────────────────────────────────────────────────────

class StudentDialogueUser(HttpUser):
    """Simulates a student completing a full quiz + AI dialogue cycle."""

    wait_time = between(2, 5)

    # ── Setup ────────────────────────────────────────────────────────────────

    def on_start(self) -> None:
        self.account = _claim_account()
        self.logged_in = _login(self.client, self.account)
        self.class_id: str | None = None
        self.assignment_id: str | None = None
        self.quiz_id: str | None = None
        self.questions: list[dict] = []

        if not self.logged_in:
            return

        me = self.client.get("/api/auth/me", name="/api/auth/me")
        if me.status_code != 200:
            return
        self.class_id = me.json().get("classId")
        if not self.class_id:
            return

        options = CLASS_ASSIGNMENTS.get(self.class_id, [])
        if not options:
            return
        self.assignment_id, self.quiz_id = random.choice(options)

        quiz = self.client.get(f"/api/quizzes/{self.quiz_id}", name="/api/quizzes/[id]")
        if quiz.status_code != 200:
            return
        self.questions = quiz.json().get("questions", [])

    # ── Core task ─────────────────────────────────────────────────────────────

    @task
    def full_quiz_with_dialogue(self) -> None:
        if not self.logged_in or not self.questions or not self.assignment_id:
            return

        # ── Phase 1: First-layer answers ────────────────────────────────────
        answer_choices: dict[int, dict] = {}
        answers_payload: list[dict] = []

        for q in self.questions:
            opts: list[dict] = q.get("options", [])
            if not opts:
                continue
            wrong = [o for o in opts if o.get("diagnosis", "").startswith("M")]
            correct = [o for o in opts if o.get("diagnosis") == "CORRECT"]
            # 60% pick a misconception answer (realistic wrong-answer rate)
            if wrong and random.random() < 0.6:
                chosen = random.choice(wrong)
            elif correct:
                chosen = correct[0]
            else:
                chosen = random.choice(opts)

            answer_choices[q["id"]] = chosen
            answers_payload.append({
                "assignmentId": self.assignment_id,
                "questionId": q["id"],
                "selectedTag": chosen["tag"],
                "diagnosis": chosen["diagnosis"],
            })

        ans_resp = self.client.post(
            "/api/answers",
            json={"answers": answers_payload},
            name="/api/answers",
        )
        if ans_resp.status_code not in (200, 201):
            return

        # Map questionId → studentAnswerId from the upsert result
        sa_id_map: dict[int, int] = {
            row["questionId"]: row["id"]
            for row in ans_resp.json()
        }

        # ── Phase 2: LLM follow-up dialogue per question ────────────────────
        followups: list[dict] = []

        for q in self.questions:
            q_id: int = q["id"]
            sa_id = sa_id_map.get(q_id)
            if not sa_id:
                continue

            chosen = answer_choices.get(q_id, {})
            tag: str = chosen.get("tag", "A")
            diagnosis: str = chosen.get("diagnosis", "CORRECT")
            option_text: str = chosen.get("content", "")
            stem: str = q.get("stem", "")
            node_id: str = q.get("knowledgeNodeId", "")
            misconception_id: str | None = diagnosis if diagnosis.startswith("M") else None

            conversation_log: list[dict] = []

            # Round 1 ─────────────────────────────────────────────────────────
            r1_prompt = _build_r1_prompt(stem, tag, option_text)
            r1 = self.client.post(
                "/api/llm/chat",
                json={
                    "messages": [{"role": "user", "content": r1_prompt}],
                    "temperature": 0.4,
                    "maxTokens": 200,
                },
                name="/api/llm/chat [r1]",
                timeout=30,
            )
            if r1.status_code != 200:
                continue
            r1_data = r1.json()
            TOKENS.add_chat(r1_data.get("usage"))
            ai_r1: str = r1_data.get("content", "你為什麼會選這個答案？")
            conversation_log.append({"role": "assistant", "content": ai_r1})

            student_r1 = random.choice(_REPLIES_R1)
            conversation_log.append({"role": "user", "content": student_r1})

            # Round 2 ─────────────────────────────────────────────────────────
            r2 = self.client.post(
                "/api/llm/chat",
                json={
                    "messages": _build_r2_messages(r1_prompt, ai_r1, student_r1),
                    "temperature": 0.4,
                    "maxTokens": 200,
                },
                name="/api/llm/chat [r2]",
                timeout=30,
            )
            if r2.status_code == 200:
                r2_data = r2.json()
                TOKENS.add_chat(r2_data.get("usage"))
                ai_r2: str = r2_data.get("content", "那你覺得呢？")
                conversation_log.append({"role": "assistant", "content": ai_r2})
                conversation_log.append(
                    {"role": "user", "content": random.choice(_REPLIES_R2)}
                )

            # Cause analysis (only for misconception answers) ─────────────────
            cause_ids: list[int] | None = None
            if misconception_id:
                ca = self.client.post(
                    "/api/llm/analyze-cause",
                    json={
                        "conversationLog": conversation_log,
                        "misconceptionCode": misconception_id,
                        "misconceptionLabel": f"迷思概念 {misconception_id}",
                        "knowledgeNode": node_id,
                    },
                    name="/api/llm/analyze-cause",
                    timeout=30,
                )
                if ca.status_code == 200:
                    cause_ids = ca.json().get("causeIds")
                    TOKENS.add_analyze_cause()

            # Determine outcome ────────────────────────────────────────────────
            if not misconception_id:
                final_status = "CORRECT"
                rq = random.choice(["SOLID", "PARTIAL"])
                status_change: dict = {}
            else:
                final_status = random.choice(["MISCONCEPTION", "CORRECT", "UNCERTAIN"])
                rq = random.choice(["PARTIAL", "WEAK", "GUESSING"])
                status_change = (
                    {"changeType": "UPGRADED"}
                    if final_status == "CORRECT"
                    else {}
                )

            followups.append({
                "studentAnswerId": sa_id,
                "conversationLog": conversation_log,
                "finalStatus": final_status,
                "misconceptionCode": misconception_id if final_status == "MISCONCEPTION" else None,
                "reasoningQuality": rq,
                "statusChange": status_change,
                "aiSummary": (
                    f"學生對「{node_id}」{'有迷思概念，' + misconception_id if misconception_id else '理解正確'}。"
                ),
                "causeIds": cause_ids,
            })

        # ── Phase 3: Persist followup results ────────────────────────────────
        if followups:
            self.client.post(
                "/api/answers/followups",
                json={"followups": followups},
                name="/api/answers/followups",
            )


# ── SLO check ────────────────────────────────────────────────────────────────

@events.quitting.add_listener
def _check_thresholds(environment, **_kw) -> None:
    stats = environment.stats.total
    p95 = stats.get_response_time_percentile(0.95)
    error_rate = (stats.num_failures / stats.num_requests) if stats.num_requests else 0

    # LLM involved → give generous headroom
    threshold_p95 = 10_000   # ms
    threshold_err = 0.05     # 5 %

    print("\n── 完整對話流程 SLO check ──────────────────────")
    print(f"  total requests : {stats.num_requests}")
    print(f"  p50            : {stats.get_response_time_percentile(0.5):.0f} ms")
    print(f"  p95            : {p95:.0f} ms   (threshold {threshold_p95} ms)")
    print(f"  p99            : {stats.get_response_time_percentile(0.99):.0f} ms")
    print(f"  error rate     : {error_rate * 100:.2f} %   (threshold {threshold_err * 100:.2f} %)")
    print(f"\n── Token 使用量 ─────────────────────────────────")
    print(TOKENS.summary())

    breached = []
    if p95 > threshold_p95:
        breached.append(f"p95 {p95:.0f}ms > {threshold_p95}ms")
    if error_rate > threshold_err:
        breached.append(f"errors {error_rate * 100:.2f}% > {threshold_err * 100:.2f}%")

    # Write token summary to JSON for easy post-processing
    token_out = Path(__file__).parent / "reports" / "tokens_latest.json"
    token_data = {
        "chat_prompt_tokens": TOKENS.prompt,
        "chat_completion_tokens": TOKENS.completion,
        "analyze_cause_calls": TOKENS.analyze_cause_calls,
        "analyze_cause_est_per_call": TOKENS.ANALYZE_CAUSE_EST,
        "analyze_cause_est_total": TOKENS.analyze_cause_calls * TOKENS.ANALYZE_CAUSE_EST,
        "total_tokens": TOKENS.total,
    }
    token_out.write_text(json.dumps(token_data, indent=2, ensure_ascii=False))
    print(f"  (token detail saved → {token_out})")

    print(f"\n── 結論 ─────────────────────────────────────────")
    if breached:
        print(f"  RESULT: FAIL — {', '.join(breached)}")
        environment.process_exit_code = 1
    else:
        print("  RESULT: PASS")
    print("────────────────────────────────────────────────\n")
