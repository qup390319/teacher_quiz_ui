/**
 * LLM 介面共用型別（JSDoc）
 *
 * 這些型別是 provider 對外的「契約」。新增 provider 時，
 * 必須回傳符合這些形狀的物件，呼叫端才不用為了某家 LLM 改寫程式碼。
 */

/**
 * @typedef {'system' | 'user' | 'assistant'} ChatRole
 */

/**
 * @typedef {Object} ChatMessage
 * @property {ChatRole} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatOptions
 * @property {ChatMessage[]} messages          - 對話歷史（含當前 user 訊息）
 * @property {number} [temperature]            - 取樣溫度，預設讀 env
 * @property {number} [maxTokens]              - 最大生成 token 數，預設讀 env
 * @property {string[]} [stop]                 - 停止序列
 * @property {AbortSignal} [signal]            - 用來中斷請求（例如使用者離開頁面）
 * @property {string} [model]                  - 覆寫預設 model
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} content                  - 完整回覆文字
 * @property {string} model                    - 實際生成所用模型
 * @property {Object} [usage]                  - { promptTokens, completionTokens, totalTokens }
 * @property {string} [finishReason]           - stop / length / ...
 * @property {unknown} raw                     - 原始 provider 回傳，除錯用
 */

/**
 * @typedef {Object} ChatStreamChunk
 * @property {string} delta                    - 本次新增的文字片段
 * @property {boolean} done                    - 是否為最後一個 chunk
 * @property {string} [finishReason]           - 結束原因（done=true 時提供）
 */

/**
 * @typedef {Object} LLMProvider
 * @property {string} name
 * @property {(options: ChatOptions) => Promise<ChatResponse>} chat
 * @property {(options: ChatOptions) => AsyncGenerator<ChatStreamChunk, void, void>} chatStream
 */

export {};
