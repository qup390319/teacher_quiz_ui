"""Static knowledge-node prerequisite graph (mirrors src/data/knowledgeGraph.js).

12 nodes across 2 subtopics. Used by the adaptive dispatching service to
determine prerequisite chains and topological ordering.
"""

NODES: dict[str, dict] = {
    "INe-II-3-01": {
        "name": "生活中溶解的現象",
        "level": 1,
        "subtopic": "A",
        "prerequisites": [],
    },
    "INe-II-3-02": {
        "name": "溶解現象（看不見與沉澱）",
        "level": 1,
        "subtopic": "A",
        "prerequisites": ["INe-II-3-01"],
    },
    "INe-II-3-03": {
        "name": "攪拌與溶解速度",
        "level": 2,
        "subtopic": "A",
        "prerequisites": ["INe-II-3-02"],
    },
    "INe-II-3-05": {
        "name": "溶解量上限與沉澱",
        "level": 3,
        "subtopic": "A",
        "prerequisites": ["INe-II-3-03"],
    },
    "INe-II-3-04": {
        "name": "不同物質的溶解程度不同",
        "level": 3,
        "subtopic": "A",
        "prerequisites": ["INe-II-3-05"],
    },
    "INe-Ⅲ-5-1": {
        "name": "水溶液包含溶質和溶劑",
        "level": 1,
        "subtopic": "B",
        "prerequisites": [],
    },
    "INe-Ⅲ-5-2": {
        "name": "辨別生活中的水溶液",
        "level": 2,
        "subtopic": "B",
        "prerequisites": ["INe-Ⅲ-5-1"],
    },
    "INe-Ⅲ-5-3": {
        "name": "石蕊試紙的正確使用方法",
        "level": 2,
        "subtopic": "B",
        "prerequisites": ["INe-Ⅲ-5-2"],
    },
    "INe-Ⅲ-5-4": {
        "name": "用石蕊試紙檢驗水溶液的酸鹼性",
        "level": 3,
        "subtopic": "B",
        "prerequisites": ["INe-Ⅲ-5-3"],
    },
    "INe-Ⅲ-5-5": {
        "name": "自製酸鹼指示劑（紫色高麗菜）",
        "level": 3,
        "subtopic": "B",
        "prerequisites": ["INe-Ⅲ-5-4"],
    },
    "INe-Ⅲ-5-6": {
        "name": "自製酸鹼指示劑（蝶豆花）",
        "level": 3,
        "subtopic": "B",
        "prerequisites": ["INe-Ⅲ-5-4"],
    },
    "INe-Ⅲ-5-7": {
        "name": "酸鹼解決生活問題",
        "level": 4,
        "subtopic": "B",
        "prerequisites": ["INe-Ⅲ-5-5", "INe-Ⅲ-5-6"],
    },
}


def get_all_prerequisites(node_id: str) -> list[str]:
    """Return all transitive prerequisites for a node (BFS), ordered from root."""
    visited: set[str] = set()
    queue = list(NODES.get(node_id, {}).get("prerequisites", []))
    order: list[str] = []
    while queue:
        nid = queue.pop(0)
        if nid in visited:
            continue
        visited.add(nid)
        order.append(nid)
        queue.extend(NODES.get(nid, {}).get("prerequisites", []))
    order.reverse()
    return order


def topo_sort(node_ids: list[str]) -> list[str]:
    """Topological sort of a subset of node IDs respecting prerequisites.

    Kahn's algorithm: nodes with no in-degree (within the subset) come first.
    Ties are broken by (subtopic, level, id) so the result is deterministic.
    """
    subset = set(node_ids)
    in_degree: dict[str, int] = dict.fromkeys(subset, 0)
    adj: dict[str, list[str]] = {nid: [] for nid in subset}

    for nid in subset:
        for pre in NODES.get(nid, {}).get("prerequisites", []):
            if pre in subset:
                in_degree[nid] += 1
                adj[pre].append(nid)

    def _sort_key(nid: str):
        n = NODES.get(nid, {})
        return (0 if n.get("subtopic") == "A" else 1, n.get("level", 99), nid)

    queue = sorted([n for n in subset if in_degree[n] == 0], key=_sort_key)
    result: list[str] = []
    while queue:
        curr = queue.pop(0)
        result.append(curr)
        for succ in adj[curr]:
            in_degree[succ] -= 1
            if in_degree[succ] == 0:
                queue.append(succ)
                queue.sort(key=_sort_key)

    return result
