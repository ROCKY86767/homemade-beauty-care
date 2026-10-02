import { Link } from 'react-router-dom';
import { ChevronRight, Phone, RotateCcw, CheckCircle2 } from 'lucide-react';
import SEO from '@/components/SEO';

export default function ReturnsRefundsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Returns & Refunds - Homemade Beauty Care" />
      <div className="section-padding py-8 md:py-12">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={14} />
          <span className="text-ink font-medium">Returns & Refunds</span>
        </div>

        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
            <RotateCcw size={24} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-dark mb-3">
            Returns & Refunds
          </h1>
          <p className="text-gray-600 leading-7">
            Homemade Beauty Care থেকে কেনাকাটার ক্ষেত্রে পণ্য ফেরত ও রিফান্ডের নিয়মগুলো নিচে দেওয়া হলো।
          </p>
        </div>

        <div className="max-w-4xl space-y-6">
          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">১. ডেলিভারির সময় পণ্য ক্ষতিগ্রস্ত হলে</h2>
            <p className="text-gray-600 leading-7">
              কুরিয়ারের মাধ্যমে পণ্য পাওয়ার সময় পণ্যটি ক্ষতিগ্রস্ত অবস্থায় থাকলে, সম্ভব হলে ডেলিভারি রাইডারের সামনে পণ্যটি পরীক্ষা করুন। ক্ষতিগ্রস্ত পণ্য পাওয়া গেলে সঙ্গে সঙ্গে পণ্যটি ফেরত দিতে পারবেন।
            </p>
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-green-50 p-4">
              <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 leading-6">এই ক্ষেত্রে পণ্যের মূল্য বা রিটার্ন চার্জ আপনাকে বহন করতে হবে না।</p>
            </div>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">২. ভুল পণ্য পেলে</h2>
            <p className="text-gray-600 leading-7">
              অর্ডার করা পণ্যের পরিবর্তে ভুল পণ্য পাঠানো হলে সেটি ফেরত দেওয়া যাবে। ভুল পণ্য ফেরত পাঠানোর প্রযোজ্য রিটার্ন চার্জ Homemade Beauty Care বহন করবে।
            </p>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৩. পণ্য পাওয়ার ৩ মাসের মধ্যে মেয়াদ শেষ হলে</h2>
            <p className="text-gray-600 leading-7">
              পণ্যটি গ্রহণ করার তারিখ থেকে ৩ মাসের মধ্যে যদি পণ্যটির মেয়াদ শেষ হয়ে যায়, তাহলে উপযুক্ত প্রমাণ প্রদান সাপেক্ষে পূর্ণ রিফান্ড দেওয়া হবে।
            </p>
            <div className="mt-4 rounded-xl bg-primary/5 p-4">
              <p className="text-sm text-gray-700 leading-6">
                রিফান্ড যাচাই সম্পন্ন হওয়ার পর সর্বোচ্চ ২ দিনের মধ্যে bKash, Nagad অথবা ব্যাংক অ্যাকাউন্টের মাধ্যমে রিফান্ড প্রদান করা হবে।
              </p>
            </div>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৪. ব্যবহৃত বা খোলা পণ্য</h2>
            <p className="text-gray-600 leading-7">
              সাধারণভাবে ব্যবহৃত বা খোলা পণ্য ফেরত নেওয়া হবে না। তবে পণ্য গ্রহণের তারিখ থেকে ৩ মাসের মধ্যে মেয়াদ শেষ হয়ে গেলে, উপযুক্ত প্রমাণের ভিত্তিতে বিষয়টি যাচাই করে রিফান্ডের ব্যবস্থা করা হবে।
            </p>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৫. প্রত্যাশিত ফলাফল না পেলে</h2>
            <p className="text-gray-600 leading-7">
              ব্যক্তিভেদে পণ্যের ফলাফল ভিন্ন হতে পারে। শুধুমাত্র প্রত্যাশিত ফলাফল না পাওয়ার কারণে পণ্য ফেরত বা রিফান্ড প্রযোজ্য হবে না।
            </p>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৬. রিটার্ন বা রিফান্ডের জন্য যোগাযোগ</h2>
            <p className="text-gray-600 leading-7 mb-5">
              পণ্য ফেরত বা রিফান্ড সংক্রান্ত কোনো সমস্যা হলে যত দ্রুত সম্ভব আমাদের কাস্টমার সার্ভিসে যোগাযোগ করুন। প্রয়োজন অনুযায়ী অর্ডার নম্বর, পণ্যের ছবি বা অন্যান্য প্রমাণ দিতে হতে পারে।
            </p>
            <a href="tel:01999478203" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white font-medium hover:bg-primary/90 transition-colors">
              <Phone size={18} /> 01999478203
            </a>
          </section>

          <section className="rounded-2xl bg-dark p-6 md:p-8 text-white">
            <h2 className="font-display text-xl font-bold mb-3">গুরুত্বপূর্ণ</h2>
            <p className="text-white/80 leading-7">
              প্রতিটি রিটার্ন বা রিফান্ডের ক্ষেত্রে অর্ডারের তথ্য ও প্রয়োজনীয় প্রমাণ যাচাই করা হতে পারে। যাচাই শেষে প্রযোজ্য নিয়ম অনুযায়ী পরবর্তী ব্যবস্থা নেওয়া হবে।
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
