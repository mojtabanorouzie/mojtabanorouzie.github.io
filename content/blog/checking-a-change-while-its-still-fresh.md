---
title: Checking a Change While It's Still Fresh
description: A small habit our team started after making changes, and what I learn by checking the results while I still remember the work.
date: 2026-09-16
type: article
tags: [engineering, production, experience]
---

Years ago, our team began checking important changes after putting them into production, the system our users use. If we changed an API, a way for programs to communicate, we sent it a request to check the response. If we changed how an order was handled, we checked an order.

I became interested in the gap between two statements: “It should work” and “I looked at this response, and it matched what I expected.” The first was based on the work I had done before the change went live. The second came from a simple action: checking what the system actually did after the change.

Doing this soon after the change also helped me understand the result. I still remembered what I expected, which cases I had thought about, and what I was unsure about.

## Between “it should work” and “I checked”

After a deployment, when the change is live, I'm usually ready to move on. I've tested it on my computer, the tests have passed, and someone has reviewed the code. If someone asks whether I checked it in production, “it should work” can feel like a fair answer.

I still catch myself thinking that. After testing the code, I have reasons to expect it to work. But my tests used certain data and settings. The live system may be different.

Old records, unexpected inputs, more users, or a slow reply from another service can change the result.

My checks usually focus on the part I changed. That might be a value in an API response, the result of changing a setting, or one step in an order. The number of errors can help too if it tells me something about that part of the system. Sometimes the check takes a couple of minutes; sometimes it takes longer.

## Debugging history

Imagine a small change to how a service handles an order. The change goes live, nothing seems wrong, and we move on. Two weeks later, someone reports a problem. As we look into it, we begin to think the earlier change may be part of the cause.

Now we're reading logs, the records of what the system did, and trying to make the problem happen again. Did it start right away, or did something else change later? Did it happen only with certain orders? Before we can understand the bug, we have to work out what happened around the change. This is what I mean by debugging history.

The code is still there to read. Remembering why I wrote it that way can take longer. What did I expect? Which cases did I think about? What was I unsure about? I remember these details more easily just after making the change.

That's why an early check matters to me. If it shows a problem, I can look into it while I still remember the response I expected and the steps I changed.

One case can work while another fails, and some problems only appear later. An early check does not prove that everything works. It gives me a result I can compare with what happens later.

![Drawing of connected servers, with a small area lit in gold.](/assets/blog/verification-illustration.png "A check shows me what happened in the case I looked at.")

I also think about the person who has a problem before we hear about it. If a check helps us find it earlier, we may save them that trouble. That matters to me, along with the time we might save looking for the cause.

## What I get from checking

The check brings the result close to the decisions behind it. I can look at what the system did while I still remember why I expected it to behave that way. If the two do not match, those details help me decide where to look next.

“It should work” is still where I start. Checking while the work is fresh gives me a chance to compare that expectation with a response I can see, before I have to piece the work together again.
