# Homemade Beauty Care — নতুন AI Live Chat-এর প্রয়োজনীয়তা

এই নোটটি মালিকের আগের নির্দেশনা থেকে তৈরি। নতুন AI সংযোগ করার সময় এই চাহিদাগুলো অনুসরণ করতে হবে।

## ১. মূল লক্ষ্য
- পুরোনো Gemini AI ও পুরোনো auto-reply implementation ব্যবহার করা যাবে না।
- নতুন AI provider/API দিয়ে নতুনভাবে AI reply system তৈরি করতে হবে।
- শুধু AI-এর নাম বদলানো নয়; customer message, conversation history, product data, order flow এবং admin handoff একসঙ্গে ঠিকভাবে কাজ করতে হবে।
- নতুন AI সক্রিয় না হওয়া পর্যন্ত customer message যেন স্বয়ংক্রিয় AI reply-এর ভান না করে; customer↔admin live chat, message history ও manual reply চালু থাকবে।

## ২. গ্রাহকের সঙ্গে কথোপকথন
- প্রতিটি customer message-এর উত্তর AI আগে দেবে—নতুন AI সংযুক্ত হলে।
- আগের conversation history ব্যবহার করে প্রসঙ্গ বুঝবে; একই প্রশ্ন বারবার করবে না।
- বাংলা, বাংলিশ (যেমন “order nin”, “harpack”, “hairpack”) এবং English বুঝবে।
- উত্তর স্বাভাবিক, সংক্ষিপ্ত, সহায়ক ও মানুষের মতো হবে; সাধারণত ১–৩টি ছোট message।
- প্রতিবার customer-এর নাম ধরে ডাকবে না; বিশেষ প্রয়োজন হলে নাম ব্যবহার করবে।
- ক্রেতাকে স্বাভাবিকভাবে order করতে সাহায্য করবে, কিন্তু চাপ দেবে না এবং মিথ্যা দাবি করবে না।
- পণ্যের নামের বানান ভুল/বাংলিশ variation থাকলেও সক্রিয় পণ্যের তালিকা থেকে মিল খুঁজবে; না বুঝলে একবার পরিষ্কার প্রশ্ন করবে, একই prompt লুপ করবে না।

## ৩. লাইভ ওয়েবসাইটের তথ্য
AI-কে website/Supabase-এর বর্তমান তথ্য ব্যবহার করতে হবে:
- সক্রিয় পণ্য, বাংলা/ইংরেজি নাম, ছবি ও product link
- বর্তমান মূল্য, পুরোনো মূল্য/offer, stock
- উপাদান, উপকারিতা, ব্যবহারবিধি, কার জন্য উপযুক্ত এবং সংরক্ষণ নির্দেশনা
- delivery charge, free-delivery condition, payment method এবং return/refund policy
- প্রয়োজন হলে পণ্যের সঠিক ছবি ও product link শেয়ার করবে।
- database-এ নেই এমন দাম, stock, discount, review, delivery date বা অন্য কোনো তথ্য বানিয়ে বলবে না।

## ৪. অর্ডার নেওয়ার ধাপ
- “অর্ডার নেন”, “order nin”, “order korbo” ইত্যাদি নতুন অর্ডারের ইচ্ছা হিসেবে বুঝবে; পুরোনো অর্ডারের tracking প্রশ্ন মনে করবে না।
- আগে থেকে বলা product name ও quantity conversation history থেকে ধরবে।
- পণ্য নিশ্চিত হলে শুধু quantity জিজ্ঞেস করবে; quantity জানা থাকলে আবার জিজ্ঞেস করবে না।
- product এবং quantity—দুটিই নিশ্চিত হলে order form দেখাবে।
- form-এ customer name, mobile number এবং complete address নিতে হবে।
- order request admin-কে পাঠাতে হবে; বাস্তব order system নিশ্চিত না করা পর্যন্ত “অর্ডার কনফার্ম” বলা যাবে না।
- অর্ডারের stock, price ও delivery charge প্রয়োজনে admin যাচাই করবেন।
- customer-এর পুরোনো order status জানতে চাইলে শুধু secure lookup থেকে যাচাইকৃত তথ্য বলবে; অনুমান করবে না।

## ৫. Admin handoff ও Live Chat
- অভিযোগ, refund/dispute, অনিশ্চিত উত্তর বা human judgement প্রয়োজন হলে admin/support-এর কাছে handoff করবে।
- Admin যেন AI reply এবং admin-এর উত্তর প্রয়োজন এমন conversation সহজে চিনতে পারেন।
- Admin takeover করলে customer-কে conflicting বা duplicate reply যাবে না।
- Customer↔admin messaging, chat history, closed chat/reopen, notifications, image/video/voice message, saved/quick replies, visitor presence/activity এবং mobile-responsive chat-এর বর্তমান সুবিধা অক্ষত রাখতে হবে।
- পুরোনো chat messages বা customer data delete করা যাবে না।
- Admin-এর manual reply যেন AI ছাড়াও কাজ করে।

## ৬. নতুন AI সংযোগের নিরাপত্তা ও যাচাই
- API key শুধু Vercel server-side environment variable-এ থাকবে; browser/frontend-এ প্রকাশ করা যাবে না।
- provider API key/configuration না থাকলে পরিষ্কার configuration error দেখাতে হবে; fake success নয়।
- production deployment-এর পর বাস্তব end-to-end test করতে হবে:
  1. “order nin” → AI পণ্য জিজ্ঞেস করবে।
  2. “harpack” বা “hairpack” → পণ্য শনাক্ত করবে এবং quantity জিজ্ঞেস করবে।
  3. “2 ta” → একই পণ্য/quantity ধরে order form দেখাবে।
  4. product details, price, stock, image/link ও delivery প্রশ্নের সঠিক উত্তর দেবে।
  5. পুরোনো order status query-তে শুধু যাচাইকৃত তথ্য ব্যবহার করবে।
  6. admin handoff, manual reply এবং voice/image message পরীক্ষা করবে।
- শুধু deployment “Ready” দেখেই কাজ সম্পন্ন বলা যাবে না; live domain-এ end-to-end test পাস করতে হবে।
