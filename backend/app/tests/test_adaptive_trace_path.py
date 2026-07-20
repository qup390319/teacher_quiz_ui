"""本次施測適性路徑重播測試（adaptive_service.reconstruct_adaptive_path）。

驗證由「已作答節點 + 第一層過關與否」能忠實重現當初的動態出題順序與
退回/前進/略過標註（spec-10 §10.6）。不依賴 DB。
"""
from app.services.adaptive_service import reconstruct_adaptive_path

# 示範題組 quiz-001 的 5 個節點（含兩條可動態的鏈）
A02, A03, A05 = "INe-Ⅱ-3-02", "INe-Ⅱ-3-03", "INe-Ⅱ-3-05"  # A 鏈：02→03→05
B4, B7 = "INe-Ⅲ-5-4", "INe-Ⅲ-5-7"  # B：5-4 為 5-7 的遞移先備
FULL = [A02, A03, A05, B4, B7]


def _kinds(steps):
    return [(s["node_id"], s["kind"]) for s in steps]


def test_empty_answered_is_consistent_empty():
    r = reconstruct_adaptive_path(FULL, {})
    assert r["steps"] == []
    assert r["consistent"] is True


def test_all_wrong_full_descent():
    # 兩條鏈都一路答錯 → B7 起始、退回 B4、換 A05、退回 A03、退回 A02
    answered = {B7: False, B4: False, A05: False, A03: False, A02: False}
    r = reconstruct_adaptive_path(FULL, answered)
    assert _kinds(r["steps"]) == [
        (B7, "start"),
        (B4, "retreat"),
        (A05, "advance"),
        (A03, "retreat"),
        (A02, "retreat"),
    ]
    assert r["consistent"] is True
    assert r["skipped_node_ids"] == []


def test_pass_skips_prerequisites():
    # 兩條鏈頂端都過關 → 只問 B7、A05；先備 B4/A03/A02 全部略過
    answered = {B7: True, A05: True}
    r = reconstruct_adaptive_path(FULL, answered)
    assert _kinds(r["steps"]) == [(B7, "start"), (A05, "advance")]
    assert set(r["skipped_node_ids"]) == {B4, A03, A02}
    assert r["consistent"] is True


def test_retreat_then_pass_localizes_root():
    # B7 答錯退回 B4，B4 過關 → 路徑到 B4 為止（根因定位在 B7 本身）
    answered = {B7: False, B4: True}
    r = reconstruct_adaptive_path(FULL, answered)
    assert _kinds(r["steps"]) == [(B7, "start"), (B4, "retreat")]
    assert r["steps"][0]["passed"] is False
    assert r["steps"][1]["passed"] is True
    assert r["consistent"] is True


def test_node_name_attached():
    r = reconstruct_adaptive_path(FULL, {B7: False, B4: False})
    assert r["steps"][1]["node_id"] == B4
    assert r["steps"][1]["node_name"]  # 有帶節點名稱供報告顯示


def test_legacy_linear_all_answered_is_inconsistent():
    # 舊的線性 session：5 題全作答且全過 → 重播只會消化 B7/A05，
    # 與已作答集合不符 → consistent=False（報告端據此隱藏）
    answered = dict.fromkeys(FULL, True)
    r = reconstruct_adaptive_path(FULL, answered)
    assert r["consistent"] is False
