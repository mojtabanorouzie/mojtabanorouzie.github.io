---
title: یادداشتی دربارهٔ idempotency
description: چرا در سیستم‌های پیام‌محور، «دوباره اجرا شدن» یک استثنا نیست و باید از ابتدا برایش طراحی کنیم.
date: 2026-07-25
type: note
tags: [Kafka, event-driven, Persian]
lang: fa
---

هر سیستم پیام‌محوری که با تضمین at-least-once کار می‌کند، دیر یا زود یک پیام را دوبار
تحویل می‌دهد. این باگ نیست؛ بخشی از قرارداد است. اگر broker مطمئن نباشد که پیام را
پردازش کرده‌اید، دوباره می‌فرستد — و این دقیقاً همان رفتاری است که از او خواسته‌ایم.

مشکل وقتی جدی می‌شود که `handler` ما فرض کرده باشد هر پیام دقیقاً یک بار می‌آید. آن وقت
یک `retry` ساده می‌تواند موجودی انبار را دوبار کم کند یا برای یک سفارش دو بار فاکتور
بزند.

راه‌حل معمولاً پیچیده نیست. کافی است هر پیام شناسهٔ یکتا داشته باشد و پیش از اعمال،
بررسی کنیم که قبلاً آن را دیده‌ایم یا نه:

```csharp
if (await _processed.ExistsAsync(message.Id))
{
    return HandlerResult.Skip;
}

await using var tx = await _db.BeginTransactionAsync();
await _inventory.DecreaseAsync(message.Sku, message.Quantity);
await _processed.AddAsync(message.Id);
await tx.CommitAsync();
```

نکتهٔ ظریف این است که ثبت شناسه و خودِ تغییر وضعیت باید در یک تراکنش انجام شوند. اگر
آن‌ها را جدا کنیم، باز هم به همان مشکل برمی‌گردیم — فقط با پنجرهٔ زمانی کوچک‌تری که
پیدا کردنش سخت‌تر است.

The short version in English: at-least-once delivery makes idempotency a requirement,
not an optimisation. Design for the duplicate on day one and you never have to hunt it
down at two in the morning.
