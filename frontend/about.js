/**
 * FreshCheck - About Page Controller
 */

const ABOUT_DETAILS = {
  'mission': {
    title: 'Our Mission & Vision',
    icon: 'fa-bullseye',
    content: `
      Over 1.3 billion tons of food is wasted globally each year. FreshCheck was built to empower households, restaurants, and grocery stores with predictive vision intelligence.
      <br/><br/>
      Our primary goal is to turn reactive waste management into proactive, intelligent storage habits.
    `
  },
  'technology': {
    title: 'Our AI Technology Stack',
    icon: 'fa-microchip',
    content: `
      FreshCheck utilizes deep convolutional neural networks (CNNs) trained on vast datasets of agricultural produce, dairy, and perishables.
      <br/><br/>
      The models continuously improve through transfer learning, delivering real-time, micro-texture freshness scores directly to your screen within milliseconds.
    `
  },
  'impact': {
    title: 'Environmental & Financial Impact',
    icon: 'fa-earth-americas',
    content: `
      By extending food utility windows and providing timely moderate-decay reminders, active FreshCheck users reduce household food waste by up to 38% and save hundreds annually on grocery expenditure.
    `
  },
  'security': {
    title: 'Privacy & Infrastructure Security',
    icon: 'fa-shield-halved',
    content: `
      All image processing and inventory logs are encrypted end-to-end. We adhere to modern data privacy standards, ensuring user food usage trends and personal data remain strictly private and protected.
    `
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initNavIndicator();
});

/**
 * Handles sliding active line navigation animation
 */
function initNavIndicator() {
  const navLinks = document.querySelectorAll('.nav-link');
  const indicator = document.getElementById('navIndicator');

  function updateIndicator(element) {
    if (!element) return;
    
    indicator.style.width = `${element.offsetWidth}px`;
    indicator.style.left = `${element.offsetLeft}px`;

    navLinks.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
  }

  // Set initial position to 'About' active tab
  const activeLink = document.querySelector('.nav-link.active') || navLinks[3];
  updateIndicator(activeLink);

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      updateIndicator(e.target);
    });
  });

  window.addEventListener('resize', () => {
    const currentActive = document.querySelector('.nav-link.active');
    updateIndicator(currentActive);
  });
}

/**
 * Slide to detail drawer on pillar card click
 */
function scrollToAboutDetail(key) {
  const data = ABOUT_DETAILS[key];
  if (!data) return;

  const drawer = document.getElementById('aboutDrawer');
  const title = document.getElementById('aboutDrawerTitle');
  const content = document.getElementById('aboutDrawerContent');

  title.innerHTML = `<i class="fa-solid ${data.icon}"></i> ${data.title}`;
  content.innerHTML = data.content;

  drawer.classList.add('active');

  // Smooth slide down to drawer without changing page
  drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAboutDrawer() {
  const drawer = document.getElementById('aboutDrawer');
  drawer.classList.remove('active');
}