# Graph Report - divya-swing-engine  (2026-04-26)

## Corpus Check
- 179 files · ~110,351 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 677 nodes · 975 edges · 27 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `update()` - 20 edges
2. `GET()` - 19 edges
3. `POST()` - 16 edges
4. `getTodayDateString()` - 13 edges
5. `validateRow()` - 12 edges
6. `buildInvestingSnapshot()` - 11 edges
7. `safeFinishScanLog()` - 11 edges
8. `tradeInstructionCard()` - 10 edges
9. `weeklyDigest()` - 10 edges
10. `jsonResponse()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `handleSaveHolding()` --calls--> `update()`  [INFERRED]
  app/investing/portfolio/page.tsx → components/investing/StockAnalysisForm.tsx
- `handleSaveItem()` --calls--> `update()`  [INFERRED]
  app/investing/watchlist/page.tsx → components/investing/StockAnalysisForm.tsx
- `handleSaveReview()` --calls--> `update()`  [INFERRED]
  app/investing/reviews/page.tsx → components/investing/StockAnalysisForm.tsx
- `handleSaveEntry()` --calls--> `update()`  [INFERRED]
  app/investing/journal/page.tsx → components/investing/StockAnalysisForm.tsx
- `handleSaveAnalysis()` --calls--> `update()`  [INFERRED]
  app/investing/analysis/page.tsx → components/investing/StockAnalysisForm.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (29): addMonths(), analysisToWatchlistSeed(), buildSavedViewUrl(), closeSheet(), formatCurrency(), formatDate(), formatDateTime(), formatPercent() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (31): requireEnv(), constantTimeEqual(), validateCronSecret(), buildDedupeKey(), checkDedupe(), getErrorMessage(), recordNotification(), resolveNotification() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (20): buildMoatManagementPrompt(), getTodayDateString(), handleSubmit(), parseNullableNumber(), toFormValues(), isObject(), parseConfidence(), parseDimension() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (16): evaluateTicker(), loadVerdictConfig(), proxy(), runRedFlags(), buildCategoryScore(), clampScore(), getValuationOverlay(), runQuantitativeScorecard() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (20): buildPrefilledAnalysis(), buildPrefilledHolding(), buildPrefilledJournalEntry(), buildPrefilledWatchlistItem(), toNullableNumber(), GET(), isValidTicker(), parseCsvLine() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (18): asNumber(), handleArchiveWatchlistItem(), handleDismiss(), handleExecuteBuy(), handleExecuteSell(), handleKeepWatchlistCandidate(), handleRemoveWatchlistCandidate(), handleResetStreak() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (21): handleSaveAnalysis(), clamp(), isObject(), normalizeDimension(), runBusinessUnderstandingScore(), isNumber(), runConfidenceScore(), clampScore() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (22): buildInFilter(), createSupabaseServerClient(), deriveIbdGroupZone(), deriveLikelyFailureType(), deriveMarketPhase(), deriveWatchlistGroup(), isBooleanOrNull(), isNumberOrNull() (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (17): buildFairValueRange(), runOwnerEarningsValuation(), runSingleOwnerEarnings(), getValuationProfile(), isNumber(), runComparableValuation(), runUsingBook(), runUsingEbit() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.28
Nodes (12): fmtMoney(), fmtPercent(), fmtPrice(), inboxUrl(), layout(), stopAlert(), fmtMoney(), fmtPercent() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (7): buildAuditPrompt(), copyTextWithFallback(), handleApply(), handleCopy(), handleCopyAuditPrompt(), handleCopyNASDAQ(), handleCopySP500()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (10): average(), buildInvestingSnapshot(), cagrFromSeries(), isStrictlyDeclining(), mapSector(), percentOrNull(), ratioOrNull(), safeDivide() (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.42
Nodes (9): fmtDate(), fmtEntryZone(), fmtMoney(), fmtPercent(), fmtPrice(), fmtRiskPct(), inboxUrl(), layout() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.31
Nodes (6): formatMarketWindow(), inboxUrl(), infoBlock(), layout(), summaryCell(), tradeMonitorReport()

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (8): mapQuoteToPrice(), mapSummaryToFundamentals(), readNumber(), fetchFundamentals(), fetchMarketIndex(), fetchPrice(), fetchQuoteSafe(), getErrorMessage()

### Community 16 - "Community 16"
Cohesion: 0.36
Nodes (5): buildFredUrl(), fredFetch(), getFredApiKey(), getSeries(), parseFredValue()

### Community 17 - "Community 17"
Cohesion: 0.57
Nodes (7): fetchFundamentals(), fetchMarketIndex(), fetchPrice(), getErrorMessage(), getRecentTradingDateRange(), isRecord(), unwrapResponse()

### Community 19 - "Community 19"
Cohesion: 0.48
Nodes (5): inboxUrl(), infoBlock(), layout(), phaseBanner(), signalReport()

### Community 20 - "Community 20"
Cohesion: 0.57
Nodes (5): dailyDigest(), fmtPrice(), inboxUrl(), layout(), phaseBanner()

### Community 21 - "Community 21"
Cohesion: 0.38
Nodes (4): getTodayDateString(), handleSubmit(), parseNullableNumber(), toFormValues()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (2): handleSaveEdit(), validateEdit()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (2): copyTextWithFallback(), handleCopy()

### Community 25 - "Community 25"
Cohesion: 0.73
Nodes (4): fmtDate(), inboxUrl(), layout(), watchlistReviewDigest()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (2): getTodayDateString(), toFormValues()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (2): formatPercent(), getAlphaTone()

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (1): createSupabaseBrowserClient()

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (2): getModuleLabel(), TopBar()

## Knowledge Gaps
- **Thin community `Community 23`** (6 nodes): `WatchlistSelectionTable.tsx`, `getWatchlistQuality()`, `handleDeleteConfirm()`, `handleSaveEdit()`, `handleSelect()`, `validateEdit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (6 nodes): `MarketSnapshotChatGPTWorkflow.tsx`, `buildClipboardContent()`, `copyTextWithFallback()`, `handleApply()`, `handleCopy()`, `isValidRawData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (6 nodes): `WatchlistForm.tsx`, `getTodayDateString()`, `handleReset()`, `handleSubmit()`, `toFormValues()`, `update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (5 nodes): `QuarterlyReviewsTable.tsx`, `formatCurrency()`, `formatDate()`, `formatPercent()`, `getAlphaTone()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `supabase.ts`, `supabase.ts`, `createSupabaseBrowserClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `TopBar.tsx`, `getModuleLabel()`, `TopBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `update()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 4` to `Community 1`, `Community 3`, `Community 20`, `Community 7`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `evaluateTicker()` connect `Community 3` to `Community 11`, `Community 4`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `update()` (e.g. with `handleSaveEntry()` and `handleSaveAnalysis()`) actually correct?**
  _`update()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `GET()` (e.g. with `buildPrefilledJournalEntry()` and `buildPrefilledAnalysis()`) actually correct?**
  _`GET()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `POST()` (e.g. with `update()` and `GET()`) actually correct?**
  _`POST()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._