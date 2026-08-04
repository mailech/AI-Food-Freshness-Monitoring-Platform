/**
 * FreshCheck - Top Navigation Indicator & Feature Controller
 */

const FEATURE_DETAILS = {
  'image-analysis': {
    title: 'AI Image Analysis',
    icon: 'fa-image',
    content: `
      Our computer vision models instantly scan photos of uploaded produce, meals, and ingredients. 
      The system evaluates surface patterns, discoloration, and texture, delivering instant freshness feedback.
    `
  },
  'freshness-detection': {
    title: 'Freshness Detection',
    icon: 'fa-leaf',
    content: `
      Categorizes scanned food items into 3 operational states:
      <br/><br/>
      • <strong style="color:#4ade80;">Fresh:</strong> Optimal condition for storage or consumption.<br/>
      • <strong style="color:#fde047;">Moderate:</strong> Early signs of aging; consume within 24–48 hours.<br/>
      • <strong style="color:#fca5a5;">Rotten:</strong> Unsafe for consumption; dispose immediately.
    `
  },
  'freshness-score': {
    title: 'Freshness Score Percentage',
    icon: 'fa-chart-line',
    content: `
      Provides an exact score from 0% to 100% calculated based on decay parameters, surface degradation, and item shelf-life data.
    `
  },
  'spoilage-detection': {
    title: 'Early Spoilage Detection',
    icon: 'fa-triangle-exclamation',
    content: `
      Identifies non-visible signs of decay before visible mold forms, keeping neighboring produce safe from contamination.
    `
  },
  'inventory-monitoring': {
    title: 'Smart Inventory Monitoring',
    icon: 'fa-clipboard-list',
    content: `
      Tracks all logged food items alongside their current degradation stage, helping you organize consumption seamlessly.
    `
  },
  'smart-alerts': {
    title: 'Automated Smart Alerts',
    icon: 'fa-bell',
    content: `
      Sends timely desktop and mobile push notifications whenever items transition into moderate or critical stages.
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
    
    // Set line position and width based on active link
    indicator.style.width = `${element.offsetWidth}px`;
    indicator.style.left = `${element.offsetLeft}px`;

    // Highlight text color
    navLinks.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
  }

  // Position indicator at active link initially
  const activeLink = document.querySelector('.nav-link.active') || navLinks[0];
  updateIndicator(activeLink);

  // Smooth slide on click
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      updateIndicator(e.target);
    });
  });

  // Keep indicator aligned on window resize
  window.addEventListener('resize', () => {
    const currentActive = document.querySelector('.nav-link.active');
    updateIndicator(currentActive);
  });
}

/**
 * Slide to detail drawer on feature click
 */
function scrollToDetail(featureKey) {
  const detailData = FEATURE_DETAILS[featureKey];
  if (!detailData) return;

  const drawer = document.getElementById('detailDrawer');
  const title = document.getElementById('drawerTitle');
  const content = document.getElementById('drawerContent');

  title.innerHTML = `<i class="fa-solid ${detailData.icon}"></i> ${detailData.title}`;
  content.innerHTML = detailData.content;

  drawer.classList.add('active');

  // Smooth scroll down to drawer
  drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDrawer() {
  const drawer = document.getElementById('detailDrawer');
  drawer.classList.remove('active');
}