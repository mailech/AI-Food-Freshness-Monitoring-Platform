/**
 * FreshCheck - Add Food & Live Scanner Controller
 */

let cameraStream = null;

document.addEventListener('DOMContentLoaded', () => {
  initUserProfile();
  initDateInputs();

  // Tab Elements
  const tabUpload = document.getElementById('tabUpload');
  const tabCamera = document.getElementById('tabCamera');
  const uploadSection = document.getElementById('uploadSection');
  const cameraSection = document.getElementById('cameraSection');

  // Input & Preview Elements
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const previewImg = document.getElementById('previewImg');
  const previewFileName = document.getElementById('previewFileName');
  const btnToggleCamera = document.getElementById('btnToggleCamera');
  const addFoodForm = document.getElementById('addFoodForm');

  // Tab Switch: Upload
  tabUpload.addEventListener('click', () => {
    tabUpload.classList.add('active');
    tabCamera.classList.remove('active');
    uploadSection.classList.remove('hidden');
    cameraSection.classList.add('hidden');
    stopCamera();
  });

  // Tab Switch: Camera
  tabCamera.addEventListener('click', () => {
    tabCamera.classList.add('active');
    tabUpload.classList.remove('active');
    cameraSection.classList.remove('hidden');
    uploadSection.classList.add('hidden');
  });

  // Handle File Upload
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        previewFileName.innerText = file.name;
        previewContainer.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle Camera Toggle
  btnToggleCamera.addEventListener('click', toggleCamera);

  // Form Submit
  addFoodForm.addEventListener('submit', handleAddFoodSubmit);
});

/**
 * Initializes User Sidebar Details
 */
function initUserProfile() {
  const name = localStorage.getItem('freshCheck_userName') || 'User Name';
  const email = localStorage.getItem('freshCheck_userContact') || 'User.@example.com';

  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : nameParts[0][0].toUpperCase();

  document.getElementById('sideName').innerText = name;
  document.getElementById('sideEmail').innerText = email;
  document.getElementById('sideAvatar').innerText = initials;
}

/**
 * Sets initial dates into date pickers (Today for Purchase, Today + 7 days suggested for Expiry)
 */
function initDateInputs() {
  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0];
  
  // Suggested Expiry (default +7 days)
  const defaultExpiry = new Date();
  defaultExpiry.setDate(today.getDate() + 7);
  const expiryFormatted = defaultExpiry.toISOString().split('T')[0];

  document.getElementById('purchaseDate').value = todayFormatted;
  document.getElementById('expiryDate').value = expiryFormatted;
}

/**
 * Live Camera Stream Handler
 */
async function toggleCamera() {
  const video = document.getElementById('webcam');
  const scanOverlay = document.getElementById('scanOverlay');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const btnToggleCamera = document.getElementById('btnToggleCamera');

  if (cameraStream) {
    stopCamera();
    btnToggleCamera.innerHTML = '<i class="fa-solid fa-power-off"></i> Start Camera';
  } else {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = cameraStream;
      video.classList.remove('hidden');
      scanOverlay.classList.remove('hidden');
      cameraPlaceholder.classList.add('hidden');
      btnToggleCamera.innerHTML = '<i class="fa-solid fa-circle-stop"></i> Stop Camera';
    } catch (err) {
      alert('Unable to access webcam. Please ensure camera permissions are allowed.');
    }
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const video = document.getElementById('webcam');
  const scanOverlay = document.getElementById('scanOverlay');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');

  if (video) video.classList.add('hidden');
  if (scanOverlay) scanOverlay.classList.add('hidden');
  if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');
}

/**
 * Saves new food item details (including Expiry Date) and redirects to Dashboard
 */
function handleAddFoodSubmit(e) {
  e.preventDefault();

  const foodName = document.getElementById('foodName').value.trim();
  const foodCategory = document.getElementById('foodCategory').value;
  const purchaseDate = document.getElementById('purchaseDate').value;
  const expiryDate = document.getElementById('expiryDate').value;

  // Store item entry in array
  const newItem = {
    id: Date.now(),
    name: foodName,
    category: foodCategory,
    purchaseDate: purchaseDate,
    expiryDate: expiryDate || 'N/A'
  };

  // Update localStorage inventory state
  const existingItems = JSON.parse(localStorage.getItem('freshCheck_inventory') || '[]');
  existingItems.unshift(newItem);
  localStorage.setItem('freshCheck_inventory', JSON.stringify(existingItems));

  // Change user state so dashboard loads the active view
  localStorage.setItem('freshCheck_isNewUser', 'false');

  stopCamera();

  // Redirect back to Dashboard
  window.location.href = 'dashboard.html';
}