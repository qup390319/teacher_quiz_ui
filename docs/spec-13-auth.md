# SPEC-13: Authentication / 認證規格

> 本文件定義 SciLens 的登入、登出、session 維持、密碼處理與權限檢查機制。
> 與 spec-10（後端架構）、spec-11（DB schema）、spec-02（路由）、spec-04（前端 AuthContext）配合。

---

## 1. 設計決策

| 決策點 | 選擇 | 來源 |
|--------|------|------|
| 認證方式 | 帳號 + 密碼 | 使用者需求 |
| Session 維持 | JWT 存於 HttpOnly Cookie | spec-10 |
| 密碼存放 | **明文存放於 `users.password` 欄位** | 使用者決策 Q2-C |
| 教師可看學生密碼 | 是（明文存放即可直接回傳） | 使用者需求 |
| 學生改密碼 | 可自行改（呼叫 `/api/auth/password`） | 一般慣例 |
| 教師重設學生密碼 | 重設為「帳號字串」並標記 `password_was_default=true` | 一般慣例 |

> **安全性聲明**：明文密碼存放是已知的安全反模式。使用者已被告知其風險（DB 外洩 = 全部學生密碼曝光）並選擇承擔。後續若要轉為 hash，需做 schema migration + 一次性密碼重設流程。

---

## 2. 帳號規則

| 欄位 | 規則 | 範例 |
|------|------|------|
| 教師帳號 | 字母 + 數字組合 | `aaa001` |
| 學生帳號 | 純數字（建議按學年 + 班級 + 座號） | `115001`（115學年甲班1號）、`115101`（115學年乙班1號）、`115201`（115學年丙班1號） |
| 管理員帳號 | `admin` + 編號（migration 0012 起） | `admin001` |
| 預設密碼 | 完全等於帳號 | 教師 `aaa001` / `aaa001`；學生 `115001` / `115001`；管理員 `admin001` / `admin001` |

### 2.1 預設帳號

| 帳號 | 角色 | 名稱 | 用途 | 看到的資料 |
|------|------|------|------|-----------|
| `admin001` | admin | 系統管理員 | 後台維運 | 全系統（跨教師）資料管理；不關聯到教師/學生子表 |
| `aaa001` | teacher | 示範老師 | 給指導教授 / 簡報展示 | 全部 seed 示範資料（3 個班級 / ~60 學生 / 派題 / 作答 / 治療紀錄） |
| `bbb001` | teacher | 黃老師 | **正式上線使用** | 班級 / 學生 / 派題 / 作答 / 診斷結果皆為空白；只看得到系統共用的「診斷出題」「概念釐清出題」題庫 |

兩個教師之間透過 `classes.teacher_id` 做資料隔離（spec-11 §3.3）。
共用題庫（`quizzes` / `scenario_quizzes`）不做隔離。
管理員 (`admin001`) 不受 `teacher_id` 過濾影響；後台 API (`/api/admin/*`) 走獨立 router + `require_admin` dependency。

---

## 3. 密碼處理

### 3.1 儲存

`users.password` 欄位直接存明文字串：

```sql
INSERT INTO users (id, account, password, role, password_was_default)
VALUES ('aaa001', 'aaa001', 'aaa001', 'teacher', TRUE);
```

### 3.2 登入驗證

```python
# app/auth/password.py
def verify_password(plain: str, stored: str) -> bool:
    return plain == stored
```

### 3.3 教師重設學生密碼

```python
async def reset_student_password(db, student_id: str):
    user = await get_user(db, student_id)
    user.password = user.account            # 重設為帳號
    user.password_was_default = True
    await db.commit()
```

### 3.4 學生自己改密碼

```python
async def change_password(db, user_id: str, old: str, new: str):
    user = await get_user(db, user_id)
    if user.password != old:
        raise HTTPException(401, "OLD_PASSWORD_MISMATCH")
    if not (6 <= len(new) <= 32):
        raise HTTPException(400, "PASSWORD_LENGTH_INVALID")
    user.password = new
    user.password_was_default = (new == user.account)
    await db.commit()
```

---

## 4. JWT Token

### 4.1 Payload

```json
{
  "sub": "aaa001",            // user_id
  "role": "teacher",          // 或 "student"
  "iat": 1714464000,
  "exp": 1714550400           // iat + JWT_EXPIRES_HOURS
}
```

### 4.2 簽章

- 演算法：`HS256`
- 金鑰：環境變數 `JWT_SECRET`（dev 隨機 32 字元，prod 由部署管理者設定）
- 有效期：環境變數 `JWT_EXPIRES_HOURS`（預設 24 小時）

### 4.3 套件選擇

`PyJWT`（純 Python、無 C 依賴）。

---

## 5. Cookie 設定

| 屬性 | dev | prod |
|------|-----|------|
| Name | `scilens_session` | 同 |
| Value | JWT 字串 | 同 |
| `HttpOnly` | `True` | `True` |
| `Secure` | `False`（HTTP 也可用） | `True`（要 HTTPS） |
| `SameSite` | `lax` | `strict` |
| `Path` | `/` | `/` |
| `Max-Age` | `JWT_EXPIRES_HOURS * 3600` | 同 |

由 `COOKIE_SECURE` / `COOKIE_SAMESITE` 環境變數控制。

---

## 6. API 端點

### 6.1 `POST /api/auth/login`

**Request**:
```json
{ "account": "aaa001", "password": "aaa001", "role": "teacher" }
```

| 欄位 | 必填 | 說明 |
|------|------|------|
| `account` | ✅ | 帳號 |
| `password` | ✅ | 明文密碼 |
| `role` | ⛔ optional | 登入頁所選角色卡（`teacher` \| `student` \| `admin`）。若提供且與帳號實際 role 不符，回 401 `ROLE_MISMATCH`。 |

**Response 200**：
```json
{
  "user": {
    "id": "aaa001",
    "account": "aaa001",
    "role": "teacher",
    "name": "示範老師",
    "passwordWasDefault": true
  }
}
```
同時 `Set-Cookie: scilens_session=<JWT>; HttpOnly; ...`

**Response 401**：
```json
{ "detail": "INVALID_CREDENTIALS" }
```
或（角色卡與實際身份不符）：
```json
{ "detail": "ROLE_MISMATCH" }
```

> 注意：角色檢查發生在密碼驗證之後，因此 `ROLE_MISMATCH` 只會在帳密**正確**時出現；密碼錯時一律回 `INVALID_CREDENTIALS`，不會洩漏「此帳號存在但是另一種角色」的訊息。

### 6.2 `POST /api/auth/logout`

清除 cookie（`Max-Age=0`），回傳 `{ "ok": true }`。

### 6.3 `GET /api/auth/me`

讀取 cookie 中 JWT，回傳當前使用者：
```json
{
  "id": "115001",
  "account": "115001",
  "role": "student",
  "name": "王小明",
  "classId": "class-A",
  "seat": 1,
  "passwordWasDefault": true
}
```

未登入回 `401 { "error": "NOT_AUTHENTICATED" }`。

### 6.4 `PATCH /api/auth/password`

**Request**:
```json
{ "oldPassword": "aaa001", "newPassword": "myNewPwd123" }
```

**Response 200**：`{ "ok": true, "passwordWasDefault": false }`

### 6.5 `GET /api/students/{id}`

僅教師可呼叫。回傳：
```json
{
  "id": "115001",
  "account": "115001",
  "name": "王小明",
  "seat": 1,
  "classId": "class-A",
  "password": "115001",         // 明文密碼，僅教師可見
  "passwordWasDefault": true
}
```

非教師呼叫 → `403 { "error": "FORBIDDEN" }`。

### 6.6 `POST /api/students/{id}/reset-password`

僅教師可呼叫。把該學生密碼重設為「帳號字串」，回傳 `{ "ok": true, "password": "115001" }`。

---

## 7. FastAPI Dependencies

### 7.1 取得當前使用者

```python
# app/auth/deps.py
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get("scilens_session")
    if not token:
        raise HTTPException(401, "NOT_AUTHENTICATED")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "INVALID_TOKEN")
    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(401, "USER_NOT_FOUND")
    return user
```

### 7.2 角色檢查

```python
async def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.role != "teacher":
        raise HTTPException(403, "TEACHER_ONLY")
    return user

async def require_student(user: User = Depends(get_current_user)) -> User:
    if user.role != "student":
        raise HTTPException(403, "STUDENT_ONLY")
    return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "ADMIN_ONLY")
    return user
```

> **停用帳號（W1）**：`get_current_user` 在還原 user 後檢查 `user.is_active`，若為 `False` 回 401 `ACCOUNT_DISABLED`。`/api/auth/login` 在密碼驗證後也檢查同樣條件，避免被停用的帳號取得新 cookie。

### 7.3 用法

```python
@router.get("/students/{id}")
async def get_student(
    id: str,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    ...
```

### 7.4 角色 ↔ 端點 對照表（節錄學生需要存取的端點）

| 端點 | Teacher | Student | Admin | 學生限制 |
|------|---------|---------|-------|---------|
| `POST /api/auth/login` | ✅ | ✅ | ✅ | — |
| `GET /api/auth/me` | ✅ | ✅ | ✅ | — |
| `PATCH /api/auth/password` | ✅ | ✅ | ✅ | 只能改自己 |
| `GET /api/admin/users` (W2) | ❌ | ❌ | ✅ | ADMIN_ONLY |
| `GET /api/admin/users/{id}` (W2) | ❌ | ❌ | ✅ | ADMIN_ONLY；含明文密碼 |
| `POST /api/admin/users` (W2) | ❌ | ❌ | ✅ | ADMIN_ONLY；新增教師 |
| `PATCH /api/admin/users/{id}/disable\|enable` (W2) | ❌ | ❌ | ✅ | ADMIN_ONLY；不可停用 admin |
| `POST /api/admin/users/{id}/reset-password` (W2) | ❌ | ❌ | ✅ | ADMIN_ONLY |
| `GET /api/admin/classes` (W3) | ❌ | ❌ | ✅ | ADMIN_ONLY；跨教師班級總覽 |
| `GET /api/admin/classes/{id}` (W3) | ❌ | ❌ | ✅ | ADMIN_ONLY；不受 teacher_id 隔離 |
| `POST /api/classes/{id}/students/import-excel[/preview]` (W3) | ✅（限自己班級） | ❌ | ✅（任何班級） | 班級必須為空，否則 409 CLASS_NOT_EMPTY |
| `GET /api/admin/units` (W4) | ❌ | ❌ | ✅ | ADMIN_ONLY；含已封存 |
| `POST/PATCH/DELETE /api/admin/units[/{id}]` (W4) | ❌ | ❌ | ✅ | ADMIN_ONLY；系統內建單元不可封存或刪除 |
| `GET /api/units` (W4) | ✅ | ✅ | ✅ | 公開讀（任何登入者）；給選擇器用 |
| `GET/POST/PATCH/DELETE /api/admin/knowledge-nodes[/{id}]` (W5a) | ❌ | ❌ | ✅ | ADMIN_ONLY；系統 seed 節點不可刪 |
| `POST /api/admin/knowledge-nodes/bulk-positions\|bulk-assign-unit\|import-excel[/preview]` (W5a) | ❌ | ❌ | ✅ | ADMIN_ONLY |
| `POST/PATCH/DELETE /api/admin/(knowledge-nodes/{nodeId}/)?misconceptions[/{id}]` (W5a) | ❌ | ❌ | ✅ | ADMIN_ONLY |
| `GET /api/knowledge-nodes` (W5a→W5b) | ✅（不需登入） | ✅（不需登入） | ✅ | **W5b 改為完全公開**：前端 main.jsx 在 boot 階段 fetch；無 cookie 也能讀 |
| `GET /api/admin/quizzes` (W6) | ❌ | ❌ | ✅ | ADMIN_ONLY；跨教師列出含 owner |
| `PATCH /api/admin/quizzes/{id}/sample` (W6) | ❌ | ❌ | ✅ | ADMIN_ONLY；切換 is_sample |
| `GET /api/assignments` | ✅ 全部 | ✅ 限定 | 隱式過濾為自己班級 |
| `GET /api/quizzes` | ✅ 全部 | ✅ 限定 | 只回自己班級已被派發的 |
| `GET /api/quizzes/{id}` | ✅ | ✅ 限定 | 必須有對應 Assignment 派至自己班級，否則 403 `QUIZ_NOT_ASSIGNED` |
| `GET /api/scenarios` | ✅ 全部 | ✅ 限定 | 同上 |
| `GET /api/scenarios/{id}` | ✅ | ✅ 限定 | 必須已派發，否則 403 `SCENARIO_NOT_ASSIGNED` |
| `POST /api/answers` | ❌ | ✅ | 只能寫自己班級的 assignment |
| `POST /api/answers/followups` | ❌ | ✅ | 只能寫自己的 answer |
| `POST /api/treatment/sessions/start` | ❌ | ✅ | 只能對自己 |
| `GET /api/students/{id}/history` | ✅ | ✅ 限定 | 只能查自己（`user.id == student_id`） |
| `GET /api/classes`, `POST /api/classes`, `PATCH /{id}`, `GET /{id}`, `PUT /students` | ✅ | ❌ | TEACHER_ONLY |
| `GET /api/students/{id}` (含明文密碼) | ✅ | ❌ | TEACHER_ONLY |
| `POST /api/quizzes`, `PUT`, `DELETE` | ✅ | ❌ | TEACHER_ONLY |
| `POST /api/scenarios`, `PUT`, `DELETE` | ✅ | ❌ | TEACHER_ONLY |
| `POST /api/assignments`, `PATCH`, `DELETE` | ✅ | ❌ | TEACHER_ONLY |
| `GET /api/quizzes/{id}/answers`, `/stats` | ✅ | ❌ | TEACHER_ONLY |
| `GET /api/teachers/treatment-logs` | ✅ | ❌ | TEACHER_ONLY |
| `POST /api/ai/*`, `POST /api/llm/chat[/stream]` | ✅ | ✅ | 學生對話用（治療 / 追問） |

學生需要看資產（quiz/scenario）但不應看到其他班級的內容，因此「看內容」端點放寬到 `get_current_user`，並在 router 內檢查 `Assignment.class_id == student.class_id` 完成過濾。

---

## 8. 前端整合

### 8.1 AuthContext

新增 `src/context/AuthContext.jsx`：
- state: `currentUser`（`null` 或 `{id, role, name, ...}`）+ `loading`（bootstrap 中）
- 啟動時呼叫 `GET /api/auth/me` 嘗試從 cookie 還原
- 提供 `login(account, password)` / `logout()`
- **`login` 與 `logout` 都必須呼叫 `queryClient.clear()`**：每位老師看到的 `/api/classes` / `/api/assignments` / `/api/students/{id}` 等資料都不同；若不清 React Query cache，新登入者在 staleTime（30s）內會看到上一位老師的列表，點進去 detail 才 404 NOT_FOUND。

### 8.2 受保護路由

`src/components/RequireAuth.jsx`：
```jsx
export function RequireAuth({ role, children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!currentUser) return <Navigate to="/" replace />;
  if (role && currentUser.role !== role) return <Navigate to="/" replace />;
  return children;
}
```

`App.jsx` 的教師端 / 學生端路由由 `<RequireAuth role="teacher">` 包起。

### 8.3 LoginPage

點選角色卡 → 彈出登入框 → 呼叫 `/api/auth/login`（帶 `role`）→ 成功後依 role 導向。

P1 為了不破壞既有 UX，把原本「點教師卡 → 直接進教師端」改成「點教師卡 → 彈出登入框 → 輸入帳密 → 進教師端」。學生卡同理。

#### 角色防呆（雙保險）

防止「點老師卡卻用學生帳密成功登入」這類 UX 漏洞：

1. **後端為主**：`AuthContext.login(account, password, variant)` 把使用者所選的角色卡 `variant` 隨 request 送出，後端 `/api/auth/login` 比對 `payload.role` 與 `user.role`，不符即回 401 `ROLE_MISMATCH`。前端 `catch` 顯示「此帳號不是老師/學生」。
2. **前端兜底**：若後端版本舊、忽略 `role` 欄位，`login()` 仍會把 `currentUser` 設為實際角色，`LoginPage` 的 auto-redirect `useEffect` 會立刻把使用者導去錯誤端的頁面。為此 `LoginModal.handleSubmit` 在偵測到 `user.role !== variant` 時會**先 `await logout()`** 清掉 cookie 與 `currentUser`，再顯示錯誤訊息。

### 8.4 fetch 設定

所有 API 呼叫需帶 `credentials: 'include'`，cookie 才會送出：

```js
fetch('/api/auth/me', { credentials: 'include' })
```

封裝為 `src/lib/api.js`，全站共用。

---

## 9. 安全性考量

| 風險 | 緩解（含已接受的取捨） |
|------|------------------------|
| **DB 外洩 = 密碼明文外洩** | **使用者已接受此風險（Q2-C）** |
| JWT secret 外洩 | `JWT_SECRET` 由部署管理者管理；不入版控 |
| XSS 偷 token | HttpOnly cookie，JS 拿不到 |
| CSRF | 同 Origin（前後端共部署於同網域反代後）+ SameSite=Lax/Strict |
| Brute force 登入 | P1 不實作 rate limit；後續可加（如 5 次失敗鎖 5 分鐘） |
| 學生密碼太短 | 改密碼端點要求 6~32 字元 |
| 教師端洩密碼給螢幕旁圍觀者 | 前端密碼欄位加遮罩，預設只顯示「●●●●●●」+ 點擊「眼睛」按鈕才顯示明文 |
| 教師之間互相窺探自訂迷思 | `/api/misconceptions/custom/*` 端點一律以 cookie 帶來的 `teacher_id` 過濾；寫入時忽略 payload 的 teacher_id；他人 record 的 DELETE 回 404（不洩露存在性） |

---

## 10. 與既有 spec 的關係

| 既有 spec | 受影響範圍 |
|-----------|-----------|
| spec-02 路由 | 新增 RequireAuth；LoginPage 從「假登入」變「真登入」 |
| spec-04 資料模型 | 新增 AuthContext；AppContext 的 `role / setRole` 改由 AuthContext 提供 |
| spec-05 工作流 | §2.2 認證流程從「假登入」改為「帳密登入」 |
| spec-06 部署 | 新增 `JWT_SECRET` / `COOKIE_SECURE` 等環境變數 |

---

## 11. 帳號停用機制（W2）

`users` 表新增 `is_active` / `disabled_at` / `disabled_by` 三欄位（spec-11 §3.1、migration 0012）。

### 行為
- `is_active = false` 的帳號在 `POST /api/auth/login` 與 `get_current_user` 兩處都被擋下，回 401 `ACCOUNT_DISABLED`
- 既有 cookie session 在下次 API 呼叫時即失效（`get_current_user` 會 raise）
- 所有歷史資料（班級、題組、派題、作答、追問）完整保留；學生端能繼續看到被停用教師建立的題組（透過 quiz 的 created_by 不做 active filter）
- 管理員可隨時 enable 復原（`disabled_at` / `disabled_by` 清空）

### 規則
- **不可停用 admin 帳號**：避免後台被反鎖（`POST .../disable` 對 `role='admin'` 回 400 `CANNOT_DISABLE_ADMIN`）
- 教師自己無法被別人停用；只有 admin 透過 `/api/admin/users/*` 可執行
- `disabled_by` 是執行該操作的 admin user id（**不設 FK**，允許歷史 admin 帳號被刪除後仍保留 audit trail）

### 不在此範圍
- 帳號**刪除**（spec-13 W2 之後不支援；只支援停用，避免 cascade 風險）
- 學生帳號的新增（由教師端 ClassDetail 或 W3 Excel 匯入處理）
