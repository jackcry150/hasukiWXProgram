# GooMooTech RAG Customer Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real RAG-backed AI customer service pipeline for GooMooTechWXProgram using business data plus manually maintained knowledge, Qdrant vector search, and the existing mini program AI customer entry.

**Architecture:** Keep MySQL as the source of truth for products, news, manual knowledge, chunks, and sync state. Add Qdrant as an internal Docker service for vector retrieval only, then have ThinkPHP build answer context from retrieved chunks plus order/product runtime facts. Do not expose Qdrant publicly and do not store RAG secrets or vector data inside the rsync-deleted app code directory.

**Tech Stack:** ThinkPHP 8, MySQL, Docker Compose, Qdrant REST API, OpenAI-compatible embedding API, existing OpenAI-compatible chat-completions API, uniapp mini program.

---

### Task 1: Deployment And Local Config Baseline

**Files:**
- Modify: `D:\Codex Program\GooMooTechWXProgram\DockerFiles\docker-compose.prod.yml`
- Modify: `D:\Codex Program\GooMooTechWXProgram\deploy\deploy.sh`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\config\rag.example.php`
- Do not commit or generate: `php/config/rag.local.php`

- [ ] **Step 1: Add Qdrant to production Compose**

Add a `qdrant` service on the existing app network. Use `expose`, not public `ports`.

```yaml
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant-prod
    restart: unless-stopped
    environment:
      QDRANT__SERVICE__API_KEY: "${QDRANT_API_KEY:-change-this-qdrant-key}"
    volumes:
      - /data/qdrant/storage:/qdrant/storage
    expose:
      - "6333"
      - "6334"
    networks:
      - app-network
```

- [ ] **Step 2: Protect server-local RAG config from rsync delete**

In `deploy/deploy.sh`, add these excludes to the existing `rsync -a --delete` block:

```bash
        --exclude 'config/rag.local.php' \
        --exclude 'config/ai.local.php' \
```

Keep existing excludes for `config/ai-chat-config.php` if present. The deploy script must never delete local model keys.

- [ ] **Step 3: Add committed example config**

Create `php/config/rag.example.php`:

```php
<?php

return [
    'enabled' => false,
    'qdrant_url' => 'http://qdrant:6333',
    'qdrant_api_key' => '',
    'collection' => 'goomootech_customer_service',
    'embedding_base_url' => 'https://api.example.com/v1',
    'embedding_api_key' => '',
    'embedding_model' => 'text-embedding-3-small',
    'embedding_dimension' => 1536,
    'embedding_timeout' => 20,
    'search_limit' => 6,
    'score_threshold' => 0.35,
];
```

- [ ] **Step 4: Validate YAML and script**

Run:

```bash
docker compose -f DockerFiles/docker-compose.prod.yml config
bash -n deploy/deploy.sh
```

Expected: Compose renders without syntax errors; `bash -n` produces no output.

---

### Task 2: RAG Database Schema

**Files:**
- Create: `D:\Codex Program\GooMooTechWXProgram\php\database\patch_20260623_rag_customer_service.sql`

- [ ] **Step 1: Create schema patch**

Create the SQL file:

```sql
CREATE TABLE IF NOT EXISTS `mp_ai_knowledge_source` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sourceType` varchar(30) NOT NULL DEFAULT 'manual' COMMENT 'manual/product/news/setting',
  `sourceId` int(11) NOT NULL DEFAULT '0',
  `app_code` varchar(30) NOT NULL DEFAULT 'goomoo',
  `title` varchar(255) NOT NULL DEFAULT '',
  `content` mediumtext,
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 enabled 2 disabled',
  `contentHash` varchar(64) NOT NULL DEFAULT '',
  `lastIndexedAt` datetime DEFAULT NULL,
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_source` (`sourceType`, `sourceId`, `app_code`),
  KEY `idx_status` (`status`),
  KEY `idx_app_code` (`app_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI知识源';

CREATE TABLE IF NOT EXISTS `mp_ai_knowledge_chunk` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sourceId` int(11) NOT NULL DEFAULT '0',
  `sourceType` varchar(30) NOT NULL DEFAULT 'manual',
  `originId` int(11) NOT NULL DEFAULT '0',
  `app_code` varchar(30) NOT NULL DEFAULT 'goomoo',
  `chunkIndex` int(11) NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL DEFAULT '',
  `content` text,
  `contentHash` varchar(64) NOT NULL DEFAULT '',
  `qdrantPointId` varchar(80) NOT NULL DEFAULT '',
  `embeddingStatus` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0 pending 1 indexed 2 failed',
  `embeddingError` varchar(500) NOT NULL DEFAULT '',
  `lastEmbeddedAt` datetime DEFAULT NULL,
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chunk_hash` (`sourceId`, `chunkIndex`, `contentHash`),
  KEY `idx_source` (`sourceId`),
  KEY `idx_embedding_status` (`embeddingStatus`),
  KEY `idx_point` (`qdrantPointId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI知识切片';

CREATE TABLE IF NOT EXISTS `mp_ai_embedding_job` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chunkId` int(11) NOT NULL DEFAULT '0',
  `jobType` varchar(20) NOT NULL DEFAULT 'upsert' COMMENT 'upsert/delete',
  `status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0 pending 1 running 2 success 3 failed',
  `attempts` int(11) NOT NULL DEFAULT '0',
  `lastError` varchar(500) NOT NULL DEFAULT '',
  `runAfter` datetime DEFAULT NULL,
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_run` (`status`, `runAfter`),
  KEY `idx_chunk` (`chunkId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI向量化任务';

ALTER TABLE `mp_ai_service_message`
  ADD COLUMN `retrievalContext` mediumtext NULL COMMENT 'RAG检索上下文JSON',
  ADD COLUMN `retrievalSourceIds` varchar(500) NOT NULL DEFAULT '' COMMENT '命中知识源ID列表';
```

- [ ] **Step 2: Validate SQL safely**

Run against a disposable or staging database first:

```bash
docker exec -i mysql-prod sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" goomoo_prod' < php/database/patch_20260623_rag_customer_service.sql
```

Expected: no SQL errors. Before production, create a fresh backup with the existing `/root/scripts/backup-goomootech.sh`.

---

### Task 3: RAG Core Service Layer

**Files:**
- Create: `D:\Codex Program\GooMooTechWXProgram\php\app\common\service\RagConfig.php`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\app\common\service\EmbeddingClient.php`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\app\common\service\QdrantClient.php`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\app\common\service\KnowledgeChunker.php`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\app\common\service\KnowledgeIndexer.php`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\app\common\service\RagRetriever.php`

- [ ] **Step 1: Add `RagConfig`**

Implement config loading from `config/rag.local.php`, falling back to `config/rag.example.php`. Return `enabled=false` if neither file is valid.

- [ ] **Step 2: Add `EmbeddingClient`**

Use cURL to call `POST {embedding_base_url}/embeddings` with:

```json
{
  "model": "text-embedding-3-small",
  "input": "chunk text"
}
```

Accept OpenAI-compatible responses shaped as:

```json
{
  "data": [
    { "embedding": [0.1, 0.2] }
  ]
}
```

If the embedding vector is missing or the dimension does not match config, return an error array instead of throwing.

- [ ] **Step 3: Add `QdrantClient`**

Implement:

```php
ensureCollection(int $dimension): array
upsertPoint(string $pointId, array $vector, array $payload): array
deletePoint(string $pointId): array
search(array $vector, array $filter, int $limit, float $scoreThreshold): array
```

Use REST endpoints under `qdrant_url`, and send `api-key: {qdrant_api_key}` when configured.

- [ ] **Step 4: Add `KnowledgeChunker`**

Implement deterministic Chinese-friendly chunking:

```php
chunk(string $title, string $content, int $maxChars = 650, int $overlapChars = 80): array
```

Strip HTML, collapse whitespace, keep the title in each chunk payload, and never emit empty chunks.

- [ ] **Step 5: Add `KnowledgeIndexer`**

Implement:

```php
syncProduct(int $productId): array
syncNews(int $newsId): array
syncManualSource(int $sourceId): array
enqueueChunks(int $sourceId): array
runPendingJobs(int $limit = 20): array
```

The indexer writes MySQL source/chunk/job rows first, then worker jobs call embedding and Qdrant.

- [ ] **Step 6: Add `RagRetriever`**

Implement:

```php
retrieve(string $question, array $options = []): array
```

It embeds the user question, searches Qdrant with `app_code`, `scene`, and optional `productId` filters, loads chunk metadata from MySQL, and returns:

```php
[
  'enabled' => true,
  'contexts' => [
    [
      'sourceId' => 1,
      'chunkId' => 10,
      'sourceType' => 'product',
      'title' => '商品名称',
      'content' => '...',
      'score' => 0.82,
    ],
  ],
  'error' => '',
]
```

---

### Task 4: Admin Knowledge Management

**Files:**
- Create: `D:\Codex Program\GooMooTechWXProgram\php\app\adm\controller\AiKnowledge.php`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\view\adm\ai_knowledge\index.html`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\view\adm\ai_knowledge\add.html`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\view\adm\ai_knowledge\edit.html`
- Create: `D:\Codex Program\GooMooTechWXProgram\php\view\adm\ai_knowledge\chunks.html`
- Update via SQL/admin: `mp_system_nav`

- [ ] **Step 1: Add controller**

Follow existing admin controllers: check `Session::get('systemUserId')` in `__construct()`, use `View::fetch()`, and use `Db::name()`.

Required actions:

```php
index()
add()
edit()
del()
sync()
chunks()
runJobs()
testSearch()
```

- [ ] **Step 2: Add list page**

Show title, source type, app code, status, chunk count, pending jobs, failed jobs, last indexed time, and actions: edit, sync, chunks, delete.

- [ ] **Step 3: Add add/edit forms**

Manual knowledge fields:

```text
title
app_code
content
status
```

On save, call `KnowledgeIndexer::syncManualSource($id)` to enqueue chunks.

- [ ] **Step 4: Add chunks page**

Show chunk text, embedding status, error, qdrant point ID, and last embedded time.

- [ ] **Step 5: Add admin nav SQL**

Add an `AI客服` parent menu and `知识库管理` child menu if they do not already exist. Use existing `system_nav` structure instead of hardcoding menu HTML.

---

### Task 5: Automatic Business Source Sync

**Files:**
- Modify: `D:\Codex Program\GooMooTechWXProgram\php\app\adm\controller\Product.php`
- Modify: `D:\Codex Program\GooMooTechWXProgram\php\app\adm\controller\News.php`
- Create or modify: `D:\Codex Program\GooMooTechWXProgram\php\app\command\RagSync.php`

- [ ] **Step 1: Sync product knowledge on product save**

After successful product add/edit/onSale/offSale, call:

```php
(new KnowledgeIndexer())->syncProduct((int) $productId);
```

Product knowledge should include title, subtitle, type, price, deposit, end time, material, dimensions, copyright, shipping template name, and visible description fields that exist in the table.

- [ ] **Step 2: Sync news knowledge on news save**

After successful news edit, call:

```php
(new KnowledgeIndexer())->syncNews((int) $id);
```

News sources include `after_sale`, `service_agreement`, `about`, and other customer-facing content.

- [ ] **Step 3: Add CLI sync command**

Command responsibilities:

```bash
php think rag:sync --products
php think rag:sync --news
php think rag:sync --jobs=50
php think rag:sync --all
```

The command must be safe to rerun. Recomputed content hashes prevent unnecessary Qdrant writes.

- [ ] **Step 4: Add server cron recommendation**

On server, add:

```bash
*/5 * * * * docker exec php-prod sh -c 'cd /var/www/html && php think rag:sync --jobs=50' >> /root/backups/goomootech/rag-sync.log 2>&1
```

Do not run heavy full sync every five minutes. Full sync is manual after deployment or schema changes.

---

### Task 6: AI Customer Service Retrieval Integration

**Files:**
- Modify: `D:\Codex Program\GooMooTechWXProgram\php\app\api\controller\AiService.php`

- [ ] **Step 1: Retrieve RAG context before answer generation**

In `sendMessage()`, after `buildKnowledgeContext(...)`, call:

```php
$ragResult = (new RagRetriever())->retrieve($content, [
    'scene' => $scene,
    'productId' => $productId,
    'orderId' => $orderId,
    'app_code' => Request::param('appCode', 'goomoo'),
]);
```

Store `ragResult['contexts']` inside `$knowledge['ragContexts']`.

- [ ] **Step 2: Add RAG context to prompts**

Extend `buildKnowledgeLines()` with:

```text
Retrieved Knowledge:
- [product #12 score 0.82] 商品名称: chunk content
- [manual #3 score 0.77] 售后政策: chunk content
```

Keep max context short enough for the current chat model: top 6 chunks, each trimmed to 500 Chinese chars.

- [ ] **Step 3: Strengthen system prompt**

Update the system prompt so the model must:

```text
Only answer from retrieved knowledge, product/order facts, settings, and policy articles.
If retrieved knowledge is weak or missing, say the current information is insufficient and suggest human support.
Do not invent delivery dates, refund promises, product specs, discounts, or compensation.
```

- [ ] **Step 4: Persist retrieval trace**

When writing `ai_service_message`, store:

```php
'retrievalContext' => json_encode($ragResult['contexts'], JSON_UNESCAPED_UNICODE),
'retrievalSourceIds' => implode(',', array_unique(array_column($ragResult['contexts'], 'sourceId'))),
```

If the columns do not exist yet, persistence should fail softly as current code already does for missing tables.

---

### Task 7: Verification And Deployment Runbook

**Files:**
- Modify: `D:\Codex Program\GooMooTechWXProgram\docs\08-AI客服一期开发清单.md`
- Create: `D:\Codex Program\GooMooTechWXProgram\docs\09-RAG客服部署与运维.md`

- [ ] **Step 1: Local syntax checks**

Run:

```bash
php -l php/app/common/service/RagConfig.php
php -l php/app/common/service/EmbeddingClient.php
php -l php/app/common/service/QdrantClient.php
php -l php/app/common/service/KnowledgeChunker.php
php -l php/app/common/service/KnowledgeIndexer.php
php -l php/app/common/service/RagRetriever.php
php -l php/app/api/controller/AiService.php
php -l php/app/adm/controller/AiKnowledge.php
```

Expected: each prints `No syntax errors detected`.

- [ ] **Step 2: Server deploy sequence**

Use this order:

```bash
/root/scripts/backup-goomootech.sh
cd /root/deploy/shanghaicatjump-repo
git pull
./deploy/deploy.sh php
docker compose -f DockerFiles/docker-compose.prod.yml up -d qdrant
docker exec -i mysql-prod sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" goomoo_prod' < php/database/patch_20260623_rag_customer_service.sql
docker exec php-prod sh -c 'cd /var/www/html && php think rag:sync --all'
docker exec php-prod sh -c 'cd /var/www/html && php think rag:sync --jobs=100'
```

- [ ] **Step 3: Server local config**

Create `/root/deploy/php/config/rag.local.php` on the server only:

```php
<?php

return [
    'enabled' => true,
    'qdrant_url' => 'http://qdrant:6333',
    'qdrant_api_key' => 'SERVER_ONLY_SECRET',
    'collection' => 'goomootech_customer_service',
    'embedding_base_url' => 'https://YOUR_MODEL_PROVIDER/v1',
    'embedding_api_key' => 'SERVER_ONLY_EMBEDDING_KEY',
    'embedding_model' => 'text-embedding-3-small',
    'embedding_dimension' => 1536,
    'embedding_timeout' => 20,
    'search_limit' => 6,
    'score_threshold' => 0.35,
];
```

- [ ] **Step 4: End-to-end checks**

Check Qdrant only from server/container network:

```bash
docker exec php-prod sh -c 'curl -s -H "api-key: SERVER_ONLY_SECRET" http://qdrant:6333/collections'
```

Ask AI customer service from product page:

```text
这个商品什么时候发货？
```

Expected: answer uses product facts or says information is insufficient; it does not invent unsupported dates.

Ask after-sale from order page:

```text
我的订单物流到哪里了？
```

Expected: answer uses order freight fields if present, otherwise suggests human support.

- [ ] **Step 5: Backups**

Update `/root/scripts/backup-goomootech.sh` so backups include:

```text
/root/deploy/php/config/rag.local.php
/data/qdrant/storage or Qdrant snapshot output
```

Keep Qdrant backups outside `/root/deploy/php`.

---

## Self-Review

- Spec coverage: The plan covers Qdrant deployment, local config, MySQL schema, business and manual knowledge sources, chunking, embedding, vector upsert/search, AI answer integration, admin management, server cron, and backup changes.
- Placeholder scan: No `TBD`, `TODO`, or vague "handle later" steps remain. The only secrets are explicit server-only placeholders that must not be committed.
- Type consistency: Service names and method signatures are consistent across tasks: `KnowledgeIndexer`, `RagRetriever`, `QdrantClient`, and `EmbeddingClient`.
- Scope check: This is one coherent RAG MVP. It intentionally excludes public Qdrant access, streaming answers, multi-tenant vector collections, rerankers, and uploaded document parsing.
