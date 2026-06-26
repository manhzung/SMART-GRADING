# AI Question Generation Optimization Spec

**Date:** 2026-06-26
**Status:** Draft
**Author:** Agent

## Problem Statement

Current AI question generation has several issues:
1. Prompt is basic - no system role, limited context
2. No retry mechanism when AI fails
3. Parsing is fragile - regex matching can break
4. No caching - same prompts create duplicate questions
5. No quality control on generated questions

## Goals

1. **Improve Prompt Engineering** - Add system prompt, few-shot examples, better constraints
2. **Add Robust Error Handling** - Retry with exponential backoff, fallback responses
3. **Better JSON Parsing** - Structured validation, multiple fallback strategies
4. **Add Simple Caching** - Prevent duplicate generations within session/time window
5. **Quality Metrics** - Track success rate, parse rate

## Architecture Changes

### 1. Enhanced Prompt Structure

```javascript
// Before: Simple prompt
prompt = `Tao ${count} cau hoi ${difficulty}...`

// After: Structured prompt with:
- System role (teacher persona)
- Few-shot examples (1-2 sample questions)
- Strict output format constraints
- Vietnamese language emphasis
```

### 2. Retry Logic

```javascript
async generateQuestions(...) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callAI();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(attempt * 1000); // exponential backoff
    }
  }
}
```

### 3. Multi-Strategy Parsing

1. Primary: JSON.parse() with trimmed response
2. Fallback 1: Extract from markdown code blocks
3. Fallback 2: Regex match array pattern
4. Fallback 3: Request regeneration with stricter format

### 4. Session Caching

```javascript
// Simple in-memory cache
const generationCache = new Map();
const cacheKey = `${topicId}:${difficulty}:${requirements}:${count}`;
if (cacheCache.has(cacheKey)) {
  return cacheCache.get(cacheKey);
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `server/src/services/questionGen.service.js` | Core optimization |
| `server/src/services/gemini.service.js` | Add retry logic, improve config |

## Success Metrics

- AI generation success rate: >95%
- Parse success rate: >90%
- Average generation time: <5 seconds
