---
title: Notes on backpressure (unfinished)
description: A half-written draft about where queues actually absorb load, kept here so the draft mechanism has something to hide.
date: 2026-08-12
type: note
tags: [distributed-systems]
draft: true
---

This post is a draft. It is deliberately left in `content/blog/` and marked
`draft: true` so the build has something to exclude — no page is generated for it, and
it appears in neither the sitemap nor the feeds.

Delete it once there is real work-in-progress to keep here.

Rough shape of the argument:

- A queue does not remove load, it relocates it in time.
- Unbounded queues convert a throughput problem into a latency problem, silently.
- The useful question is where you want the pain to surface, not how to avoid it.
