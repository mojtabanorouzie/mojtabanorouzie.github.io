---
title: Notes on backpressure (unfinished)
description: An unfinished draft about how queues handle work when it arrives faster than a system can process it.
date: 2026-08-12
type: note
tags: [distributed-systems]
draft: true
---

This is a sample draft. It stays in `content/blog/` with `draft: true` so we can check that the build leaves drafts out. It has no public page and does not appear in the sitemap or feeds.

It can be removed when there is a real draft to use instead.

Ideas for the post:

- A queue holds work until a system can process it. It does not remove the work.
- If work keeps arriving too fast, a queue with no size limit can keep growing. Each item then waits longer.
- Where should the system slow down or limit new work when it cannot keep up?
