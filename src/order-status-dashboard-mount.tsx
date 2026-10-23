import { createRoot, Root } from 'react-dom/client';
import OrderStatusDashboard from './OrderStatusDashboard';

let mountedRoot: Root | null = null;
let mountedElement: HTMLDivElement | null = null;

function mountOrderDashboard() {
  const isOrdersPage = new URLSearchParams(window.location.search).get('tab') === 'orders';
  const heading = Array.from(document.querySelectorAll('h3')).find((node) =>
    node.textContent?.includes('All Orders')
  );

  if (!isOrdersPage || !heading) {
    if (mountedRoot && mountedElement) {
      mountedRoot.unmount();
      mountedElement.remove();
      mountedRoot = null;
      mountedElement = null;
    }
    return;
  }

  const orderList = heading.parentElement?.parentElement;
  if (!orderList || mountedRoot) return;

  const host = document.createElement('div');
  host.setAttribute('data-order-status-dashboard', 'true');
  orderList.parentElement?.insertBefore(host, orderList);
  mountedElement = host;
  mountedRoot = createRoot(host);
  mountedRoot.render(<OrderStatusDashboard />);
}

const observer = new MutationObserver(() => mountOrderDashboard());

function start() {
  observer.observe(document.body, { childList: true, subtree: true });
  mountOrderDashboard();
  window.setInterval(mountOrderDashboard, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
