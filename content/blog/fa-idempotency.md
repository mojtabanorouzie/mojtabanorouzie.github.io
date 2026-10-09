---
title: یادداشتی دربارهٔ idempotency
description: ثبت اتمیک شناسهٔ پیام و تغییر وضعیت، و نقش قید یکتا در جلوگیری از پردازش هم‌زمان یک پیام.
date: 2026-07-25
updated: 2026-10-10
type: note
tags: [Kafka, event-driven, Persian]
lang: fa
---

در تحویل at-least-once ممکن است یک پیام بیش از یک بار به مصرف‌کننده برسد. اگر پردازش
پیام موجودی را کم کند یا وضعیت سفارش را تغییر دهد، اجرای دوباره می‌تواند اثر تکراری ایجاد کند.

## بررسی قبلی به‌تنهایی کافی نیست

دو پردازش‌گر ممکن است هم‌زمان بررسی کنند که شناسهٔ پیام قبلاً ثبت نشده است. هر دو پاسخ
«ثبت نشده» می‌گیرند و هر دو به مرحلهٔ تغییر وضعیت می‌رسند. بنابراین یک فراخوانی
`ExistsAsync` پیش از شروع تراکنش، تضمین جلوگیری از تکرار نیست.

برای تغییرات داخل یک پایگاه داده، می‌توان ثبت شناسه و تغییر وضعیت را در یک تراکنش انجام داد.
جدول پیام‌های پردازش‌شده باید روی ترکیب نام مصرف‌کننده و شناسهٔ پیام قید یکتا داشته باشد.
این قید است که رقابت دو پردازش‌گر را کنترل می‌کند، نه بررسی اولیه.

## ترتیب عملیات

الگوریتم زیر توضیح الگو است، نه کد آمادهٔ اجرا یا ادعای پیاده‌سازی یک سامانهٔ خاص:

```text
BEGIN database transaction
  INSERT (consumer_name, message_id) into processed_messages
    -- UNIQUE (consumer_name, message_id)
  APPLY the business change using the SAME connection and transaction
COMMIT
ACKNOWLEDGE the message
```

اگر درج شناسه با خطای همان قید یکتا شکست خورد، تراکنش را rollback می‌کنیم و پیام را
تکراری در نظر می‌گیریم. فقط خطای قید مربوط به شناسهٔ پیام چنین معنایی دارد؛ خطاهای دیگر
را نباید به‌عنوان تکرار پنهان کرد. در خطای دیگر، تراکنش rollback می‌شود و سیاست retry یا
رسیدگی به خطای سامانه اجرا می‌شود.

اگر پردازش‌گر پس از commit و پیش از تأیید پیام متوقف شود، تحویل مجدد با شناسهٔ ثبت‌شده
مواجه می‌شود و تغییر وضعیت را تکرار نمی‌کند. اگر تراکنش commit نشده باشد، هم ثبت شناسه
و هم تغییر وضعیت باید rollback شده باشند تا تلاش بعدی بتواند کار را انجام دهد.

## مرز این تضمین

همهٔ عملیات داده باید واقعاً در همان تراکنش شرکت کنند. فراخوانی یک سرویس بیرونی، ارسال
ایمیل یا تغییر در پایگاه داده‌ای دیگر با این تراکنش rollback نمی‌شود. برای انتشار رویداد
می‌توان از transactional outbox استفاده کرد؛ اثرهای بیرونی نیز به راهکار idempotency
متناسب با سرویس مقصد نیاز دارند. این الگو ادعای exactly-once در سراسر سامانه نیست.

## آزمونی که این ادعا را بررسی می‌کند

دو پردازش هم‌زمان برای یک شناسهٔ پیام آغاز کنید. پس از اتمام، باید فقط یک رکورد برای کلید
مصرف‌کننده/پیام ثبت شده و موجودی فقط یک بار تغییر کرده باشد. سپس توقف پیش از commit و
توقف پس از commit ولی پیش از acknowledgement را شبیه‌سازی کنید. در حالت اول، retry
باید تغییر را اعمال کند؛ در حالت دوم، نباید آن را دوباره اعمال کند. این‌ها سناریوهای پیشنهادی
آزمون هستند، نه گزارش اجرای آزمون برای کد این مقاله.

Reference: [Idempotent Consumer pattern](https://microservices.io/patterns/communication-style/idempotent-consumer.html).

English summary: a pre-check does not prevent concurrent duplicate processing. Use a unique consumer/message key and commit its insertion with the business change in one database transaction. Handle the specific duplicate-key conflict, acknowledge after commit, and design external side effects separately.
