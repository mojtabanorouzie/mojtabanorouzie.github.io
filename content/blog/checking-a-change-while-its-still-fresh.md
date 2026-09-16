---
title: Checking a Change While It's Still Fresh
description: A small habit our team picked up after deployments, and why I find it easier to understand a change while I still remember it.
date: 2026-09-16
type: article
tags: [engineering, production, experience]
---

Years ago, our team began checking important changes after deploying them to production. If we changed an API, we called it. If we changed an order flow, we checked an order. It was a small habit, and at first it hardly seemed worth describing. Over time, though, I began to appreciate what it gave me.

What interested me was the gap between two statements: “It should work” and “I looked at this response, and it matched what I expected.” The first was an expectation based on the work leading up to the deployment. The second came from a small act: looking at what the system actually did after the change went live.

That check did not prove that everything worked. It gave me one concrete observation while the change was still fresh. When a problem appeared later, reaching the same understanding often meant reconstructing what had happened around the change before I could understand the bug itself. I came to think of that as debugging history.

## Between “it should work” and “I checked”

At the end of a deployment, I'm usually ready to move on. I've tested the change locally, the tests have passed, and the code has been reviewed. If someone asks whether I checked it in production, “it should work” can feel like a fair answer.

I still catch myself thinking that. There are reasons to expect the code to work, especially after spending time testing it. But some of those expectations depend on the environment and data I tested with.

Production has a way of finding those assumptions. Older records, unexpected inputs, different traffic, and the timing of an external service can all affect what happens. Looking at the affected response or flow after deployment gives me another piece of information about the change I just made.

Sometimes that takes a couple of minutes. Sometimes it takes longer. I've become more interested in what I learn from those minutes than in how quickly I can call the task finished.

## Debugging history

I can imagine a small change to how a service processes an order. The deployment finishes, nothing looks obviously wrong, and we move on. Two weeks later, someone reports a problem. During the investigation, we start to suspect that the earlier change might be involved.

Now we're looking through logs, checking metrics, reviewing deployments, and trying to reproduce what happened. There are questions about the time after the release, too. Did the problem appear immediately? Did it need a particular order or state of the data? Did something else change afterward? Which users encountered it?

The code is still there to read. Remembering why I wrote it that way can take longer. What did I expect? Which cases did I consider? Where was I uncertain? Those details are much closer at hand just after I've made the change.

That's the part I keep coming back to. If a check reveals a problem soon after deployment, I can start looking into it while I still remember the response I expected and the part of the flow I touched.

Of course, the check might miss it. One case can work while another fails. But knowing what I actually observed gives me a point of reference. I can be more specific about what happened in that case, without assuming the same was true for every user.

![Charcoal drawing of a branching server network on warm paper, with a small amber pool of light highlighting one section.](/assets/blog/verification-illustration.png "A check tells me something about the behavior I observed at that moment.")

The illustration is how I picture that difference. The network is larger than the small area in the light, just as a system is larger than any single check. The light does not tell me that everything works; it marks the path I actually looked at and gives me one piece of evidence I did not have before.

I also think about the person who runs into a problem before we hear about it. If a check helps us notice something earlier, it may save them that experience. That matters to me alongside the time we might save investigating.

## What I get from checking

The checks I have in mind are usually close to the change itself: the part of an API response I edited, the behavior affected by a configuration value, or evidence of what happened at one step of an order flow. A metric can be useful too, when it reflects the behavior I'm looking at.

I'm more comfortable saying “I looked at this response, and it matched what I expected” than saying “everything works.” The first statement tells me what I know. It also leaves room for what I haven't seen.

Some behavior only shows up later, or with different data and traffic. A check straight after deployment won't answer all of those questions. I still have uncertainty afterward, but I have an observation to come back to if something changes.

I still think “it should work.” These days, before I move on, I like having something more concrete to add: “I looked at this response, and it matched what I expected.”
