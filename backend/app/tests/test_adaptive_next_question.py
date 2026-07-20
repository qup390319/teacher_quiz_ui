"""施測中動態選題純函數測試（adaptive_service.next_adaptive_node）。

策略（spec-05 §2.2 / spec-10 §10.4）：過關跳過先備、答錯退回先備，限題組內既有先備。
不依賴 DB；直接對節點層邏輯下斷言。
"""
from app.services.adaptive_service import next_adaptive_node

# 示範題組 quiz-001 的 5 個節點（含兩條可動態的鏈）
A02, A03, A05 = "INe-Ⅱ-3-02", "INe-Ⅱ-3-03", "INe-Ⅱ-3-05"  # A 鏈：02→03→05（全在題組）
B4, B7 = "INe-Ⅲ-5-4", "INe-Ⅲ-5-7"  # B：5-4 為 5-7 的遞移先備；各自外部先備不在題組
FULL = [A02, A03, A05, B4, B7]
A_CHAIN = [A02, A03, A05]
B_ONLY = [B4, B7]


def _next(quiz, answered):
    node, _skipped = next_adaptive_node(quiz, answered)
    return node


def test_first_question_is_most_advanced():
    # 無作答 → 從最進階節點開始（reverse-topo 首位）
    assert _next(FULL, []) == B7


def test_pass_skips_prerequisite():
    # 通過 5-7 → 略過其題組內先備 5-4，改考另一條鏈的頂端 05
    node, skipped = next_adaptive_node(FULL, [(B7, True)])
    assert node == A05
    assert B4 in skipped


def test_fail_descends_to_prerequisite():
    # 5-7 答錯 → 退回其題組內先備 5-4（動態追溯）
    assert _next(FULL, [(B7, False)]) == B4


def test_fail_without_in_quiz_prereq_moves_on():
    # 5-4 的先備（5-3）不在題組 → 無法退回，改考下一節點
    assert _next(B_ONLY, [(B4, False)]) == B7


def test_chain_descends_step_by_step():
    # A 鏈連續答錯 → 05 → 03 → 02 逐級退回
    assert _next(A_CHAIN, []) == A05
    assert _next(A_CHAIN, [(A05, False)]) == A03
    assert _next(A_CHAIN, [(A05, False), (A03, False)]) == A02


def test_passed_prereq_stops_descent_and_localizes_root():
    # 05 答錯但先備 03 過關 → 根因定位在 05 這一層，02 因 03 過關被略過 → 結束
    node, skipped = next_adaptive_node(A_CHAIN, [(A05, False), (A03, True)])
    assert node is None
    assert A02 in skipped


def test_all_correct_answers_few_questions():
    # 全對學生：通過兩條鏈頂端即結束，先備全略過（動態選題的省時效果）
    node, skipped = next_adaptive_node(FULL, [(B7, True), (A05, True)])
    assert node is None
    assert set(skipped) == {B4, A03, A02}


def test_full_fail_walk_terminates():
    # 全部答錯：走完 B7→B4→A05→A03→A02 後結束，不會無限迴圈
    answered = [(B7, False), (B4, False), (A05, False), (A03, False), (A02, False)]
    assert _next(FULL, answered) is None
