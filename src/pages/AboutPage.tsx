import { Link } from 'react-router-dom';
import { Leaf, Heart, ShieldCheck, Truck, Award, Sparkles } from 'lucide-react';

const VALUES = [
  { icon: Leaf, title: 'প্রাকৃতিক উপাদান', desc: 'আমাদের পণ্য প্রাকৃতিক ও ভেষজ উপাদানে তৈরি, যা আপনার চুল ও ত্বকের প্রতি মৃদু।' },
  { icon: Heart, title: 'যত্নে তৈরি', desc: 'প্রতিটি পণ্য ঘরোয়া যত্নের অনুপ্রেরণায় তৈরি, আপনার সৌন্দর্যচর্চাকে আরও সহজ করতে।' },
  { icon: ShieldCheck, title: 'গুণগত মান', desc: 'পণ্যের মান ও ব্যবহারকারীর অভিজ্ঞতাকে আমরা সবচেয়ে গুরুত্ব দেই।' },
  { icon: Truck, title: 'সারা বাংলাদেশে', desc: 'বাংলাদেশের বিভিন্ন প্রান্তে আমাদের পণ্য পৌঁছে দেওয়ার ব্যবস্থা রয়েছে।' },
  { icon: Award, title: 'কাস্টমার আস্থা', desc: 'আমাদের কাস্টমারদের আস্থাই আমাদের সবচেয়ে বড় অর্জন।' },
  { icon: Sparkles, title: 'প্রতিদিনের যত্ন', desc: 'আপনার beauty routine সহজ করার লক্ষ্য নিয়ে আমাদের পণ্য নির্বাচন করা হয়।' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative h-[320px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/4841326/pexels-photo-4841326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
          alt="About us"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark/70 to-dark/30" />
        <div className="relative h-full flex items-center section-padding">
          <div className="max-w-xl text-white">
            <h1 className="font-display text-4xl font-bold mb-3">আমাদের সম্পর্কে</h1>
            <p className="text-white/80 text-lg">প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া</p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="section-padding max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-dark mb-6">আমাদের যাত্রা</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-lg">
            <p>
              Homemade Beauty Care একটি বাংলাদেশী প্রাকৃতিক স্কিনকেয়ার ও হেয়ারকেয়ার ব্র্যান্ড।
              আমরা বিশ্বাস করি, সৌন্দর্যচর্চা হওয়া উচিত সহজ, প্রাকৃতিক ও নিরাপদ।
            </p>
            <p>
              ঘরোয়া যত্নের অনুপ্রেরণায় তৈরি আমাদের পণ্যগুলো প্রাকৃতিক ও ভেষজ উপাদানে নির্মিত।
              আমাদের লক্ষ্য আপনার প্রতিদিনের beauty routine কে আরও সহজ ও সুন্দর করে তোলা।
            </p>
            <p>
              চুল ও ত্বকের দৈনন্দিন যত্নকে আরও সহজ ও সুন্দর করার জন্য আমাদের যাত্রা শুরু।
              সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সেবা গ্রহণযোগ্য।
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-cream">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-dark">আমাদের মূল্যবোধ</h2>
            <p className="mt-2 text-gray-500">যে নীতিতে আমরা বিশ্বাস করি</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((value, idx) => (
              <div key={idx} className="card p-6 border border-gray-50 hover:shadow-lg transition-shadow">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <value.icon size={28} />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="section-padding text-center">
          <h2 className="font-display text-3xl font-bold text-dark mb-3">আমাদের পণ্য দেখুন</h2>
          <p className="text-gray-500 mb-6">প্রাকৃতিক যত্নে তৈরি পণ্যগুলো এখনই বেছে নিন।</p>
          <Link to="/shop" className="btn-primary">এখনই শপ করুন</Link>
        </div>
      </section>
    </div>
  );
}
