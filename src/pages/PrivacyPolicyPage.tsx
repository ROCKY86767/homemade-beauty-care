import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import SEO from '@/components/SEO';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Privacy Policy - Homemade Beauty Care" />
      <div className="section-padding py-8 md:py-12">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={14} />
          <span className="text-ink font-medium">Privacy Policy</span>
        </div>

        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-dark mb-3">Privacy Policy</h1>
          <p className="text-gray-600 leading-7">আপনার ব্যক্তিগত তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখা হয়—এই পেজে তা ব্যাখ্যা করা হয়েছে।</p>
        </div>

        <div className="max-w-4xl space-y-6">
          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">১. আমরা যে তথ্য সংগ্রহ করি</h2>
            <p className="text-gray-600 leading-7">অর্ডার ও সেবা দেওয়ার প্রয়োজন অনুযায়ী আপনার নাম, মোবাইল নম্বর, ইমেইল, ডেলিভারি ঠিকানা এবং অর্ডারের তথ্য সংগ্রহ করা হতে পারে।</p>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">২. তথ্য কী কাজে ব্যবহার করা হয়</h2>
            <ul className="space-y-3 text-gray-600 leading-7 list-disc pl-5">
              <li>অর্ডার কনফার্ম ও প্রসেস করতে।</li>
              <li>ডেলিভারি, অর্ডার ট্র্যাকিং এবং কাস্টমার সাপোর্ট দিতে।</li>
              <li>রিটার্ন ও রিফান্ড সংক্রান্ত সেবা দিতে।</li>
              <li>ওয়েবসাইটের নিরাপত্তা ও সেবা উন্নত করতে।</li>
            </ul>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৩. ডেলিভারি ও রিফান্ডে তথ্য শেয়ার</h2>
            <p className="text-gray-600 leading-7">
              অর্ডার ডেলিভারির জন্য প্রয়োজনীয় তথ্য Pathao Courier বা সংশ্লিষ্ট ডেলিভারি সেবা প্রদানকারীর সঙ্গে শেয়ার করা হতে পারে। রিফান্ডের ক্ষেত্রে প্রয়োজন অনুযায়ী bKash, Nagad বা ব্যাংক অ্যাকাউন্টের তথ্য ব্যবহার করা হতে পারে।
            </p>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৪. তৃতীয় পক্ষের সঙ্গে তথ্য</h2>
            <p className="text-gray-600 leading-7">আপনার অনুমতি ছাড়া আপনার তথ্য বিক্রি করা বা অপ্রয়োজনীয়ভাবে তৃতীয় পক্ষের সঙ্গে শেয়ার করার উদ্দেশ্য আমাদের নেই। আইনগতভাবে প্রয়োজন হলে সংশ্লিষ্ট কর্তৃপক্ষের কাছে তথ্য প্রদান করা হতে পারে।</p>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৫. Cookies ও প্রযুক্তিগত তথ্য</h2>
            <p className="text-gray-600 leading-7">ওয়েবসাইটের নিরাপত্তা, কার্যকারিতা এবং সেবা উন্নত করার জন্য প্রয়োজনীয় cookies বা প্রযুক্তিগত তথ্য ব্যবহার করা হতে পারে।</p>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">৬. মার্কেটিং যোগাযোগ</h2>
            <p className="text-gray-600 leading-7">নতুন পণ্য, অফার বা প্রয়োজনীয় আপডেট সম্পর্কে মার্কেটিং বার্তা পাঠানো হতে পারে। যেখানে প্রযোজ্য, আপনি এ ধরনের যোগাযোগ বন্ধ করার অনুরোধ করতে পারবেন।</p>
          </section>

          <section className="rounded-2xl bg-dark p-6 md:p-8 text-white">
            <h2 className="font-display text-xl font-bold mb-3">গোপনীয়তা সংক্রান্ত যোগাযোগ</h2>
            <p className="text-white/80 leading-7 mb-5">আপনার অ্যাকাউন্ট, অর্ডার বা ব্যক্তিগত তথ্য সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সঙ্গে যোগাযোগ করুন।</p>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white font-medium hover:bg-primary-light transition-colors">যোগাযোগ করুন</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
