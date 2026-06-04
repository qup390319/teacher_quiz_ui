"""UnitParentNode schemas — M:N 教學單元 ↔ 大節點。"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UnitParentNodeRead(BaseModel):
    """教學單元下已附掛的大節點，回傳時含原父節點欄位以方便前端顯示。"""
    parent_node_id: str = Field(serialization_alias="parentNodeId")
    sort_order: int = Field(serialization_alias="sortOrder")
    code: str
    name: str
    # 大節點本身所屬的次主題 unit_id（spec-11 §3.20 parent_nodes.unit_id）
    subtheme_unit_id: str | None = Field(default=None, serialization_alias="subthemeUnitId")
    subtheme_name: str | None = Field(default=None, serialization_alias="subthemeName")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class AttachParentNodesRequest(BaseModel):
    """POST /api/admin/units/{id}/parent-nodes — 一次新增多個大節點。"""
    parent_node_ids: list[str] = Field(
        validation_alias="parentNodeIds", serialization_alias="parentNodeIds",
    )

    model_config = ConfigDict(populate_by_name=True)


class ReorderParentNodesRequest(BaseModel):
    """PUT /api/admin/units/{id}/parent-nodes/reorder — body 是 parentNodeId 陣列。"""
    parent_node_ids: list[str] = Field(
        validation_alias="parentNodeIds", serialization_alias="parentNodeIds",
    )

    model_config = ConfigDict(populate_by_name=True)
