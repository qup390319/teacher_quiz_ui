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
| 預設密碼 | 完全等於帳號 | 教師 `aaa001` / `aaa001`；學生 `115001` / `115001` |

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
{ "account": "aaa001", "password": "aaa001" }
```

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
{ "error": "INVALID_CREDENTIALS", "message": "帳號或密碼錯誤" }
```

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
```

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

| 端點 | Teacher | Student | 學生限制 |
|------|---------|---------|---------|
| `POST /api/auth/login` | ✅ | ✅ | — |
| `GET /api/auth/me` | ✅ | ✅ | — |
| `PATCH /api/auth/password` | ✅ | ✅ | 只能改自己 |
| `GET /api/assignments` | ✅ 全部 | ✅ 限定 | 隱式過濾為自己班級 |
| `GET /api/quizzes` | ✅ 全部 | ✅ 限定 | 只回自己班級已被派發的 |
| `GET /api/quizzes/{id}` | ✅ | ✅ 限定 | 必須有對應 Assignment 派至自己班級，否則 403 `QUIZ_NOT_ASSIGNED` |
| `GET /api/scenarios` | ✅ 全部 | ✅ 限定 | 同上 |
| `GET /api/scenarios/{id}` | ✅ | ✅ 限定 | 必須已派發，否則 403 `SCENARIO_NOT_ASSIGNED` |
| `POST /api/answers` | ❌ | ✅ | 只能寫自己班級的 assignment |
| `POST /api/answers/followups` | ❌ | ✅ | 只能寫自己的 answer |
| `POST /api/treatment/sessions/start` | ❌ | ✅ | 只能對自己 |
| `GET /api/students/{id}/history` | ✅ | ✅ 限定 | 只能查自己（`user.id == student_id`） |
| `GET /api/classes`, `/{id}`, `PUT /students` | ✅ | ❌ | TEACHER_ONLY |
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

點選角色卡 → 彈出登入框 → 呼叫 `/api/auth/login` → 成功後依 role 導向。

P1 為了不破壞既有 UX，把原本「點教師卡 → 直接進教師端」改成「點教師卡 → 彈出登入框 → 輸入帳密 → 進教師端」。學生卡同理。

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

---

## 10. 與既有 spec 的關係

| 既有 spec | 受影響範圍 |
|-----------|-----------|
| spec-02 路由 | 新增 RequireAuth；LoginPage 從「假登入」變「真登入」 |
| spec-04 資料模型 | 新增 AuthContext；AppContext 的 `role / setRole` 改由 AuthContext 提供 |
| spec-05 工作流 | §2.2 認證流程從「假登入」改為「帳密登入」 |
| spec-06 部署 | 新增 `JWT_SECRET` / `COOKIE_SECURE` 等環境變數 |
