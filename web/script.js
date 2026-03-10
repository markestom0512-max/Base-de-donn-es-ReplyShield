/* ReplyShield — JS */

// ── Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Burger menu
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

burger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.mobile-link, .btn-mobile').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
});

// ── Scroll reveal
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

const style = document.createElement('style');
style.textContent = `
  .reveal { opacity: 0; transform: translateY(32px); transition: opacity .6s ease, transform .6s ease; }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .reveal-delay-1 { transition-delay: .1s; }
  .reveal-delay-2 { transition-delay: .2s; }
  .reveal-delay-3 { transition-delay: .3s; }
`;
document.head.appendChild(style);

const revealTargets = [
  '.service-card',
  '.step',
  '.pricing-card',
  '.why-card',
  '.devis-card',
  '.section-title',
  '.section-sub',
  '.section-label',
  '.hero-stats',
  '.contact-box',
];

revealTargets.forEach(selector => {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.classList.add('reveal');
    if (i === 1) el.classList.add('reveal-delay-1');
    if (i === 2) el.classList.add('reveal-delay-2');
    if (i === 3) el.classList.add('reveal-delay-3');
    observer.observe(el);
  });
});

// ── Contact form
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector('button[type="submit"]');
  btn.textContent = 'Envoi en cours…';
  btn.disabled = true;

  // Simulate async send (replace with real fetch/API call)
  setTimeout(() => {
    contactForm.hidden = true;
    formSuccess.hidden = false;
  }, 1200);
});

// ── Smooth active nav link highlight on scroll
const sections = document.querySelectorAll('section[id], header[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.style.color = link.getAttribute('href') === '#' + entry.target.id
            ? 'var(--white)'
            : '';
        });
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);

sections.forEach(s => sectionObserver.observe(s));
