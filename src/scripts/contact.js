import { 
  createElement,
  MapPin, 
  Phone, 
  Clock, 
  Send, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Heart,
  ArrowRight,
  Calendar
} from 'lucide';

function init() {
  initMobileNav();
  renderContactIcons();
  initContactActions();
}

function initMobileNav() {
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!mobileToggle || !mobileMenu) return;

  const setMenuState = (open) => {
    mobileMenu.classList.toggle('open', open);
    mobileToggle.classList.toggle('is-open', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
  };

  mobileToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuState(!mobileMenu.classList.contains('open'));
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setMenuState(false));
  });

  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
      if (mobileMenu.classList.contains('open')) {
        setMenuState(false);
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function initContactActions() {
  // Copy to clipboard buttons
  const copyButtons = document.querySelectorAll('[data-copy]');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const textToCopy = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span style="color:#ffffff;font-size:0.8rem;font-weight:700;">Copied!</span>';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          renderContactIcons();
        }, 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });
  });

  // Contact Form Submission
  const contactForm = document.getElementById('contactForm');
  const contactSuccessNotice = document.getElementById('contactSuccessNotice');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (contactSuccessNotice) {
        contactSuccessNotice.style.display = 'block';
        contactForm.reset();
        setTimeout(() => {
          contactSuccessNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    });
  }
}

function renderContactIcons() {
  const iconMap = {
    'map-pin': MapPin,
    'phone': Phone,
    'clock': Clock,
    'send': Send,
    'copy': Copy,
    'check': Check,
    'external-link': ExternalLink,
    'shield-check': ShieldCheck,
    'sparkles': Sparkles,
    'heart': Heart,
    'arrow-right': ArrowRight,
    'calendar': Calendar,
  };

  document.querySelectorAll('[data-lucide]').forEach(el => {
    const iconName = el.getAttribute('data-lucide');
    const IconComponent = iconMap[iconName];
    if (IconComponent) {
      const size = el.getAttribute('data-size') || 18;
      const svgEl = createElement(IconComponent, {
        width: size,
        height: size,
        'stroke-width': 2,
        class: el.getAttribute('class') || '',
      });
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle) svgEl.setAttribute('style', inlineStyle);
      el.replaceWith(svgEl);
    }
  });
}

