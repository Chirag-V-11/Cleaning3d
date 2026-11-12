import { 
  createElement,
  Sparkles, 
  Star, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Heart, 
  Users, 
  Calendar, 
  ArrowRight, 
  Check, 
  ExternalLink,
  Zap,
  Home,
  Briefcase
} from 'lucide';
import { initCleaningScene } from './three-scene.js';
import { CinematicIntro } from './cinematic-intro.js';

function init() {
  // 0. Cinematic Opening Splash Screen (Plays first when site opens)
  if (document.getElementById('cinematic-splash-overlay')) {
    try {
      window.introInstance = new CinematicIntro();
    } catch (err) {
      console.warn('Cinematic intro initialization fallback:', err);
      document.body.classList.remove('splash-locked');
      const overlay = document.getElementById('cinematic-splash-overlay');
      if (overlay) overlay.style.display = 'none';
    }
  }

  // 1. Mobile Menu Toggle (Runs first so navigation is guaranteed)
  initMobileNav();

  // 2. Render Lucide Icons
  try {
    renderIcons();
  } catch (err) {
    console.warn('Lucide icons render error:', err);
  }

  // 3. Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // 4. Initialize 3D Canvas safely
  if (document.getElementById('webgl-canvas')) {
    try {
      initCleaningScene();
    } catch (err) {
      console.warn('Three.js canvas init failed:', err);
    }
  }

  // 5. Review Category Filtering (Matches Google Maps chips)
  const filterChips = document.querySelectorAll('.topic-chip[data-filter]');
  const reviewCards = document.querySelectorAll('.review-card[data-category]');

  if (filterChips.length && reviewCards.length) {
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.getAttribute('data-filter');

        filterChips.forEach(c => {
          c.style.backgroundColor = 'var(--c-base)';
          c.style.borderColor = 'var(--c-slate-10)';
          c.style.color = 'var(--c-slate-75)';
        });

        chip.style.backgroundColor = 'var(--c-accent)';
        chip.style.borderColor = 'var(--c-accent)';
        chip.style.color = '#ffffff';

        reviewCards.forEach(card => {
          const categories = card.getAttribute('data-category').split(' ');
          if (filter === 'all' || categories.includes(filter)) {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
            card.style.borderColor = filter === 'all' ? 'var(--c-slate-10)' : 'var(--c-accent)';
          } else {
            card.style.opacity = '0.32';
            card.style.transform = 'scale(0.96)';
            card.style.borderColor = 'var(--c-slate-10)';
          }
        });
      });
    });
  }
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

  // Close on clicking links
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setMenuState(false));
  });

  // Close on clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
      if (mobileMenu.classList.contains('open')) {
        setMenuState(false);
      }
    }
  });
}

// Execute immediately if DOM is already ready, or wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function renderIcons() {
  const iconMap = {
    'sparkles': Sparkles,
    'star': Star,
    'map-pin': MapPin,
    'phone': Phone,
    'clock': Clock,
    'shield-check': ShieldCheck,
    'heart': Heart,
    'users': Users,
    'calendar': Calendar,
    'arrow-right': ArrowRight,
    'check': Check,
    'external-link': ExternalLink,
    'zap': Zap,
    'home': Home,
    'briefcase': Briefcase
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

