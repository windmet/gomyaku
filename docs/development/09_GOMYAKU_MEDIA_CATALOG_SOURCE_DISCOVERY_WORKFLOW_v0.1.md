# GOMYAKU Media Catalog / Source Discovery Workflow v0.1
## 将频道级媒体索引正式纳入 GOMYAKU × 前情帖开发路径

> Status: Proposed Development Path
> Scope: GOMYAKU Authoring / Source Discovery / Media Inventory / Qianqingtie Publication Projection
> First Real Fixture: 小松昌平 YouTube `@komachoe/streams`
>
> 本文不是独立“小松视频爬虫”设计稿。
>
> 它定义的是：
>
> **GOMYAKU 如何从“已经知道某个具体视频”继续向上扩展，成为能够发现、维护、分类和选择媒体来源的 Authoring System。**

---

# 0. Executive Decision

这项能力正式进入 GOMYAKU 开发路线。

原先 GOMYAKU 的生产链主要从：

```text
已知 Media / Source
        ↓
Acquisition
        ↓
Transcript / Evidence
        ↓
Review
        ↓
Canonical Event
        ↓
Publication
```

开始。

但实际工作中还有一个更前置的问题：

> **我们经常需要先人工去 YouTube 找“到底有哪些视频”。**

因此 v0.1 正式新增：

```text
DISCOVERY
        ↓
CATALOG
        ↓
ACQUISITION
        ↓
TRANSCRIPTION
        ↓
EDITORIAL
        ↓
COMPILE
        ↓
QIANQINGTIE
```

Media Catalog 不是辅助脚本，而是：

> **GOMYAKU Authoring Pipeline 的最上游 Source Discovery Layer。**

---

# 1. 为什么现在应该做

当前真实工作仍存在：

```text
想起某一期
↓
打开 YouTube
↓
手工找视频
↓
复制 URL
↓
下载
↓
跑 Whisper
↓
再开始 Project
```

对于拥有数百条历史直播的视频频道，这种方法的问题是：

1. 无法可靠知道“频道里到底还有什么”；
2. 新旧视频无法增量追踪；
3. 同类节目 / 游戏 / 合作直播需要反复搜索；
4. 人物参与情况无法系统查询；
5. 下载和转写状态只能靠人脑记忆；
6. 创建 Project 时重复填写 URL / 标题 / 日期 / duration；
7. 未来 Agent 无法在“所有候选媒体”中做自动筛选。

所以新的目标应该是：

```text
YouTube / Other Provider
        ↓
Persistent Catalog
        ↓
query / classify / select
        ↓
materialize into Project
```

---

# 2. 三层 Ownership

这项能力必须严格遵守现有分仓边界。

## 2.1 GOMYAKU Repository

负责：

```text
Media Catalog model
Provider interface
YouTube provider adapter
sync / merge logic
classification engine
query engine
acquisition queue
catalog validation
export adapters
Project materialization contract
```

GOMYAKU 不知道：

```text
小松昌平
こまちょえ生ラジオ
原神
PUBG
寺島惇太
前情帖
```

这些必须来自 Workspace config / Publication data。

## 2.2 Local Authoring Workspace

真实小松频道 Catalog 放在：

```text
E:\AI_Subtitle_Studio\01_Catalogs\komachoe-youtube
```

它拥有：

```text
实际频道 URL
所有视频 metadata
分类规则
人工 override
下载状态
转写状态
本地音频路径
yt-dlp archive
raw yt-dlp observations
临时报表
```

这里可以出现本地路径、私有状态、未确认分类、未确认人物、失败任务；这些都不能进入前情帖 public repository。

## 2.3 Qianqingtie Repository

只拥有：

```text
public-safe catalog projection
reviewed series / category
reader-facing copy
public URL
People / Project links
publication status
```

第一阶段可以只建立：

```text
小松昌平 YouTube 配信索引
status: draft
```

不需要立即公开数百条完整 metadata。

---

# 3. Overall Architecture

```text
                           YouTube
                              │
                              ▼
                  ┌────────────────────┐
                  │ Provider Adapter   │
                  │ yt-dlp / future    │
                  └─────────┬──────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────┐
│ LOCAL GOMYAKU CATALOG WORKSPACE                  │
│                                                  │
│ items.jsonl                                      │
│ classifications.jsonl                            │
│ overrides.yaml                                   │
│ work-state.jsonl / future state.sqlite           │
│ raw/yt-dlp                                       │
│ generated/                                       │
│ yt-dlp-archive.txt                               │
└───────────────────────┬──────────────────────────┘
                        │ review / freeze / select
                        ▼
┌──────────────────────────────────────────────────┐
│ GOMYAKU CANONICAL MEDIA CATALOG                  │
│ stable metadata / reviewed classification        │
│ reviewed people / series / topic refs            │
│ public-safe provenance                           │
└───────────────────────┬──────────────────────────┘
                        │ publication projection
                        ▼
┌──────────────────────────────────────────────────┐
│ QIANQINGTIE                                      │
│ YouTube Index / Series / Year / People / Project │
└──────────────────────────────────────────────────┘
```

---

# 4. Core Terminology

## Catalog

一个可以增量同步的媒体集合，例如：

```text
小松昌平 YouTube Streams
```

未来也可以是 YouTube playlist、X Spaces archive、Niconico series、TwitCasting archive、Podcast feed 或公开活动 archive page。

## Media Item

Provider 上的一个稳定媒体对象，例如：

```text
youtube:abcdefghijk
```

Media Item 只描述：

> **来源平台客观存在什么。**

## Classification

编辑层对于 Media Item 的理解：

```text
category
series
game
format
people
topics
tags
```

Classification 不是 Provider metadata。

## Work State

本地生产状态：

```text
audio downloaded?
chat downloaded?
baseline transcript?
review complete?
Project materialized?
```

只属于 Authoring Workspace。

## Public Projection

从 Catalog 中筛选、裁决后允许进入 Publication 的子集。

---

# 5. Workspace Directory

建议：

```text
E:\AI_Subtitle_Studio
│
├─ 00_Workflow
│
├─ 01_Catalogs
│  └─ komachoe-youtube
│     ├─ catalog.yaml
│     ├─ items.jsonl
│     ├─ classifications.jsonl
│     ├─ overrides.yaml
│     ├─ work-state.jsonl
│     ├─ yt-dlp-archive.txt
│     ├─ raw
│     │  └─ yt-dlp
│     └─ generated
│        ├─ videos.xlsx
│        ├─ index.md
│        ├─ catalog-report.md
│        └─ public-candidates.json
│
└─ 02_Projects
   ├─ こまちょえ生ラジオ（2026.03.09）
   └─ こまちょえ生ラジオ（2026.04.25）
```

---

# 6. Catalog vs Project

必须明确：

```text
Catalog
= 整个来源集合 / 频道

Project
= 被选中进行深度资料化的一场媒体或一组媒体
```

因此：

```text
Media Item
        ↓ select
Project
```

而不是：

```text
Project
        ↓ 再去找 Media
```

未来 Project 可以保存：

```yaml
origin:
  catalog: komachoe-youtube
  mediaItem: youtube:abcdefghijk
```

从 Catalog 自动继承 URL、title、publishedAt、duration、channel、provider。

---

# 7. Media Item Schema

推荐：

```yaml
schemaVersion: 1
id: youtube:abcdefghijk
provider: youtube
source:
  channelId: UCxxxxxxxx
  channelName: 小松昌平
  tab: streams
url: https://www.youtube.com/watch?v=abcdefghijk
title: こまちょえ生ラジオ #45
description: ...
publishedAt: 2026-08-01T12:00:00+09:00
releaseTimestamp: 1780000000
durationMs: 7321000
mediaType: livestream
liveStatus: was_live
availability:
  status: available
observed:
  firstSeenAt: 2026-08-15T...
  lastCheckedAt: 2026-08-15T...
raw:
  providerObservationRef: raw/yt-dlp/abcdefghijk.json
```

---

# 8. Classification Schema

Classification 必须独立：

```yaml
item: youtube:abcdefghijk
primaryCategory: radio
series:
  id: komachoe-radio
  label: こまちょえ生ラジオ
game: null
format:
  - solo
people:
  - personId: komatsu-shohei
    role: host
topics: []
tags: []
classification:
  source: rule
  ruleId: komachoe-radio-title
  confidence: 1
  reviewed: true
```

---

# 9. Work State Schema

本地专用：

```yaml
item: youtube:abcdefghijk
metadata:
  status: complete
audio:
  status: downloaded
  path: E:\AI_Subtitle_Studio\...
  downloadedAt: ...
chat:
  status: missing
comments:
  status: missing
transcript:
  status: baseline-complete
  backend: subtitle-edit
  path: E:\...
sourceEngineering:
  status: open
project:
  status: materialized
  projectId: komachoe-20260309
publication:
  candidate: true
```

规则：

> Work State 永不进入 public package。

---

# 10. 为什么不把所有内容塞进一个 videos.jsonl

进入 GOMYAKU 后应拆成：

```text
items.jsonl
classifications.jsonl
work-state.jsonl
```

因为：

```text
Media Item
= stable / portable

Classification
= editorial / revisable

Work State
= local / mutable / private
```

未来 state 规模增大时再迁 `state.sqlite`。

---

# 11. JSONL / XLSX / MD 的角色

## JSONL

机器主数据：

```text
items.jsonl
classifications.jsonl
```

适合 Agent、Python、增量 merge、Git diff。

## XLSX

只作为 Human View，自动生成 `videos.xlsx`。

建议列：

```text
日期 / 标题 / Category / Series / Game / Format / People /
URL / Audio / Transcript / Project / Review
```

**XLSX 不是 source of truth。**

## Markdown

自动生成 `index.md`，用于快速浏览、GitHub 查看、人工分类检查。

**MD 也不是 source of truth。**

---

# 12. Provider Interface

GOMYAKU 不应该写：

```text
sync_komachoe.py
```

而应该有 `CatalogProvider`：

```ts
interface CatalogProvider {
  discover(catalog): AsyncIterable<ProviderStub>;
  fetchMetadata(itemId): Promise<ProviderObservation>;
  normalize(observation): MediaItem;
}
```

第一实现：

```text
YouTubeCatalogProvider
```

---

# 13. YouTube Sync Strategy

第一版采用两阶段。

## Stage A — Fast Discovery

使用 yt-dlp flat scan：

```text
channel / streams
        ↓
ID + title + partial metadata
```

用途：快速拿完整 ID 集合，发现新增、删除或 availability 变化。

不要把 flat metadata 当最终完整 metadata。

## Stage B — Full Metadata

只对：

```text
new item
missing metadata
explicit refresh
```

做完整 extraction。

记录：

```text
id
url
title
description
upload/release date
timestamp
duration
channel
channel_id
uploader
thumbnail
live status
tags
categories
```

---

# 14. Sync Merge Rule

每次 sync：

```text
Provider observation
        ↓ normalize
Existing Media Item
        ↓ compare
NEW / UPDATE / SAME / MISSING
```

输出 Catalog Sync Report，例如：

```text
Scanned: 428
Existing: 421
NEW: 7
UPDATED: 3
UNCHANGED: 411
MISSING FROM CURRENT TAB: 0
FULL METADATA FAILED: 1
```

---

# 15. Raw Observation Rule

建议保留：

```text
raw/yt-dlp/<video-id>.json
```

但只属于 Local Workspace。

Media Item 是 normalized layer，后续业务逻辑不应依赖 yt-dlp 完整原始 JSON 的结构。

---

# 16. Classification Pipeline

必须坚持：

```text
RULE
        ↓
AI ASSIST
        ↓
HUMAN OVERRIDE
```

不是让 LLM 每次自由分类。

---

# 17. Rule Schema

GOMYAKU owns rule schema / evaluator / priority / conflict detection；Workspace owns actual rules。

例如：

```yaml
rules:
  - id: komachoe-radio
    priority: 100
    when:
      titleContains:
        - こまちょえ生ラジオ
    set:
      primaryCategory: radio
      series:
        id: komachoe-radio
        label: こまちょえ生ラジオ

  - id: game-genshin
    priority: 80
    when:
      titleContains:
        - 原神
        - Genshin
    set:
      primaryCategory: game
      game: 原神

  - id: game-pubg
    priority: 80
    when:
      titleContains:
        - PUBG
    set:
      primaryCategory: game
      game: PUBG

  - id: collaboration
    priority: 50
    when:
      titleRegex:
        - コラボ
        - ゲスト
    add:
      format:
        - collaboration
```

---

# 18. Override

任何人工修正：

```yaml
youtube:abcdefghijk:
  primaryCategory: event
  series: null
  reason: title rule misclassified anniversary stream
```

Override 永远优先于 rule。

---

# 19. Classification Diff

每次重跑分类不能静默覆盖。

输出：

```text
NEW
CHANGED
CONFLICT
UNCLASSIFIED
```

例如：

```text
youtube:xxx
radio → event
reason: manual override changed
```

---

# 20. AI Assist

第一阶段不实现自动 AI 分类。

未来只处理：

```text
unclassified
rule conflict
ambiguous title
person candidate
unknown game / series
```

AI 输出只能是 candidate classification，不能自动覆盖人工 override。

---

# 21. People Extraction

人物应该独立。

例如标题：

```text
PUBG LITE 雑談プレイ【寺島惇太studioコラボ】
```

可以得到：

```yaml
peopleCandidates:
  - label: 寺島惇太
    source: title
    confidence: high
```

Identity resolve 后：

```yaml
people:
  - personId: terashima-junta
    role: guest
```

注意：

> Media metadata presence ≠ material Person Context change。

Catalog 可以产生 Media Appearance，但不自动修改 Global Person deck / Relationship Context；真正 Profile 更新仍走 Person Context Diff。

---

# 22. Series / Game / Topic

不要把所有分类都塞进 category。

推荐：

```text
primaryCategory
series
game
format[]
people[]
topics[]
tags[]
```

例如：

```yaml
primaryCategory: game
game: PUBG LITE
format:
  - collaboration
people:
  - terashima-junta
```

---

# 23. Catalog Query

Media Catalog 的核心价值不是“保存列表”，而是可查询。

第一版至少支持：

```text
provider
date range
category
series
game
format
person
audio status
transcript status
project status
publication candidate
```

例如：

```text
series = komachoe-radio
AND transcript.status = missing
```

---

# 24. CLI Development Path

第一阶段建议增加：

```text
gomyaku catalog init
gomyaku catalog sync
gomyaku catalog classify
gomyaku catalog status
gomyaku catalog export
```

后续：

```text
gomyaku catalog query
gomyaku acquire plan
gomyaku project materialize
```

---

# 25. `catalog init`

示意：

```powershell
gomyaku catalog init `
  --provider youtube `
  --source "https://www.youtube.com/@komachoe/streams" `
  --workspace "E:\AI_Subtitle_Studio\01_Catalogs\komachoe-youtube"
```

生成：

```text
catalog.yaml
items.jsonl
classifications.jsonl
overrides.yaml
work-state.jsonl
raw/
generated/
```

---

# 26. `catalog sync`

职责：

```text
discover
normalize
full metadata
merge
report
```

不下载音频。

---

# 27. `catalog classify`

职责：

```text
rules
overrides
diff
review queue
```

输出：

```text
classifications.jsonl
generated/classification-report.md
```

---

# 28. `catalog status`

示例：

```text
Catalog: komachoe-youtube
Items             428
Metadata complete 426
Unavailable         2
Radio              72
Game              211
Event               16
Collaboration       48
Misc                76
Unclassified         5
Audio downloaded    24
Baseline transcript 11
Projects              3
Publication candidates 18
```

---

# 29. `catalog export`

第一版：

```text
xlsx
markdown
public-candidates.json
```

未来再增加 portable catalog package。

---

# 30. Acquisition

Catalog 不应该自动下载所有媒体。

正确流程：

```text
query / select
        ↓
Acquisition Plan
        ↓
explicit execute
```

第一版甚至只需要生成：

```text
download-plan.json
```

---

# 31. Audio Acquisition

未来：

```text
gomyaku catalog query
        ↓
selection
        ↓
acquire audio
        ↓
yt-dlp
        ↓
Work State
```

继续使用 `yt-dlp --download-archive` 作为第二层防重。

---

# 32. yt-dlp Archive Ownership

```text
yt-dlp-archive.txt
```

属于 Local Workspace，不进入 GOMYAKU repo 或 Qianqingtie repo。

---

# 33. Project Materialization

Media Catalog 与现有 `02_Projects` 的连接点。

示意：

```powershell
gomyaku project materialize `
  --catalog komachoe-youtube `
  --item youtube:abcdefghijk
```

生成：

```text
02_Projects/<title>/
└─ .gomyaku/project.yaml
```

并自动继承 title / url / provider / publishedAt / duration / catalog origin。

---

# 34. Materialization 不应该做什么

不自动：

```text
下载所有 source
跑 Whisper
生成 Event
发布前情帖
```

它只是从 Source Discovery 进入 Project Authoring。

---

# 35. Integration With Existing Authoring Pipeline

```text
DISCOVERY
│
├─ Catalog Sync
├─ Metadata
├─ Classification
└─ Query
│
▼
ACQUISITION
│
├─ media
├─ audio
├─ chat
├─ comments
└─ Source Freeze
│
▼
TRANSCRIPTION
│
├─ Canonical Skeleton
├─ Independent RAW
├─ Automated Audit
├─ Residual
└─ Source-Engineering Freeze
│
▼
EDITORIAL
│
├─ Canonical Event Inventory
├─ Person Pass
├─ Context Diff
├─ optional Thread
└─ Reader Copy
│
▼
COMPILE
│
▼
QIANQINGTIE
```

---

# 36. Qianqingtie Phase 1 — Placeholder Only

第一轮站点不应该导入全部视频。

只建立：

```text
小松昌平 YouTube 配信索引
status: draft
```

说明：

```text
Source: 小松昌平 YouTube
Scope: Streams
Managed by: GOMYAKU Media Catalog
Reader status: Under construction
```

---

# 37. 不要强行一个 Video = 一个现有 Index Entry

当前 Qianqingtie `Index` 是编辑型 chronology。

频道 Media Catalog 最终可能需要：

```text
Catalog
├─ Series
├─ Game
├─ Year
├─ Person
└─ Project links
```

不一定适合 `Index.entries[]`。

第一阶段不要为了复用现有 schema 把全部 Media Item 强塞成 Index Entry。

---

# 38. Future Publication Primitive

跑完真实数据后，再决定：

## Option A

继续复用 `Index`。

## Option B

新增 `Catalog` Reader primitive。

当前只记录需求，不实现。

---

# 39. Public Projection Contract

未来从 Catalog 导向前情帖的包只能包含：

```text
public provider URL
title
date
duration
reviewed category
reviewed series/game
reviewed People refs
Project ref
publication status
```

禁止：

```text
local path
download status
ASR status
raw yt-dlp JSON
private notes
AI candidate
unreviewed person
```

---

# 40. Qianqingtie Reader Questions

只有真实 Catalog 跑完以后再决定：

```text
是否按年份浏览？
是否按 Series？
是否按 Game？
是否 Person 反向查询？
Project 是否显示“已资料化”？
是否显示 unavailable historical item？
是否要搜索 Description？
```

---

# 41. First Vertical Slice

第一轮只做：

```text
1. Catalog Workspace Contract
2. YouTube Provider Adapter
3. @komachoe/streams Fast Discovery
4. Full Metadata Fetch
5. items.jsonl
6. Rules Classification
7. classifications.jsonl
8. XLSX Export
9. Catalog Report
```

做到这里：**STOP。**

---

# 42. First Vertical Slice Non-Goals

暂时不要：

```text
× 批量下载全部音频
× 自动 Whisper
× AI 自动分类
× SQLite
× 400-item Qianqingtie Reader
× Relationship Graph
× Cloud database
× Web dashboard
× background daemon
```

---

# 43. Real Fixture Acceptance

第一次真实运行 `@komachoe/streams` 后必须回答：

```text
总可枚举数
完整 metadata 成功数
metadata 失败数
日期缺失数
unavailable/private 数
rule classification coverage
unknown 数
distinct series 数
distinct game 数
person candidate 数
```

并生成：

```text
items.jsonl
classifications.jsonl
videos.xlsx
catalog-report.md
```

---

# 44. Data Quality Checks

至少：

```text
unique item ID
valid provider URL
no duplicate video
normalized dates
duration non-negative
classification references existing item
override references existing item
work state references existing item
local path never enters canonical export
```

---

# 45. Provider Failure Policy

如果 yt-dlp 某条 metadata 失败：

```text
不要删除已有 Media Item
不要自动标 unavailable
```

而是记录：

```yaml
metadataRefresh:
  status: failed
  lastError:
  lastAttempt:
```

只有明确 provider evidence 才改变 availability。

---

# 46. Deleted / Private / Unlisted Handling

Catalog 是历史索引，不只是“当前可播放列表”。

未来应区分：

```text
available
private
deleted
unavailable
unknown
```

历史 item 后续不可见时，不直接删除记录。

---

# 47. Metadata Mutation

YouTube 标题 / description 可能变化。

第一版保留当前 normalized metadata；Raw observations 负责 provenance。

完整 metadata history 以后按需求再加。

---

# 48. Catalog Snapshot

Catalog 本身是 living inventory，不需要永久冻结整个频道。

但每次用于 Publication / Research 时，应可以建立：

```yaml
catalog: komachoe-youtube
snapshotId: 2026-08-15-r1
itemCount: 428
generatedAt: ...
```

这样可以追溯：

> “我们当时是基于哪个频道状态做分类的。”

---

# 49. Catalog Snapshot vs Project Source Set

```text
Catalog Snapshot
= discovery inventory state

Project Source Set
= editor actually reviewed evidence state
```

不要混为一谈。

---

# 50. Git Ownership

## GOMYAKU repo

可以提交：

```text
provider adapter
catalog schema
classifier
exporter
synthetic fixtures
generic docs
```

不能提交：

```text
完整 komachoe items.jsonl
actual local work state
audio state
```

## Qianqingtie repo

可以提交：

```text
reviewed public projection
Reader copy
public series/categories
public Person/Project links
```

不能提交：

```text
raw catalog
download state
local transcript state
```

## Local only

```text
items.jsonl full
classifications working copy
work-state
raw provider data
yt-dlp archive
audio
transcripts
```

第一版不要新增第三个长期仓库。

---

# 51. GOMYAKU Repository Development Path

当前 GOMYAKU 已有 model / projection / validation / compiler / cli。

Media Catalog 应作为第一个真正的 Authoring vertical slice。

建议逐步新增：

```text
src/
├─ catalog/
│  ├─ model/
│  ├─ providers/
│  │  └─ youtube/
│  ├─ sync/
│  ├─ classify/
│  ├─ query/
│  └─ export/
│
└─ authoring/
   └─ workspace/
```

不要第一天建完整最终目录树；按真实实现增长。

---

# 52. Suggested GOMYAKU Commits

```text
CAT-00 docs: define media catalog authoring contract
CAT-01 feat: add catalog workspace model
CAT-02 feat: add provider-independent MediaItem normalization
CAT-03 feat: add YouTube yt-dlp discovery adapter
CAT-04 feat: add incremental catalog merge
CAT-05 feat: add rule-based classification engine
CAT-06 feat: add catalog status and diff report
CAT-07 feat: add XLSX / Markdown export
CAT-08 test: add synthetic YouTube catalog fixture
CAT-09 docs: record real komachoe fixture acceptance
```

---

# 53. Qianqingtie Development Path

第一阶段只做：

```text
PUB-CAT-00 docs: register Media Catalog as future publication source
PUB-CAT-01 content: add draft Komachoe YouTube catalog placeholder
```

不要马上做 Reader 大功能。

等真实数据报告出来以后：

```text
PUB-CAT-02 design: choose Index reuse vs Catalog primitive
PUB-CAT-03 reader: implement minimal reviewed projection
PUB-CAT-04 people: optionally link reviewed Media Appearance
```

---

# 54. Agent Boundary — GOMYAKU Task

Coding Agent 工作于 `gomyaku` 时：

```text
你正在实现 generic Media Catalog workflow。

禁止：
- 写死 @komachoe
- 写死日语节目名
- 引入前情帖 corpus
- 把本地绝对路径设为 default
- 自动下载全部视频
- 自动发布

真实小松频道只能作为外部 acceptance fixture。
Core tests 使用 synthetic catalog fixture。
```

---

# 55. Agent Boundary — Local Workspace Task

Agent 操作真实 Catalog 时：

```text
允许读取：
- catalog.yaml
- items.jsonl
- rules
- overrides
- raw yt-dlp metadata

禁止：
- 修改 GOMYAKU source code，除非发现 generic defect
- 直接修改 Qianqingtie publication
- 将 local path 导出到 public projection
```

发现 generic defect：

```text
STOP
→ upstream proposal to GOMYAKU
```

---

# 56. Agent Boundary — Qianqingtie Task

Agent 在 Qianqingtie：

```text
只能消费 reviewed public projection。

禁止：
- 重新调用 yt-dlp
- 读取 E:\AI_Subtitle_Studio
- 读取 raw catalog
- 根据视频标题自行重新分类
- 修改 download/transcript state
```

---

# 57. Human Review Inbox

Catalog 理想的人类 Inbox：

```text
7 new videos
5 unclassified
2 conflicting classifications
3 person identity candidates
1 unavailable status change
```

而不是：

> 请人工看完 428 条标题。

---

# 58. Authoring Cost Metrics

新增：

```text
catalog_item_count
sync_new_items
full_metadata_requests
classification_rule_coverage
classification_review_count
person_identity_review_count
manual_override_count
project_materialization_count
```

长期尤其关注：

```text
classification_review_count / new_items
```

目标：随规则成熟逐步下降。

---

# 59. Relationship to People Context Workflow

Catalog Media Appearance 可以增加：

```text
Person appeared in Media Item
```

但它只是 low-level appearance evidence。

如果某次媒体真的进入 Project / Public Record 并产生重要语境，再走：

```text
Person Appearance
Context Ledger
Profile Diff
```

因此：

```text
Catalog People
≠
Global People Profile
```

---

# 60. Relationship to Search

未来 Catalog 可支持 internal authoring search。

Qianqingtie 是否公开搜索这些 Media Items，是 publication decision。

不要因为内部 Catalog 可搜索就自动全公开。

---

# 61. Relationship to Scheduler / Automation

第一版 manual sync command 足够。

未来稳定后再考虑 scheduled catalog sync，不作为 v0.1 requirement。

---

# 62. Security / Privacy

Public Projection 必须验证不含：

```text
Windows paths
API key
cookies
browser profile path
download archive path
private note
full raw provider JSON
```

yt-dlp cookies / auth config 绝不能进入 Git。

---

# 63. Why No Third Repository

目前不要创建 `komachoe-video-index`。

因为：

```text
generic code → GOMYAKU
actual working data → Local Workspace
public result → Qianqingtie
```

已经有清晰归属。

只有未来出现多人协作维护真实 Catalog、需要独立权限、数据量巨大或脱离单机 Workspace，才考虑单独 private data repository。

---

# 64. Roadmap Integration

更新后的整体开发路线：

```text
CURRENT
│
├─ GOMYAKU Core Extraction ✅
├─ Qianqingtie Consumer Cutover ✅
│
▼
MILESTONE A
Local Development Handoff
│
▼
MILESTONE B
Media Catalog / Source Discovery v0.1   ← 本文
│
▼
MILESTONE C
Local Authoring Bootstrap
 doctor / scan / status
│
▼
MILESTONE D
Acquisition Workflow
 media / audio / chat / comments
│
▼
MILESTONE E
Transcript Evidence Pipeline
 skeleton / independent RAW / audit / residual
│
▼
MILESTONE F
Source-Engineering Freeze
│
▼
MILESTONE G
People Context / Appearance Diff
│
▼
MILESTONE H
Canonical Compiler → Qianqingtie
│
▼
MILESTONE I
Next Project / Second X archaeology acceptance
│
▼
MILESTONE J
Deployment / Publication Gate
```

Media Catalog 应排在：

> **Local Authoring Bootstrap 之前，或作为其第一项真实 Authoring Vertical Slice。**

---

# 65. Recommended Immediate Work Order

## Step 1

在 GOMYAKU 增加本文档 / Catalog contract。

## Step 2

实现 synthetic fixture，不先爬真实频道。

## Step 3

实现 YouTube provider discovery。

## Step 4

本地创建：

```text
01_Catalogs/komachoe-youtube
```

## Step 5

首次运行 `@komachoe/streams`，只做 metadata。

## Step 6

审计真实标题分布，从真实数据反推 `rules.yaml`，不要现在凭印象手写所有游戏分类。

## Step 7

生成：

```text
videos.xlsx
catalog-report.md
```

人工检查。

## Step 8

建立 Qianqingtie draft placeholder。

## Step 9

暂停，重新审计：

```text
Index vs Catalog
Reader shape
People reverse links
Project materialization
```

---

# 66. First Release Gate

`Media Catalog v0.1` 完成必须满足：

```text
[ ] GOMYAKU 不含真实 Komachoe corpus
[ ] YouTube provider 可被其他频道复用
[ ] Catalog sync 为增量
[ ] Existing Item 不因一次 fetch 失败被删除
[ ] Media / Classification / Work State 分离
[ ] Rules + overrides 可重跑
[ ] JSONL 是主数据
[ ] XLSX 是 generated view
[ ] local path 不进入 canonical export
[ ] 真实 @komachoe/streams 完成一次全量 fixture
[ ] catalog-report 生成
[ ] Qianqingtie 只建立 draft public placeholder
```

---

# 67. Success Definition

成功不是：

```text
把所有视频全下载了
```

也不是：

```text
前情帖一次性显示所有视频
```

成功应该是：

> **以后任何 Agent / Human 都可以先问 Catalog“我们有哪些媒体”，再选择真正值得下载、转写和建 Project 的对象。**

---

# 68. Final Product Principle

GOMYAKU 以前解决：

> **已知一场媒体以后，如何把它变成档案。**

Media Catalog 补上的是：

> **在我们还不知道下一场该看什么之前，如何让来源本身先变成可查询、可追踪、可选择的资料资产。**

最终生产方式从：

```text
想起来
→ 手工搜索
→ 复制 URL
→ 下载
```

升级为：

```text
Catalog Sync
→ Query
→ Select
→ Materialize
→ Author
→ Publish
```

这就是 Media Catalog 加入 GOMYAKU 开发路径的真正意义。
