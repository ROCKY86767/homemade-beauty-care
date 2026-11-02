import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

const LazyLiveChatCustomer = lazy(() => import('./LiveChatCustomer'));

export default function LiveChat() {
  const [shouldMount, setShouldMount] = useState(false);
  const [openOnMount, setOpenOnMount] = useState(false);
  const mountedRef = useRef(false);

  const handleReady = useCallback(() => {
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(() => setShouldMount(true), { timeout: 5000 });
    } else {
      timeoutId = window.setTimeout(() => setShouldMount(true), 4000);
    }

    return () => {
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const openChat = () => {
    if (mountedRef.current) {
      window.dispatchEvent(new Event('hbc:open-live-chat'));
      return;
    }
    setOpenOnMount(true);
    setShouldMount(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openChat}
        aria-label="Open live chat"
        className="fixed right-4 bottom-36 z-[65] flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg sm:bottom-24"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
          <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2.5" />
        </svg>
      </button>
      {shouldMount && (
        <Suspense fallback={null}>
          <LazyLiveChatCustomer initialOpen={openOnMount} onReady={handleReady} />
        </Suspense>
      )}
    </>
  );
}
