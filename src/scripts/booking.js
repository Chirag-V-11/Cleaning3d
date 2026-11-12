import { 
  createElement,
  Sparkles, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Phone, 
  ArrowRight,
  Home,
  Check
} from 'lucide';

function init() {
  initMobileNav();
  renderBookingIcons();
  initBookingEngine();
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

function initBookingEngine() {
  const serviceCards = document.querySelectorAll('.service-option-card');
  const bedroomsSelect = document.getElementById('bedrooms');
  const bathroomsSelect = document.getElementById('bathrooms');
  const frequencyRadios = document.querySelectorAll('input[name="frequency"]');
  const addonCheckboxes = document.querySelectorAll('.addon-checkbox');

  // Summary display elements
  const summaryService = document.getElementById('sum-service');
  const summaryPlan = document.getElementById('sum-plan');
  const summarySpecs = document.getElementById('sum-specs');
  const summaryBase = document.getElementById('sum-base');
  const summaryDiscount = document.getElementById('sum-discount');
  const summaryTotal = document.getElementById('sum-total');
  const summaryTime = document.getElementById('sum-time');

  // Booking form & modal
  const bookingForm = document.getElementById('bookingForm');
  const bookingModal = document.getElementById('bookingModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalRefNum = document.getElementById('modalRefNum');

  let selectedService = {
    id: 'emergency-deep',
    name: 'Emergency 2-Hr Deep Clean',
    basePrice: 190,
    baseHours: 3.5,
  };

  // Service Card Click Handler
  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      serviceCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      selectedService = {
        id: card.dataset.id,
        name: card.dataset.name,
        basePrice: parseFloat(card.dataset.price),
        baseHours: parseFloat(card.dataset.hours),
      };

      updateCalculation();
    });
  });

  // Listener attachments
  if (bedroomsSelect) bedroomsSelect.addEventListener('change', updateCalculation);
  if (bathroomsSelect) bathroomsSelect.addEventListener('change', updateCalculation);
  frequencyRadios.forEach(r => r.addEventListener('change', updateCalculation));
  addonCheckboxes.forEach(cb => cb.addEventListener('change', updateCalculation));

  function updateCalculation() {
    const beds = parseInt(bedroomsSelect?.value || '2', 10);
    const baths = parseInt(bathroomsSelect?.value || '2', 10);

    // Bed/Bath increment calculation
    const bedCost = (beds - 1) * 25;
    const bathCost = (baths - 1) * 30;

    // Add-on calculation
    let addonsTotal = 0;
    addonCheckboxes.forEach(cb => {
      if (cb.checked) {
        addonsTotal += parseFloat(cb.dataset.price || 0);
      }
    });

    // Subtotal
    const subtotal = selectedService.basePrice + bedCost + bathCost + addonsTotal;

    // Frequency discount
    let discountRate = 0;
    let frequencyText = 'One-Time Service';
    frequencyRadios.forEach(radio => {
      if (radio.checked) {
        discountRate = parseFloat(radio.dataset.discount || 0);
        frequencyText = radio.dataset.label || 'One-Time Service';
      }
    });

    const discountAmount = subtotal * discountRate;
    const finalTotal = Math.max(0, subtotal - discountAmount);

    // Estimated duration calculation
    const estHours = (selectedService.baseHours + (beds - 1) * 0.4 + (baths - 1) * 0.5).toFixed(1);

    // Update DOM
    if (summaryService) summaryService.textContent = selectedService.name;
    if (summaryPlan) summaryPlan.textContent = frequencyText;
    if (summarySpecs) summarySpecs.textContent = `${beds} Bed, ${baths} Bath`;
    if (summaryBase) summaryBase.textContent = `$${subtotal.toFixed(0)}`;
    if (summaryDiscount) summaryDiscount.textContent = discountRate > 0 ? `-$${discountAmount.toFixed(0)} (${discountRate * 100}%)` : '$0';
    if (summaryTotal) summaryTotal.textContent = `$${finalTotal.toFixed(0)}`;
    if (summaryTime) summaryTime.textContent = `~${estHours} hrs`;
  }

  // Handle Form Submit
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Generate Reference Code
      const randRef = 'OC-' + Math.floor(100000 + Math.random() * 900000);
      if (modalRefNum) modalRefNum.textContent = randRef;

      // Fill modal details
      const modalClientName = document.getElementById('modalClientName');
      const nameInput = document.getElementById('fullName');
      if (modalClientName && nameInput) {
        modalClientName.textContent = nameInput.value;
      }

      // Show Modal
      if (bookingModal) {
        bookingModal.classList.add('active');
      }
    });
  }

  // Close Modal
  if (closeModalBtn && bookingModal) {
    closeModalBtn.addEventListener('click', () => {
      bookingModal.classList.remove('active');
    });
  }

  // Run initial calculation
  updateCalculation();
}

function renderBookingIcons() {
  const iconMap = {
    'sparkles': Sparkles,
    'calendar': Calendar,
    'clock': Clock,
    'shield-check': ShieldCheck,
    'check-circle-2': CheckCircle2,
    'phone': Phone,
    'arrow-right': ArrowRight,
    'home': Home,
    'check': Check,
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

