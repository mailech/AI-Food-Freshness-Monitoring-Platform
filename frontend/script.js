/**
 * FreshCheck - Navigation & Dynamic Indicator Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const indicator = document.getElementById('navIndicator');

  /**
   * Updates the position and width of the glowing active tab indicator
   * @param {HTMLElement} element - The active navigation link
   */
  function updateIndicator(element) {
    if (!element) return;

    // Set indicator width and position relative to the current active link
    indicator.style.width = `${element.offsetWidth}px`;
    indicator.style.left = `${element.offsetLeft}px`;

    // Highlight active link text
    navLinks.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
  }

  // Set initial indicator position on page load
  const activeLink = document.querySelector('.nav-link.active') || navLinks[0];
  updateIndicator(activeLink);

  // Add click handlers for navigation links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      updateIndicator(e.currentTarget);
    });
  });

  // Recalculate indicator position on window resize
  window.addEventListener('resize', () => {
    const currentActive = document.querySelector('.nav-link.active');
    updateIndicator(currentActive);
  });
});