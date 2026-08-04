/**
 * FreshCheck - Contact Page Controller
 */

const CONTACT_DETAILS = {
  'email': {
    title: 'Email Support Channel',
    icon: 'fa-envelope',
    content: `
      Reach our dedicated support team directly for inquiry or integration help:
      <br/><br/>
      • <strong>General Enquiries:</strong> support@freshcheck.ai<br/>
      • <strong>Enterprise & Sales:</strong> sales@freshcheck.ai<br/>
      • <strong>Response Time:</strong> Within 12-24 hours.
    `
  },
  'phone': {
    title: 'Live Customer Support',
    icon: 'fa-headset',
    content: `
      Speak directly with a support engineer:
      <br/><br/>
      • <strong>Toll-Free Hotline:</strong> +1 (800) 555-FRESH (37374)<br/>
      • <strong>Direct Tech Line:</strong> +1 (415) 890-2111<br/>
      • <strong>Availability:</strong> Mon-Fri, 8:00 AM - 6:00 PM EST.
    `
  },
  'location': {
    title: 'Global Headquarters',
    icon: 'fa-location-dot',
    content: `
      Our Innovation & AI Research Lab:
      <br/><br/>
      FreshCheck AI Inc.<br/>
      450 Green Tech Boulevard, Suite 300<br/>
      Silicon Valley, CA 94025, USA
    `
  },
  'hours': {
    title: 'Operating & Support Hours',
    icon: 'fa-clock',
    content: `
      • <strong>Monday – Friday:</strong> 8:00 AM – 6:00 PM (EST)<br/>
      • <strong>Saturday:</strong> 9:00 AM – 2:00 PM (EST)<br/>
      • <strong>Sunday:</strong> Closed (Emergency system alerts remain 24/7 active).
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

  // Set initial position to 'Contact' active tab
  const activeLink = document.querySelector('.nav-link.active') || navLinks[4];
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
 * Slide to detail drawer on contact card click
 */
function scrollToContactDetail(key) {
  const data = CONTACT_DETAILS[key];
  if (!data) return;

  const drawer = document.getElementById('contactDrawer');
  const title = document.getElementById('contactDrawerTitle');
  const content = document.getElementById('contactDrawerContent');

  title.innerHTML = `<i class="fa-solid ${data.icon}"></i> ${data.title}`;
  content.innerHTML = data.content;

  drawer.classList.add('active');
  drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Opens direct message form inside drawer
 */
function openMessageForm() {
  const drawer = document.getElementById('contactDrawer');
  const title = document.getElementById('contactDrawerTitle');
  const content = document.getElementById('contactDrawerContent');

  title.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send Us a Message`;
  content.innerHTML = `
    <form class="contact-form" onsubmit="handleFormSubmit(event)">
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" placeholder="John Doe" required />
      </div>
      <div class="form-group">
        <label>Your Email</label>
        <input type="email" placeholder="john@example.com" required />
      </div>
      <div class="form-group">
        <label>Message</label>
        <textarea rows="4" placeholder="How can we help you?" required></textarea>
      </div>
      <button type="submit" class="btn-submit">Send Message</button>
    </form>
  `;

  drawer.classList.add('active');
  drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleFormSubmit(event) {
  event.preventDefault();
  const content = document.getElementById('contactDrawerContent');
  content.innerHTML = `
    <div style="text-align: center; padding: 20px 0; color: #4ade80;">
      <i class="fa-solid fa-circle-check" style="font-size: 2.5rem; margin-bottom: 12px;"></i>
      <h3>Thank you! Your message has been sent.</h3>
      <p style="color: #9ca3af; margin-top: 6px;">Our team will get back to you shortly.</p>
    </div>
  `;
}

function closeContactDrawer() {
  const drawer = document.getElementById('contactDrawer');
  drawer.classList.remove('active');
}