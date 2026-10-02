import { Link } from 'react-router-dom';
import { ChevronRight, Truck, Phone, Clock3 } from 'lucide-react';
import SEO from '@/components/SEO';

export default function DeliveryInformationPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Delivery Information - Homemade Beauty Care" />
      <div className="section-padding py-8 md:py-12">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={14} />
          <span className="text-ink font-medium">Delivery Information</span>
        </div>

        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
            <Truck size={24} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-dark mb-3">Delivery Information</h1>
          <p className="text-gray-600 leading-7">অর্ডার, ডেলিভারি সময়, চার্জ এবং ট্র্যাকিং সংক্রান্ত তথ্য নিচে দেওয়া হলো।</p>
        </div>

        <div className="max-w-4xl space-y-6">
          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">ডেলিভারি সময়</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-primary/5 p-5">
                <Clock3 className="text-primary mb-3" size={22} />
                <h3 className="font-semibold text-dark mb-1">ঢাকার মধ্যে</h3>
                <p className="text-gray-600">সাধারণত ১–২ দিনের মধ্যে।</p>
              </div>
              <div className="rounded-xl bg-primary/5 p-5">
                <Clock3 className="text-primary mb-3" size={22} />
                <h3 className="font-semibold text-dark mb-1">ঢাকার বাইরে</h3>
                <p className="text-gray-600">সাধারণত ২–৩ দিনের মধ্যে।</p>
              </div>
            </div>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">ডেলিভারি চার্জ ও পেমেন্ট</h2>
            <ul className="space-y-3 text-gray-600 leading-7 list-disc pl-5">
              <li>ডেলিভারি চার্জ বর্তমান অফার বা ক্যাম্পেইন অনুযায়ী পরিবর্তিত হতে পারে।</li>
              <li>Cash on Delivery (COD) সুবিধা অর্ডার ও গ্রাহকের অবস্থার ওপর নির্ভর করতে পারে।</li>
              <li>অর্ডার কনফার্ম হওয়ার পর অর্ডারটি প্রসেস করা হয়।</li>
              <li>বর্তমানে ডেলিভারি Pathao Courier-এর মাধ্যমে করা হয়।</li>
            </ul>
          </section>

          <section className="card p-6 md:p-8 border border-gray-50">
            <h2 className="font-display text-xl font-bold text-dark mb-4">ডেলিভারি সংক্রান্ত বিশেষ নিয়ম</h2>
            <ul className="space-y-3 text-gray-600 leading-7 list-disc pl-5">
              <li>গ্রাহক নির্ধারিত সময়ে পণ্য গ্রহণ করতে না পারায় পণ্য ফেরত গেলে প্রযোজ্য রিটার্ন/ডেলিভারি চার্জ গ্রাহককে বহন করতে হতে পারে।</li>
              <li>অর্ডার করার পর ২ দিনের মধ্যে ঠিকানা পরিবর্তন করতে হলে রাইডার বা আমাদের হটলাইনে যোগাযোগ করুন।</li>
              <li>ডেলিভারি বিলম্ব হলে সর্বোচ্চ ৫ দিন পর্যন্ত অপেক্ষা করুন। ৫ দিনের পরও পণ্য না পেলে প্রযোজ্য ক্ষেত্রে রিটার্ন চার্জ আপনাকে দিতে হবে না।</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-dark p-6 md:p-8 text-white">
            <h2 className="font-display text-xl font-bold mb-3">অর্ডার ট্র্যাকিং</h2>
            <p className="text-white/80 leading-7 mb-5">
              ওয়েবসাইটের Track Order পেজ অথবা আমাদের হটলাইনের মাধ্যমে অর্ডারের তথ্য জানতে পারবেন।
            </p>
            <a href="tel:01999478203" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white font-medium hover:bg-primary-light transition-colors">
              <Phone size={18} /> 01999478203
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
