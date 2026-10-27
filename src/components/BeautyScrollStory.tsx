import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Leaf, Droplets, ShieldCheck, Sparkles } from 'lucide-react';

/**
 * Additive scroll-story section inspired by cinematic product storytelling.
 * It is intentionally self-contained so it does not replace the existing storefront,
 * banner management, products, cart, checkout, or analytics.
 */
const PORTRAIT = 'https://assets.uberdesigner.ai/lucent/portrait.webp';
const LAYERS = [
  'https://assets.uberdesigner.ai/lucent/lens-1.webp',
  'https://assets.uberdesigner.ai/lucent/lens-2.webp',
  'https://assets.uberdesigner.ai/lucent/lens-3.webp',
  'https://assets.uberdesigner.ai/lucent/lens-4.webp',
];
const FEATURES = [
  { title: 'পুষ্টির যত্ন', en: 'Nourish', copy: 'চুল ও ত্বকের দৈনন্দিন যত্নে প্রকৃতির অনুপ্রেরণা।', icon: Leaf, number: '01' },
  { title: 'আর্দ্রতার ছোঁয়া', en: 'Moisture', copy: 'ত্বকের কোমলতা ও সতেজ অনুভূতিকে গুরুত্ব দিন।', icon: Droplets, number: '02' },
  { title: 'সুরক্ষার স্তর', en: 'Protection', copy: 'আপনার প্রতিদিনের রুটিনে যত্নের সহজ অভ্যাস।', icon: ShieldCheck, number: '03' },
  { title: 'নিজের জন্য সময়', en: 'Ritual', copy: 'প্রতিটি মুহূর্তে নিজের প্রতি একটু ভালোবাসা।', icon: Sparkles, number: '04' },
];

export default function BeautyScrollStory() {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomRef = useRef({ zoom: 0, spread: 0 });
  const [active, setActive] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!root || !canvas || !ctx) return;
    let disposed = false;
    let raf = 0;
    let drawRaf = 0;
    let bitmap: ImageBitmap | null = null;
    let lastW = 0, lastH = 0, lastDpr = 0, lastZoom = -1, lastSpread = -1;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const image = new Image();
    image.crossOrigin = 'anonymous';

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (rect.width === lastW && rect.height === lastH && dpr === lastDpr) return;
      lastW = rect.width; lastH = rect.height; lastDpr = dpr;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      lastZoom = -1;
    };

    const draw = () => {
      if (disposed) return;
      resize();
      const w = lastW, h = lastH;
      if (!bitmap || !w || !h) return;
      const zoom = reduced ? 0 : zoomRef.current.zoom;
      const spread = reduced ? 1 : zoomRef.current.spread;
      if (Math.abs(zoom - lastZoom) < .001 && Math.abs(spread - lastSpread) < .001) return;
      lastZoom = zoom; lastSpread = spread;
      const s0 = Math.max(w / bitmap.width, h / bitmap.height);
      const s1 = Math.max(w / bitmap.width, h / bitmap.height) * (1 + zoom * 2.7);
      const scale = s0 + (s1 - s0) * zoom;
      const sourceW = w / scale, sourceH = h / scale;
      const cx = bitmap.width / 2, cy = bitmap.height * .40;
      const sx = Math.max(0, Math.min(bitmap.width - sourceW, cx - sourceW / 2));
      const sy = Math.max(0, Math.min(bitmap.height - sourceH, cy - sourceH / 2));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, sx, sy, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
      root.style.setProperty('--story-spread', String(spread));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        const travel = Math.max(1, root.offsetHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -rect.top / travel));
        zoomRef.current.zoom = reduced ? 0 : Math.min(1, Math.max(0, (progress - .04) / .42));
        zoomRef.current.spread = reduced ? 1 : Math.min(1, Math.max(0, (progress - .68) / .23));
        root.style.setProperty('--story-progress', String(progress));
        root.style.setProperty('--story-wash', String(Math.min(1, Math.max(0, (progress - .48) / .23))));
        root.style.setProperty('--story-scanner', String(reduced ? 0 : Math.min(1, Math.max(0, (progress - .18) / .28)) * (1 - Math.min(1, Math.max(0, (progress - .53) / .12)))));
        root.style.setProperty('--story-lens', String(Math.min(1, Math.max(0, (progress - .56) / .17))));
        draw();
      });
    };

    const observer = new ResizeObserver(() => { resize(); draw(); });
    observer.observe(canvas);
    image.onload = async () => {
      try {
        bitmap = await createImageBitmap(image);
        if (disposed) { bitmap.close(); return; }
        setReady(true);
        root.style.setProperty('--story-canvas-opacity', '1');
        root.style.setProperty('--story-intro-ready', '1');
        resize();
        draw();
        onScroll();
      } catch (error) {
        console.error('Beauty story portrait could not be prepared:', error);
      }
    };
    image.onerror = () => console.error('Beauty story portrait failed to load.');
    image.src = PORTRAIT;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(drawRaf);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      bitmap?.close();
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>('[data-story-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach(el => el.classList.add('hbc-story-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('hbc-story-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .15 });
    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [ready]);

  return (
    <section ref={rootRef} className="hbc-story" aria-label="প্রকৃতির যত্নের গল্প">
      <style>{STORY_CSS}</style>
      <div className="hbc-story-pin">
        <div className="hbc-story-stage" aria-hidden="true">
          <canvas ref={canvasRef} className="hbc-story-canvas" />
          <div className="hbc-story-wash" />
          <div className="hbc-story-scan-wrap">
            <svg className="hbc-story-scan" viewBox="-320 -320 640 640" role="presentation">
              <defs>
                <clipPath id="hbc-story-iris-clip"><circle r="205" /></clipPath>
                <filter id="hbc-story-bloom" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor="#8FA36F" floodOpacity=".95" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g className="hbc-story-scan-lines" clipPath="url(#hbc-story-iris-clip)">
                {Array.from({ length: 51 }, (_, i) => <path key={i} d={`M -205 ${-201 + i * 8} H 205`} />)}
              </g>
              <g className="hbc-story-mesh">
                <circle r="150" /><circle r="190" />
                {Array.from({ length: 24 }, (_, i) => {
                  const a = i * Math.PI / 12;
                  return <g key={i}><path d={`M ${Math.cos(a) * 105} ${Math.sin(a) * 105} L ${Math.cos(a) * 190} ${Math.sin(a) * 190}`} /><circle cx={Math.cos(a) * 190} cy={Math.sin(a) * 190} r="1.6" /></g>;
                })}
              </g>
              <g className="hbc-story-strokes" filter="url(#hbc-story-bloom)">
                <g className="hbc-story-ring"><path d="M -132.50 229.50 A 265 265 0 0 1 -58.50 -258.50" /><path d="M 0 -265 A 265 265 0 0 1 197 -177" /><path d="M 234 -124 A 265 265 0 0 1 132.5 229.5" /></g>
                <path d="M 0 0 H -300" /><path d="M 0 0 H 305" />
                <path d="M 0 -80 A 80 80 0 1 1 0 80 A 80 80 0 1 1 0 -80" />
                <path d="M 0 105 A 105 105 0 1 1 0 -105 A 105 105 0 1 1 0 105" />
              </g>
            </svg>
          </div>
          <div className="hbc-story-layers">
            {LAYERS.map((src, index) => <div key={src} className="hbc-story-layer" data-active={active === index} style={{ '--layer-index': index, '--layer-offset': index - 1.5 } as React.CSSProperties}>
              <img src={src} alt="" width={[631, 587, 581, 569][index]} height="1100" loading="lazy" />
              <span className="hbc-story-glow" />
            </div>)}
          </div>
        </div>

        <div className="hbc-story-track">
          <div className="hbc-story-hero">
            <div className="hbc-story-intro" data-story-reveal>
              <p className="hbc-story-eyebrow">প্রকৃতির ছোঁয়ায় প্রতিদিনের যত্ন</p>
              <h2 aria-label="নিজের যত্নে নতুন অনুভূতি।"><span>নিজের যত্নে</span><span className="hbc-story-blue">নতুন অনুভূতি।</span></h2>
            </div>
            <div className="hbc-story-callout" data-story-reveal>
              <div className="hbc-story-callout-copy"><span>Daily Care</span><strong>প্রতিদিন একটু ভালোবাসা</strong></div>
              <img src="https://assets.uberdesigner.ai/lucent/eye-card.webp" alt="সৌন্দর্য ও যত্নের অনুপ্রেরণামূলক ছবি" width="940" height="788" loading="lazy" />
            </div>
            <div className="hbc-story-bottom" data-story-reveal>
              <p>চুল ও ত্বকের যত্নকে করুন নিজের প্রতিদিনের সুন্দর অভ্যাস। প্রকৃতির অনুপ্রেরণায় বেছে নিন আপনার পছন্দের কেয়ার রুটিন।</p>
              <div className="hbc-story-actions"><a href="/shop">সব পণ্য দেখুন <ArrowUpRight size={17} /></a><a href="/category/hair-care">Hair Care</a></div>
            </div>
            <div className="hbc-story-scroll-hint"><span>স্ক্রল করুন</span><i><ArrowDown size={17} /></i></div>
          </div>
          <div className="hbc-story-features">
            <div className="hbc-story-features-head">
              <h2><span>চার ধাপের যত্ন।</span><span className="hbc-story-blue">একটি সুন্দর অভ্যাস।</span></h2>
              <p>নিজের যত্নকে আরও সহজ, আনন্দময় এবং নিয়মিত করে তুলতে প্রতিটি ধাপ সাজানো হয়েছে আপনার দৈনন্দিন রুটিনের কথা ভেবে।</p>
            </div>
            <div className="hbc-story-feature-cards">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return <article key={feature.number} tabIndex={0} data-active={active === index} onPointerEnter={e => { if (e.pointerType === 'mouse') setActive(index); }} onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(null); }} onFocus={() => setActive(index)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null); }} className="hbc-story-card">
                  <div className="hbc-story-card-head"><h3>{feature.title}</h3><span>{feature.number}</span></div>
                  <p className="hbc-story-card-en">{feature.en}</p><p className="hbc-story-card-copy">{feature.copy}</p>
                  <div className="hbc-story-card-arrow"><ArrowUpRight size={20} /></div>
                </article>;
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="hbc-story-cursor" aria-hidden="true" />
    </section>
  );
}

const STORY_CSS = `
.hbc-story{--story-progress:0;--story-wash:0;--story-scanner:0;--story-lens:0;--story-spread:0;position:relative;height:300svh;background:#F7F4EA;color:#263A2D;isolation:isolate;font-family:'Hind Siliguri',sans-serif}
.hbc-story *{box-sizing:border-box}.hbc-story-pin{position:sticky;top:0;height:100svh;min-height:620px;overflow:hidden;background:#F7F4EA}.hbc-story-stage{position:absolute;inset:0;pointer-events:none}.hbc-story-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:var(--story-canvas-opacity,0);filter:blur(calc((1 - var(--story-intro-ready,0))*20px));transition:filter .6s ease;object-fit:cover}.hbc-story-wash{position:absolute;inset:0;background:#F7F4EA;opacity:var(--story-wash)}.hbc-story-scan-wrap{position:absolute;left:50%;top:50%;width:min(640px,95vw,75svh);aspect-ratio:1;transform:translate(-50%,-50%);mix-blend-mode:screen;opacity:var(--story-scanner)}.hbc-story-scan{display:block;width:100%;height:100%;overflow:visible;transform:scale(calc(.9 + var(--story-scanner)*.1));color:#D8FDFF}.hbc-story-scan-lines{fill:none;stroke:white;stroke-width:1;stroke-opacity:.25;opacity:var(--story-scanner)}.hbc-story-mesh{fill:none;stroke:white;stroke-width:.75;stroke-opacity:.7;opacity:var(--story-scanner)}.hbc-story-mesh circle{fill:none}.hbc-story-mesh g circle{fill:white;stroke:none}.hbc-story-strokes{fill:none;stroke:#D8FDFF;stroke-width:2.5;stroke-linecap:round;stroke-dasharray:1000;stroke-dashoffset:calc((1 - var(--story-scanner))*1000);opacity:var(--story-scanner)}.hbc-story-ring{transform-origin:0 0;transform:rotate(calc(-20deg + var(--story-progress)*45deg))}.hbc-story-layers{position:absolute;left:50%;top:50%;width:0;height:0;opacity:var(--story-lens);transform:scale(calc(1.6 - var(--story-lens)*.6));filter:blur(calc((1 - var(--story-lens))*16px))}.hbc-story-layer{position:absolute;left:0;top:0;width:auto;transform:translate(calc(-50% + var(--layer-offset)*170px*var(--story-spread)),-50%);transition:transform .2s cubic-bezier(.22,1,.36,1)}.hbc-story-layer img{display:block;height:min(480px,62svh);width:auto;max-width:none;object-fit:contain}.hbc-story-layer[data-active=true] .hbc-story-glow{opacity:1}.hbc-story-glow{position:absolute;left:50%;top:50%;width:28px;height:28px;border-radius:50%;background:#D9FFFF;opacity:0;transform:translate(-50%,-50%);box-shadow:0 0 0 2px #5F7448,0 0 34px 10px rgb(95 116 72 / .35);transition:opacity .3s}.hbc-story-track{position:absolute;top:0;left:0;right:0;height:200svh;will-change:transform;transform:translate3d(0,calc(var(--story-progress)*-50%),0);}.hbc-story-hero,.hbc-story-features{position:relative;height:100svh;min-height:620px;padding:calc(80px + 4.5svh) clamp(20px,4vw,58px) 40px;display:flex;flex-direction:column;justify-content:space-between}.hbc-story-hero{color:white}.hbc-story-intro{max-width:min(660px,68vw);opacity:1}.hbc-story-cursor{display:none}@media(hover:hover) and (pointer:fine){body.hbc-story-cursor-on,body.hbc-story-cursor-on a,body.hbc-story-cursor-on button,body.hbc-story-cursor-on [tabindex]{cursor:none!important}.hbc-story-cursor{display:block;position:fixed;left:0;top:0;width:40px;height:40px;border-radius:50%;background:rgba(140,140,140,.6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.7);pointer-events:none;z-index:9999;opacity:0;transition:opacity .2s linear;will-change:transform;mix-blend-mode:normal}}.hbc-story-eyebrow{font-size:clamp(13px,1.25vw,18px);margin-bottom:16px;color:rgba(255,255,255,.78)}.hbc-story-intro h2,.hbc-story-features-head h2{font-family:'Playfair Display',serif;font-size:clamp(40px,5vw,72px);font-weight:500;line-height:.98;letter-spacing:-.045em}.hbc-story-intro h2 span,.hbc-story-features-head h2 span{display:block}.hbc-story-blue{color:#A7C78B}.hbc-story-callout{position:absolute;right:clamp(20px,4vw,58px);top:16%;width:clamp(210px,21vw,300px);padding:14px;border-radius:28px;background:rgba(255,255,255,.93);color:#263A2D;box-shadow:0 20px 60px rgba(0,0,0,.16);backdrop-filter:blur(14px)}.hbc-story-callout-copy{display:flex;flex-direction:column;gap:4px;padding:4px 4px 12px}.hbc-story-callout-copy span{font-size:12px;color:#5F7448;text-transform:uppercase;letter-spacing:.12em}.hbc-story-callout-copy strong{font-size:15px}.hbc-story-callout img{width:100%;height:125px;object-fit:cover;border-radius:18px}.hbc-story-bottom{width:min(430px,48vw)}.hbc-story-bottom>p{font-size:clamp(15px,1.25vw,18px);line-height:1.65;margin-bottom:24px}.hbc-story-actions{display:flex;flex-wrap:wrap;gap:12px}.hbc-story-actions a{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 20px;border-radius:999px;background:#F7F4EA;color:#263A2D;text-decoration:none;font-weight:600;transition:transform .2s,box-shadow .2s}.hbc-story-actions a+ a{background:transparent;border:1px solid rgba(255,255,255,.65);color:white}.hbc-story-actions a:hover{transform:scale(1.03);box-shadow:0 12px 30px rgba(0,0,0,.15)}.hbc-story-scroll-hint{position:absolute;right:clamp(20px,4vw,58px);bottom:40px;display:flex;align-items:center;gap:12px;font-size:15px}.hbc-story-scroll-hint i{width:40px;height:40px;display:grid;place-items:center;border-radius:50%;background:white;color:#5F7448;font-style:normal}.hbc-story-features{color:#263A2D;background:#F7F4EA;padding-top:calc(80px + 4.5svh)}.hbc-story-features-head{display:flex;align-items:flex-start;justify-content:space-between;gap:30px}.hbc-story-features-head h2{font-size:clamp(36px,5vw,72px);flex:1}.hbc-story-features-head>p{max-width:330px;font-size:clamp(14px,1.25vw,18px);line-height:1.65}.hbc-story-feature-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:end;gap:12px;margin-top:auto}.hbc-story-card{min-width:0;padding:clamp(16px,2vw,28px);border-radius:24px;background:white;box-shadow:0 8px 30px rgba(38,58,45,.06);outline:none;transition:background .3s cubic-bezier(.22,1,.36,1),color .3s,transform .3s,box-shadow .3s;cursor:pointer}.hbc-story-card:focus-visible{box-shadow:0 0 0 3px #5F7448,0 12px 30px rgba(38,58,45,.12)}.hbc-story-card[data-active=true]{background:#5F7448;color:white;transform:translateY(-16px);box-shadow:0 20px 42px rgba(38,58,45,.2)}.hbc-story-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.hbc-story-card h3{font-size:clamp(17px,1.65vw,24px);font-weight:600;color:#5F7448}.hbc-story-card-head span{font-size:13px;color:#A4A4A4}.hbc-story-card[data-active=true] h3,.hbc-story-card[data-active=true] .hbc-story-card-head span,.hbc-story-card[data-active=true] .hbc-story-card-en{color:white}.hbc-story-card-en{margin-top:12px;color:#8A9A70;font-size:12px;text-transform:uppercase;letter-spacing:.1em}.hbc-story-card-copy{margin-top:12px;font-size:clamp(13px,1.12vw,16px);line-height:1.6}.hbc-story-card-arrow{display:flex;justify-content:flex-end;max-height:0;overflow:hidden;opacity:0;transition:max-height .3s,opacity .3s,margin-top .3s}.hbc-story-card[data-active=true] .hbc-story-card-arrow{max-height:40px;opacity:1;margin-top:20px}.hbc-story-card[data-active=true]~.hbc-story-layer .hbc-story-glow{opacity:1}.hbc-story [data-story-reveal]{opacity:0;transform:translateY(20px);filter:blur(8px);transition:opacity .65s,transform .65s,filter .65s}.hbc-story .hbc-story-visible{opacity:1!important;transform:none!important;filter:none!important}.hbc-story:has(.hbc-story-canvas) .hbc-story-hero{background:linear-gradient(90deg,rgba(20,36,27,.65),rgba(20,36,27,.08))}.hbc-story:has(.hbc-story-wash[style*="1"]) .hbc-story-hero{color:#263A2D}@media(max-width:1023px){.hbc-story{height:300svh}.hbc-story-track{height:200svh}.hbc-story-pin{min-height:560px}.hbc-story-hero,.hbc-story-features{padding:90px 20px 24px;min-height:560px}.hbc-story-intro{max-width:100%}.hbc-story-intro h2,.hbc-story-features-head h2{font-size:clamp(38px,9.6vw,54px)}.hbc-story-callout,.hbc-story-scroll-hint{display:none}.hbc-story-bottom{width:100%;max-width:500px}.hbc-story-bottom>p{font-size:15px}.hbc-story-features-head{display:block}.hbc-story-features-head>p{margin-top:18px;max-width:100%;font-size:14px}.hbc-story-feature-cards{display:flex;gap:12px;overflow-x:auto;margin: auto -20px 0;padding:12px 20px 18px;scroll-snap-type:x mandatory;scroll-padding:0 20px;scrollbar-width:none}.hbc-story-feature-cards::-webkit-scrollbar{display:none}.hbc-story-card{flex:0 0 280px;padding:24px;scroll-snap-align:start}.hbc-story-layer{transform:translate(calc(-50% + var(--layer-offset)*78px*var(--story-spread)),-50%)}.hbc-story-layer img{height:280px}.hbc-story-scan-wrap{width:min(457px,95vw,65svh)}.hbc-story-blue{color:#6F9460}.hbc-story-hero{color:white}.hbc-story-bottom{padding-bottom:10px}}@media(max-width:420px){.hbc-story{height:300svh}.hbc-story-track{height:200svh}.hbc-story-hero,.hbc-story-features{padding-top:84px}.hbc-story-intro h2,.hbc-story-features-head h2{font-size:38px}.hbc-story-actions a{min-height:46px;padding:0 16px;font-size:14px}.hbc-story-card{flex-basis:265px}}@media(prefers-reduced-motion:reduce){.hbc-story *{scroll-behavior:auto!important;transition:none!important;animation:none!important}.hbc-story-canvas{filter:none}.hbc-story-scan-wrap{display:none}.hbc-story-layers{filter:none;opacity:1;transform:none}.hbc-story-layer{transform:translate(calc(-50% + var(--layer-offset)*78px),-50%)}.hbc-story [data-story-reveal]{opacity:1;transform:none;filter:none}}`;
