---
title: Checking a Change While It's Still Fresh
description: A small habit our team started after making changes, and what I learn by checking the results while I still remember the work.
date: 2026-09-16
type: article
tags: [engineering, production, experience]
---

Years ago, our team began checking important changes after putting them into production, the system our users use. If we changed an API, we called it to check the response. If we changed how an order was handled, we checked an order. It was a small habit. At first, it hardly seemed worth writing about. Over time, I began to see its value.

I became interested in the gap between two statements: “It should work” and “I looked at this response, and it matched what I expected.” The first was based on the work I had done before the change went live. The second came from a simple action: checking what the system actually did after the change.

That check did not prove that everything worked. It showed me what happened in one case while I still remembered the change. When we found a problem later, we often had to work out what had happened around the change before we could understand the bug. I came to think of this as debugging history: looking back to find out what went wrong.

## Between “it should work” and “I checked”

After a deployment, when the change is live, I'm usually ready to move on. I've tested it on my computer, the tests have passed, and someone has reviewed the code. If someone asks whether I checked it in production, “it should work” can feel like a fair answer.

I still catch myself thinking that. After testing the code, I have reasons to expect it to work. But my tests used certain data and settings. The live system may be different.

Old records, unexpected inputs, more users, or a slow reply from another service can change the result. Checking the response or the steps I changed gives me more information about my work.

Sometimes that takes a couple of minutes. Sometimes it takes longer. I care more now about what I learn from those minutes than how quickly I can call the task finished.

## Debugging history

Imagine a small change to how a service handles an order. The change goes live, nothing seems wrong, and we move on. Two weeks later, someone reports a problem. As we look into it, we begin to think the earlier change may be part of the cause.

Now we're reading logs, the records of what the system did. We're checking measurements such as error counts, looking at past changes, and trying to make the problem happen again. We also have questions about the time after the change. Did the problem start right away? Did it happen only with certain orders or data? Did something else change later? Which users had the problem?

The code is still there to read. Remembering why I wrote it that way can take longer. What did I expect? Which cases did I think about? What was I unsure about? I remember these details more easily just after making the change.

That's why an early check matters to me. If it shows a problem, I can look into it while I still remember the response I expected and the steps I changed.

Of course, the check might miss a problem. One case can work while another fails. But knowing what I actually saw gives me something to compare with later. I can say what happened in that case without thinking it must be true for every user.

![Drawing of connected servers, with a small area lit in gold.](/assets/blog/verification-illustration.png "A check shows me what happened in the case I looked at.")

The picture shows how I think about this. The network is larger than the small area in the light. In the same way, a system is larger than any single check. The light marks the part I looked at. I know more about that part now, but I still have not checked everything.

I also think about the person who has a problem before we hear about it. If a check helps us find it earlier, we may save them that trouble. That matters to me, along with the time we might save looking for the cause.

## What I get from checking

My checks usually focus on the part I changed. That might be a value in an API response, the result of changing a setting, or one step in an order. A measurement, such as an error count, can help too if it tells me something about that part of the system.

I'm more comfortable saying “I looked at this response, and it matched what I expected” than saying “everything works.” The first statement says what I know. It also leaves room for what I haven't seen.

Some problems only appear later, or with different data or more users. A check just after a change goes live won't answer every question. There are still things I don't know, but I have a result I can look back at if something changes.

I still think “it should work.” These days, before I move on, I like being able to add: “I looked at this response, and it matched what I expected.”
