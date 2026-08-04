/**
 * FreshCheck - How It Works Controller
 */

const STEP_DETAILS = {
  'step-1': {
    title: 'Step 1: Capture & Upload Image',
    icon: 'fa-camera',
    content: `
      Simply take a quick photo using your smartphone camera or upload existing images of fruits, vegetables, dairy, or cooked dishes. 
      <br/><br/>
      Our ingestion pipeline automatically optimizes brightness, contrast, and resolution parameters before running inference.
    `
  },
  'step-2': {
    title: 'Step 2: AI Neural Network Processing',
    icon: 'fa-brain',
    content: `
      The uploaded image passes through trained convolutional neural networks (CNNs) capable of identifying micro-texture variations, oxidation discoloration, and structural breakdown.
      <br/><br/>
      The model compares features against thousands of fresh and spoiled food datasets for accurate results.
    `
  },
  'step-3': {
    title: 'Step 3: Score & Classification Output',
    icon: 'fa-chart-pie',
    content: `
      Within seconds, the platform displays an interactive diagnostics report containing:
      <br/><br/>
      • <strong style="color:#22c55e;">Freshness Rating:</strong> Classified into Fresh, Moderate, or Rotten.<br/>
      • <strong style="color:#22c55e;">Quality Index:</strong> Precise percentage score indicating remaining shelf life.<br/>
      • <strong style="color:#22c55e;">Safety Warnings:</strong> Specific alerts regarding potential spoilage.
    `
  },
  'step-4': {
    title: 'Step 4: Real-time Inventory & Smart Reminders',
    icon: 'fa-bell',
    content: `
      Log analyzed items directly into your active dashboard inventory. The system recalculates remaining degradation windows daily and pushes timely alerts to your browser or email before items reach critical decay stages.
    `
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initNavIndicator();
});

/**
 * Handles sliding line navigation animation
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

  // Set line position on current active tab ('How It Works')
  const activeLink = document.querySelector('.nav-link.active') || navLinks[2];
  updateIndicator(activeLink);

  // Smooth slide on click
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      updateIndicator(e.target);
    });
  });

  // Maintain position on window resize
  window.addEventListener('resize', () => {
    const currentActive = document.querySelector('.nav-link.active');
    updateIndicator(currentActive);
  });
}

/**
 * In-page slide scroll to step drawer detail
 */
function scrollToStepDetail(stepKey) {
  const stepData = STEP_DETAILS[stepKey];
  if (!stepData) return;

  const drawer = document.getElementById('stepDrawer');
  const title = document.getElementById('stepDrawerTitle');
  const content = document.getElementById('stepDrawerContent');

  title.innerHTML = `<i class="fa-solid ${stepData.icon}"></i> ${stepData.title}`;
  content.innerHTML = stepData.content;

  drawer.classList.add('active');

  // Smooth scroll down to drawer without changing page
  drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeStepDrawer() {
  const drawer = document.getElementById('stepDrawer');
  drawer.classList.remove('active');
}