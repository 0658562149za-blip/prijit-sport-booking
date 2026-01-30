console.log('🚀 [PRIJIT SPORT] Script starting...', new Date().toISOString());

// ========================================
// 🐛 DEBUG CONFIGURATION
// ========================================
const DEBUG_MODE = false; // เปลี่ยนเป็น true เมื่อต้องการดู console logs
function debugLog(...args) {
  if (DEBUG_MODE) console.log(...args);
}
console.log("🐛 Debug mode:", DEBUG_MODE ? "ON" : "OFF");
// ========================================
// ⚙️ CONFIGURATION CONSTANTS
// ========================================
const CONFIG = {
  DEBUG_MODE: false,
  FIREBASE_RETRY_MAX: 50,
  FIREBASE_RETRY_INTERVAL: 100,
  AVAILABILITY_CHECK_TIMEOUT: 10000,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 150,
  SLIDER_INTERVAL: 4000
};

// ========================================
// 1️⃣ CACHE CLEANUP
// ========================================
(function() {
  debugLog('🧹 [1/3] Cache cleanup...');
  try { localStorage.clear(); debugLog('  ✅ localStorage cleared'); } catch(e) {}
  try { sessionStorage.clear(); debugLog('  ✅ sessionStorage cleared'); } catch(e) {}
  debugLog('✅ [1/3] Cache cleanup complete');
})();

// ========================================
// 2️⃣ GLOBAL VARIABLES
// ========================================
debugLog('📦 [2/3] Declaring global variables...');
// Firebase
let auth, database, currentUser = null;
let isCancelling = false;
function initNavigation() {
  console.log('🧭 Initializing navigation...');
  
  // Desktop navigation
  const desktopNavItems = document.querySelectorAll('#desktopNav .nav-item');
  desktopNavItems.forEach(item => {
    item.addEventListener('click', function() {
      const sectionId = this.getAttribute('data-section');
      scrollToSection(sectionId);
    });
  });
  
  // Mobile navigation
  const mobileNavItems = document.querySelectorAll('#mobileNav .nav-item');
  mobileNavItems.forEach(item => {
    item.addEventListener('click', function() {
      const sectionId = this.getAttribute('data-section');
      scrollToSection(sectionId);
      closeMobileMenu();
    });
  });
  
  // Hamburger menu
  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) {
    hamburger.addEventListener('click', toggleMobileMenu);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Login button
  const loginBtn = document.getElementById('loginNavBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', openLoginModal);
  }
  
  console.log('✅ Navigation initialized');
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
// Debounce utility
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Toggle password visibility
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁️';
  }
}

// Modal functions
function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('active');
    showLoginInModal();
  }
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function showLoginInModal() {
  document.getElementById('modalLoginForm').style.display = 'block';
  document.getElementById('modalRegisterForm').style.display = 'none';
}

function showRegisterInModal() {
  document.getElementById('modalLoginForm').style.display = 'none';
  document.getElementById('modalRegisterForm').style.display = 'block';
}

// Mobile menu functions
function toggleMobileMenu() {
  const overlay = document.getElementById('menuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  
  if (!overlay || !hamburger) return;
  
  const isActive = overlay.classList.contains('active');
  
  if (isActive) {
    closeMobileMenu();
  } else {
    overlay.classList.add('active');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const overlay = document.getElementById('menuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  
  if (overlay) overlay.classList.remove('active');
  if (hamburger) hamburger.classList.remove('active');
  document.body.style.overflow = '';
}
// Booking
let selectedTimeSlot = null;
let currentBookingData = null;
let uploadedSlipFile = null;
let currentAvailabilityCheck = null;

// Navigation & Menu
let lastMenuToggleTime = 0;
const MENU_TOGGLE_DELAY = 300;
let lastNavigationTime = 0;
const NAVIGATION_DELAY = 300; 

// Slider
let currentSlideIndex = 0;
let slideInterval = null;

// Gallery
const galleryImages = ['f11.jpg', 'f8.jpg', 'f9.jpg', 'f1.jpg', 'f10.jpg', 'f2.jpg', 'f3.jpg'];
let currentGalleryIndex = 0;

// Payment
let paymentTimer = null;

// Constants
const DEPOSIT_PERCENTAGE = 0.3;
const MAX_BOOKING_DAYS = 30;
const MAX_FILE_SIZE_MB = 5;
const PAYMENT_TIMEOUT_MINUTES = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

debugLog('✅ [2/3] Global variables initialized');
debugLog('  ⚙️ NAVIGATION_DELAY:', NAVIGATION_DELAY, 'ms');
debugLog('  ⚙️ MENU_TOGGLE_DELAY:', MENU_TOGGLE_DELAY, 'ms');


// GLOBAL LODING EXAMPLE
// ========================================
async function submitBooking() {
  showLoading('กำลังจองสนาม...');
  
  try {
    await bookingRef.set(bookingData);
    hideLoading();
    showToast('✅ จองสำเร็จ!');
  } catch (error) {
    hideLoading();
    showToast('❌ เกิดข้อผิดพลาด', 'error');
  }
}

// ========================================
// bUTTON LOADING SYSTEM
// ========================================
async function handleLogin() {
  const loginBtn = document.getElementById('loginBtn');
  LoadingSystem.showButton(loginBtn, 'เข้าสู่ระบบ');
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    LoadingSystem.hideButton(loginBtn);
    showToast('เข้าสู่ระบบสำเร็จ!', 'success');
  } catch (error) {
    LoadingSystem.hideButton(loginBtn);
    showToast('เข้าสู่ระบบไม่สำเร็จ', 'error');
  }
}

// ========================================
// RATE LIMITER CLASS
// ========================================
class RateLimiter {
  constructor(maxCalls, timeWindow, message = null) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow; // milliseconds
    this.calls = [];
    this.message = message || `กรุณารอ ${timeWindow/1000} วินาที ก่อนทำรายการอีกครั้ง`;
  }
  
  canCall() {
    const now = Date.now();
    
    // ลบ calls ที่เก่าเกินกว่า timeWindow
    this.calls = this.calls.filter(timestamp => now - timestamp < this.timeWindow);
    
    if (this.calls.length >= this.maxCalls) {
      return false;
    }
    
    this.calls.push(now);
    return true;
  }
  
  tryCall(callback) {
    if (this.canCall()) {
      return callback();
    } else {
      showToast(this.message, 'warning');
      return null;
    }
  }
  
  reset() {
    this.calls = [];
  }
  
  getRemainingTime() {
    if (this.calls.length === 0) return 0;
    
    const now = Date.now();
    const oldestCall = Math.min(...this.calls);
    const remaining = this.timeWindow - (now - oldestCall);
    
    return Math.max(0, Math.ceil(remaining / 1000)); // seconds
  }
}

// ========================================
// RATE LIMITER INSTANCES
const RateLimiters = {
  booking: new RateLimiter(3, 10000, 'กรุณารอ 10 วินาที ก่อนจองอีกครั้ง'),
  login: new RateLimiter(5, 60000, 'พยายาม login มากเกินไป กรุณารอ 1 นาที'),
  payment: new RateLimiter(2, 5000, 'กรุณารอ 5 วินาที ก่อนอัปโหลดสลิปอีกครั้ง'),
  cancel: new RateLimiter(3, 30000, 'กรุณารอ 30 วินาที ก่อนยกเลิกอีกครั้ง')
};

// ========================================
// RATE LIMITER EXAMPLES
// ========================================

// ✅ วิธีที่ 1: ใช้ canCall
async function submitBooking() {
  if (!RateLimiters.booking.canCall()) {
    const remaining = RateLimiters.booking.getRemainingTime();
    showToast(`กรุณารอ ${remaining} วินาที ก่อนจองอีกครั้ง`, 'warning');
    return;
  }
  
  showLoading('กำลังจองสนาม...');
  // ... proceed with booking
}

// ✅ วิธีที่ 2: ใช้ tryCall
function handleLogin() {
  RateLimiters.login.tryCall(async () => {
    showLoading('กำลังเข้าสู่ระบบ...');
    await auth.signInWithEmailAndPassword(email, password);
    hideLoading();
    showToast('เข้าสู่ระบบสำเร็จ!', 'success');
  });
}

// ✅ วิธีที่ 3: รีเซ็ตหลังสำเร็จ
async function submitBooking() {
  if (!RateLimiters.booking.canCall()) return;
  
  try {
    await bookingRef.set(bookingData);
    RateLimiters.booking.reset(); // Reset หลังสำเร็จ
    showToast('จองสำเร็จ!', 'success');
  } catch (error) {
    showToast('เกิดข้อผิดพลาด', 'error');
  }
}

// ========================================
// VALIDATION FUNCTIONS
// ========================================
const Validator = {
  // ตรวจสอบชื่อ-นามสกุล
  name(value) {
    if (!value || value.trim().length < 2) {
      return 'กรุณากรอกชื่อ-นามสกุล (อย่างน้อย 2 ตัวอักษร)';
    }
    if (value.trim().length > 100) {
      return 'ชื่อ-นามสกุลยาวเกินไป (ไม่เกิน 100 ตัวอักษร)';
    }
    return null;
  },
  
  // ตรวจสอบเบอร์โทร
  phone(value) {
    if (!value) {
      return 'กรุณากรอกเบอร์โทรศัพท์';
    }
    
    // ลบ spaces, dashes
    const cleaned = value.replace(/[\s-]/g, '');
    
    // ต้องขึ้นต้นด้วย 0 และมี 10 หลัก
    if (!/^0[0-9]{9}$/.test(cleaned)) {
      return 'เบอร์โทรไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 10 หลัก)';
    }
    
    return null;
  },
  
  // ตรวจสอบ email
  email(value) {
    if (!value) {
      return 'กรุณากรอกอีเมล';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    
    return null;
  },
  
  // ตรวจสอบรหัสผ่าน
  password(value) {
    if (!value) {
      return 'กรุณากรอกรหัสผ่าน';
    }
    
    if (value.length < 6) {
      return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }
    
    return null;
  },
  
  // ตรวจสอบการเลือกสนาม
  field(value) {
    if (!value) {
      return 'กรุณาเลือกสนาม';
    }
    return null;
  },
  
  // ตรวจสอบวันที่
  date(value) {
    if (!value) {
      return 'กรุณาเลือกวันที่';
    }
    
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return 'ไม่สามารถเลือกวันที่ในอดีตได้';
    }
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    
    if (selectedDate > maxDate) {
      return 'สามารถจองล่วงหน้าได้ไม่เกิน 30 วัน';
    }
    
    return null;
  },
  
  // ตรวจสอบเวลา
  time(value) {
    if (!value) {
      return 'กรุณาเลือกเวลา';
    }
    return null;
  },
  
  // ตรวจสอบไฟล์
  file(file, maxSizeMB = 5) {
    if (!file) {
      return 'กรุณาเลือกไฟล์';
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return 'รองรับเฉพาะไฟล์ JPG และ PNG เท่านั้น';
    }
    
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `ไฟล์ใหญ่เกินไป (ไม่เกิน ${maxSizeMB} MB)`;
    }
    
    return null;
  },
  
  // Validate form ทั้งหมด
  form(data) {
    const errors = {};
    
    Object.keys(data).forEach(field => {
      if (this[field]) {
        const error = this[field](data[field]);
        if (error) {
          errors[field] = error;
        }
      }
    });
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
};

// Helper function สำหรับแสดง errors
function showValidationErrors(errors) {
  if (!errors) return;
  
  const errorMessages = Object.values(errors).join('\n');
  showToast(errorMessages, 'error', 5000);
  
  // Highlight fields with errors
  Object.keys(errors).forEach(field => {
    const input = document.getElementById(field);
    if (input) {
      input.classList.add('error');
      input.addEventListener('focus', () => input.classList.remove('error'), { once: true });
    }
  });
}
// ========================================
// SLIDER FUNCTIONS
// ========================================
function startSlider() {
  slideInterval = setInterval(() => changeSlide(1), 4000);
}

function stopSlider() {
  clearInterval(slideInterval);
}

function showSlide(index) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");

  if (index >= slides.length) currentSlideIndex = 0;
  if (index < 0) currentSlideIndex = slides.length - 1;

  slides.forEach((slide) => slide.classList.remove("active"));
  dots.forEach((dot) => dot.classList.remove("active"));

  slides[currentSlideIndex].classList.add("active");
  dots[currentSlideIndex].classList.add("active");
}

function changeSlide(direction) {
  currentSlideIndex += direction;
  const slides = document.querySelectorAll(".slide");

  if (currentSlideIndex >= slides.length) currentSlideIndex = 0;
  else if (currentSlideIndex < 0) currentSlideIndex = slides.length - 1;

  showSlide(currentSlideIndex);
  stopSlider();
  startSlider();
}

function currentSlide(index) {
  currentSlideIndex = index;
  showSlide(currentSlideIndex);
  stopSlider();
  startSlider();
}

// ========================================
// GALLERY FUNCTIONS
// ========================================
function changeGalleryImage(direction) {
  currentGalleryIndex += direction;
  
  if (currentGalleryIndex < 0) currentGalleryIndex = galleryImages.length - 1;
  else if (currentGalleryIndex >= galleryImages.length) currentGalleryIndex = 0;
  
  updateGalleryDisplay();
}

function selectGalleryImage(index) {
  currentGalleryIndex = index;
  updateGalleryDisplay();
}

function updateGalleryDisplay() {
  document.getElementById('galleryMainImage').src = galleryImages[currentGalleryIndex];
  document.getElementById('currentImageNumber').textContent = currentGalleryIndex + 1;
  document.getElementById('totalImages').textContent = galleryImages.length;
  
  const thumbnails = document.querySelectorAll('.gallery-thumbnail');
  thumbnails.forEach((thumb, index) => {
    if (index === currentGalleryIndex) thumb.classList.add('active');
    else thumb.classList.remove('active');
  });
}

document.addEventListener('keydown', (e) => {
  const gallerySection = document.getElementById('gallerySection');
  if (gallerySection && isInViewport(gallerySection)) {
    if (e.key === 'ArrowLeft') changeGalleryImage(-1);
    else if (e.key === 'ArrowRight') changeGalleryImage(1);
  }
});

function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
// ========================================
// STAFF MODAL FUNCTIONS (GLOBAL)
// ========================================
function openStaffModal(url) {
  const modal = document.getElementById('staffGalleryModal');
  const modalImg = document.getElementById('staffGalleryModalImg');
  
  if (!modal || !modalImg) {
    console.error('❌ ไม่พบ Modal elements');
    return;
  }
  
  const img = new Image();
  img.onload = function() {
    modalImg.src = url;
  };
  img.onerror = function() {
    console.warn('⚠️ โหลดรูปภาพล้มเหลว, ลองอีกครั้ง');
    modalImg.src = url;
  };
  img.src = url;
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeStaffModal() {
  const modal = document.getElementById('staffGalleryModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    console.log('✅ Modal ปิดแล้ว');
  } else {
    console.error('❌ ไม่พบ Modal');
  }
}



// ========================================
// TIME SLOTS FUNCTIONS
// ========================================
function  initializeTimeSlots() {
  const timeSlots = document.querySelectorAll('.time-slot-btn');
  
  timeSlots.forEach(btn => {
    let touchHandled = false;
    
    // ✅ TOUCHEND (Mobile)
    btn.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.classList.contains('booked')) {
        alert('❌ ช่วงเวลานี้ถูกจองแล้ว กรุณาเลือกช่วงเวลาอื่น');
        return;
      }
      
      touchHandled = true;
      selectTime(this);
      setTimeout(() => { touchHandled = false; }, 300);
    }, { passive: false });
    
    // ✅ CLICK (Desktop fallback)
    btn.addEventListener('click', function(e) {
      // ป้องกัน ghost click
      if (touchHandled) {
        e.preventDefault();
        return;
      }
      
      if (this.classList.contains('booked')) {
        alert('❌ ช่วงเวลานี้ถูกจองแล้ว กรุณาเลือกช่วงเวลาอื่น');
        return;
      }
      
      selectTime(this);
    });
  });
}

function selectTime(element) {
  if (element.classList.contains('booked')) return;
  
  const timeSlots = document.querySelectorAll(".time-slot-btn");
  timeSlots.forEach((slot) => slot.classList.remove("selected"));
  element.classList.add("selected");
  selectedTimeSlot = element.getAttribute('data-time');
}

function resetTimeSlots() {
  const timeSlots = document.querySelectorAll('.time-slot-btn');
  timeSlots.forEach(btn => {
    btn.classList.remove('available', 'booked', 'selected');
    btn.disabled = false;
    const badge = btn.querySelector('.status-badge');
    if (badge) badge.remove();
  });
}

function checkAvailability() {
  if (currentAvailabilityCheck && typeof currentAvailabilityCheck.off === 'function') {
    currentAvailabilityCheck.off();
  }
  currentAvailabilityCheck = null;

  const field = document.getElementById('fieldSelect').value;
  const date = document.getElementById('dateSelect').value;

  if (!field || !date) {
    resetTimeSlots();
    return;
  }

  const statusDiv = document.getElementById('availabilityStatus');
  statusDiv.style.display = 'block';
  statusDiv.className = 'availability-notice checking';
  statusDiv.innerHTML = '<strong>⏳ กำลังตรวจสอบสถานะสนาม...</strong>';

  const timeoutId = setTimeout(() => {
    statusDiv.innerHTML = '<strong style="color: #ef4444;">⚠️ การเชื่อมต่อล่าช้า กรุณาลองใหม่อีกครั้ง</strong>';
  }, 10000);

  const query = database.ref('bookings').orderByChild('field').equalTo(field);
  currentAvailabilityCheck = query;

  query.once('value')
    .then((snapshot) => {
      clearTimeout(timeoutId);
      if (currentAvailabilityCheck !== query) {
        console.log('⚠️ Request ถูกยกเลิกแล้ว');
        return;
      }
      
      const bookedTimes = [];
      snapshot.forEach((child) => {
        const booking = child.val();
        if (booking.date === date && booking.bookingStatus !== 'cancelled') {
          bookedTimes.push(booking.time);
        }
      });
    
      updateTimeSlotAvailability(bookedTimes);
      statusDiv.style.display = 'none';
      currentAvailabilityCheck = null;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      if (currentAvailabilityCheck !== query) return;

      console.error("Error checking availability:", error);
      statusDiv.className = 'availability-notice';
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = '<strong style="color: #ef4444;">❌ เกิดข้อผิดพลาดในการตรวจสอบ กรุณาลองใหม่อีกครั้ง</strong>';
      currentAvailabilityCheck = null;
    });  
}

function updateTimeSlotAvailability(bookedTimes) {
  const timeSlots = document.querySelectorAll('.time-slot-btn');
  const bookedTimesSet = new Set(bookedTimes);
  
  // เช็คว่าวันที่เลือกเป็นวันนี้หรือไม่
  const selectedDate = document.getElementById('dateSelect').value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const isToday = selectedDateObj.getTime() === today.getTime();
  
  // เวลาปัจจุบัน
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  timeSlots.forEach(btn => {
    const time = btn.getAttribute('data-time');
    
    btn.classList.remove('available', 'booked', 'selected', 'past-time');
    const existingBadge = btn.querySelector('.status-badge');
    if (existingBadge) existingBadge.remove();

    // เช็คว่าเป็นเวลาที่ผ่านไปแล้วหรือไม่ (เฉพาะวันนี้)
    let isPastTime = false;
    if (isToday) {
      const timeStart = time.split(' - ')[0]; // เช่น "13:00"
      const [startHour, startMinute] = timeStart.split(':').map(Number);
      
      // ถ้าเวลาเริ่มน้อยกว่าเวลาปัจจุบัน = เวลาผ่านไปแล้ว
      if (startHour < currentHour || (startHour === currentHour && startMinute <= currentMinute)) {
        isPastTime = true;
      }
    }

    if (isPastTime) {
      // เวลาผ่านไปแล้ว
      btn.classList.add('booked');
      btn.disabled = true;
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.textContent = 'ผ่านแล้ว';
      badge.style.background = '#9ca3af';
      btn.appendChild(badge);
      btn.style.opacity = '0.5';
    } else if (bookedTimesSet.has(time)) { 
      // มีคนจองแล้ว
      btn.classList.add('booked');
      btn.disabled = true;
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.textContent = 'ไม่ว่าง';
      btn.appendChild(badge);
    } else {
      // ว่าง
      btn.classList.add('available');
      btn.disabled = false;
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.textContent = 'ว่าง';
      btn.appendChild(badge);
    }
  });
}

function resetBookingForm() {
  document.getElementById('fieldSelect').value = '';
  document.getElementById('dateSelect').value = '';
  selectedTimeSlot = null;
  resetTimeSlots();
}

// ========================================
// AUTH FUNCTIONS
// ========================================
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("modalLoginUsername").value;
  const password = document.getElementById("modalLoginPassword").value;
  const email = username + "@prijitsport.com";
  
  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      return database.ref('users/' + userCredential.user.uid).once('value');
    })
   .then(snapshot => {
      currentUser = { uid: auth.currentUser.uid, ...snapshot.val() };
      document.getElementById("currentUser").textContent = currentUser.fullname;
      document.getElementById("loginNavBtn").style.display = "none";
      document.getElementById("userInfo").style.display = "flex";
      closeLoginModal();
      showToast("✅ เข้าสู่ระบบสำเร็จ!", 'success');
    })
    .catch(error => {
      showToast("❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 'error');
    });
}

function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById("modalRegUsername").value;
  const fullname = document.getElementById("modalRegFullname").value;
  const phone = document.getElementById("modalRegPhone").value;
  const password = document.getElementById("modalRegPassword").value;
  const email = username + "@prijitsport.com";
  
  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      return database.ref('users/' + userCredential.user.uid).set({
        username, fullname, phone,
        createdAt: new Date().toISOString()
      });
    })
 .then(() => {
      showToast("✅ สมัครสมาชิกสำเร็จ!", 'success');
      e.target.reset();
      showLoginInModal();
    })
    .catch(error => {
      if (error.code === 'auth/email-already-in-use') {
        showToast("❌ ชื่อผู้ใช้นี้มีอยู่แล้ว", 'error');
      } else {
        showToast("❌ เกิดข้อผิดพลาด: " + error.message, 'error');
      }
    });
}

function handleLogout() {
  if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
    auth.signOut().then(() => {
      currentUser = null;
      document.getElementById("loginNavBtn").style.display = "inline-block";
      document.getElementById("userInfo").style.display = "none";
      showToast("✅ ออกจากระบบเรียบร้อย", 'success');
    });
  }
}


// ========================================
// BOOKING FUNCTIONS
// ========================================
function confirmBooking() {
  if (!currentUser) {
    showToast('กรุณา Login ก่อนจองสนาม', 'warning', 4000);
    setTimeout(() => openLoginModal(), 500);
    return;
  }

  const field = document.getElementById("fieldSelect").value;
  const date = document.getElementById("dateSelect").value;

  if (!field || !date || !selectedTimeSlot) {
    showToast("❌ กรุณากรอกข้อมูลให้ครบถ้วน", 'error');
    return;
  }
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // เช็คว่าเป็นวันนี้และเวลาผ่านไปแล้วหรือไม่
  if (selectedDate.getTime() === today.getTime()) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const timeStart = selectedTimeSlot.split(' - ')[0];
    const [startHour, startMinute] = timeStart.split(':').map(Number);
    
    if (startHour < currentHour || (startHour === currentHour && startMinute <= currentMinute)) {
      showToast("❌ ไม่สามารถจองย้อนหลังได้ กรุณาเลือกช่วงเวลาอื่น", 'error');
      return;
    }
  }

  if (selectedDate < today) {
    alert("❌ ไม่สามารถจองย้อนหลังได้");
    return;
  }
  
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  if (selectedDate > maxDate) {
    alert("❌ สามารถจองได้สูงสุด 30 วันล่วงหน้าเท่านั้น");
    return;
  }

  let totalPrice = 0;
  const hour = parseInt(selectedTimeSlot.split(":")[0]);

  if (field.includes("สนาม 1") || field.includes("สนาม 2") || field.includes("สนาม 3")) {
    totalPrice = hour >= 18 ? 1200 : 1000;
  } else if (field.includes("สนาม 4")) {
    totalPrice = hour >= 18 ? 1300 : 1100;
  } else if (field.includes("สนาม 5")) {
    totalPrice= hour >= 18 ? 1100 : 900;
  } else if (field.includes("สนาม 6")) {
    totalPrice = hour >= 18 ? 900 : 700;
  }

  const depositAmount = Math.round(totalPrice * DEPOSIT_PERCENTAGE);
  const remainingAmount = totalPrice - depositAmount;

  currentBookingData = {
    field: field,
    date: date,
    time: selectedTimeSlot,
    totalPrice: totalPrice,
    depositAmount: depositAmount,
    remainingAmount: remainingAmount
  };

  const confirmMsg = `📋 กรุณาตรวจสอบข้อมูลการจอง:

📍 สนาม: ${field}
📅 วันที่: ${date}
⏰ เวลา: ${selectedTimeSlot}

━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ค่าบริการทั้งหมด: ${totalPrice.toLocaleString()} บาท
💵 ค่ามัดจำ 30%: ${depositAmount.toLocaleString()} บาท
💸 ค่าบริการคงเหลือ: ${remainingAmount.toLocaleString()} บาท
━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ผู้จอง: ${currentUser.fullname}
📞 เบอร์: ${currentUser.phone}

⚠️ เงื่อนไข:
- ชำระค่ามัดจำ ${depositAmount.toLocaleString()} บาทผ่าน QR Code
- มาตามนัด = คืนเงินมัดจำทันที
- ไม่มาตามนัด = ริบเงินมัดจำ

ต้องการดำเนินการจองต่อ?`;
  
  if (!confirm(confirmMsg)) return;

  showPaymentModal();
}

function showPaymentModal() {
  const data = currentBookingData;

  const modalHTML = `
    <div id="paymentModal" class="payment-modal active">
      <div class="payment-content">
        <div class="payment-header">
          <h2>💳 ชำระค่ามัดจำ</h2>
          <p>จองสนาม ${data.field}</p>
        </div>

        <div class="payment-summary">
          <div class="summary-row">
            <span class="summary-label">💵 ค่าบริการทั้งหมด:</span>
            <span class="summary-value">${data.totalPrice.toLocaleString()} บาท</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">📍 ค่ามัดจำ 30%:</span>
            <span class="summary-value">${data.depositAmount.toLocaleString()} บาท</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">💸 ค่าบริการคงเหลือ:</span>
            <span class="summary-value">${data.remainingAmount.toLocaleString()} บาท</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">💰 ต้องชำระตอนนี้:</span>
            <span class="summary-value" style="color: #22c55e; font-size: 1.3em;">${data.depositAmount.toLocaleString()} บาท</span>
          </div>
        </div>

        <div class="deposit-highlight">
          <p><strong>📱 สแกน QR Code เพื่อชำระค่ามัดจำ</strong></p>
          <p style="font-size: 0.95em; color: #16a34a; margin-top: 5px;">
            ชำระเพียง ${data.depositAmount.toLocaleString()} บาท ค่าบริการคงเหลือจ่ายที่สนาม
          </p>
        </div>

        <div class="qr-code-container">

          <div class="qr-code-image" style="position: relative; min-height: 300px;">
            <!-- Loading State -->
            <div id="qrLoading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #6b7280;">
              <div style="width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 10px;"></div>
              <p style="font-size: 0.9em;">กำลังโหลด QR Code...</p>
            </div>
            <!-- QR Code Image -->
            <img id="qrCodeCanvas" src="qr-promptpay.png" alt="QR Code PromptPay" 
                style="width: 100%; height: 100%; object-fit: contain; display: none;"
                onload="this.style.display='block'; var loader = document.getElementById('qrLoading'); if (loader) loader.remove();"
                onerror="handleQRError(this)">
          </div>




        </div>
        
        <div class="payment-info">
          <p><strong>💰 ยอดชำระ:</strong> ${data.depositAmount.toLocaleString()} บาท</p>
          <p><strong>📱 เลขพร้อมเพย์:</strong> 1103100835163</p>
          <p><strong>🏢 ชื่อบัญชี:</strong> นาย พัสกร ราชชมภู</p>
          <p><strong>🆔 Ref:</strong> ${data.field.replace('สนาม ', 'F')}-${data.date.replace(/-/g, '')}</p>
        </div>

        <div class="upload-section">
          <label class="upload-label">📤 อัพโหลดสลิปการโอนเงิน</label>
          <div class="upload-area" id="uploadArea" onclick="document.getElementById('slipInput').click()">
            <p>📎 คลิกเพื่ออัพโหลดรูปสลิป</p>
            <p style="font-size: 0.9em; color: #6b7280; margin-top: 10px;">
              หรือลากไฟล์มาวางที่นี่<br>
              รองรับ: JPG, PNG (ไฟล์เดียว)
            </p>
          </div>
          <input type="file" id="slipInput" accept="image/*" style="display: none;" onchange="handleSlipUpload(event)">
          <img id="slipPreview" style="display: none;">
        </div>

        <div class="payment-terms">
          <h4>⚠️ เงื่อนไขการคืนเงินมัดจำ</h4>
          <ul>
            <li>✅ มาตามเวลานัด: คืนเงินมัดจำ ${data.depositAmount.toLocaleString()} บาท ทันที</li>
            <li>❌ ไม่มาตามนัด: ริบเงินมัดจำทั้งหมด</li>
            <li>📌 กรุณามาถึงก่อนเวลา 15 นาที</li>
          </ul>
        </div>

        <div class="payment-buttons">
          <button class="cancel-payment-btn" onclick="closePaymentModal()">❌ ยกเลิก</button>
          <button class="upload-slip-btn" id="confirmPaymentBtn" disabled onclick="submitPayment()">
            ⬆️ อัพโหลดสลิป
          </button>
        </div>

        <div class="timer-warning" id="paymentTimer">
          ⏰ กรุณาชำระภายใน 15 นาที
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  generateQRCode(data);
  startPaymentTimer();
  setupDragDrop();
}

function generateQRCode(data) { 
  console.log('✅ QR Code loaded for deposit:', data.depositAmount, 'บาท');
}

function handleQRError(img) {
  img.style.display = 'none';
  const container = img.parentElement;
  container.innerHTML = `
    <div style="padding: 20px; text-align: center; color: #ef4444;">
      <p style="font-size: 1.2em; margin-bottom: 10px;">⚠️ ไม่พบ QR Code</p>
      <p style="font-size: 0.9em; color: #6b7280;">
        กรุณาโอนเงินไปที่:<br>
        <strong style="color: #1f2937;">เลขพร้อมเพย์: 1103100835163</strong><br>
        <strong style="color: #1f2937;">ชื่อบัญชี: นาย พัสกร ราชชมภู</strong>
      </p>
    </div>
  `;
  console.warn('⚠️ QR Code image not available, showing PromptPay details instead');
}

function handleSlipUpload(event) {
  const file = event.target.files[0];
  
  if (!file) return;
  
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    alert('❌ กรุณาอัพโหลดไฟล์ภาพเท่านั้น (JPG, PNG)');
    event.target.value = '';
    return;
  }
  
  if (file.size > MAX_FILE_SIZE_BYTES) {
    alert('❌ ไฟล์ใหญ่เกินไป! กรุณาเลือกไฟล์ขนาดไม่เกิน ' + MAX_FILE_SIZE_MB + ' MB\n' + 
          'ขนาดไฟล์ของคุณ: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB');
    event.target.value = '';
    return;
  }
  
  uploadedSlipFile = file;
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('slipPreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('confirmPaymentBtn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function setupDragDrop() {
  const uploadArea = document.getElementById('uploadArea');
  
  const handleDragOver = (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  };
  
  const handleDragLeave = () => {
    uploadArea.classList.remove('dragover');
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const input = document.getElementById('slipInput');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleSlipUpload({ target: input });
    }
  };
  
  // ✅ เพิ่ม { passive: false } เพราะต้องใช้ preventDefault()
  // หมายเหตุ: dragover และ drop ต้องใช้ preventDefault() จริง ๆ
  uploadArea.addEventListener('dragover', handleDragOver, { passive: false });
  uploadArea.addEventListener('dragleave', handleDragLeave, { passive: true });
  uploadArea.addEventListener('drop', handleDrop, { passive: false });
  
  uploadArea._dragHandlers = { handleDragOver, handleDragLeave, handleDrop };
}

function startPaymentTimer() {
  let timeLeft = PAYMENT_TIMEOUT_MINUTES * 60;
  const timerDiv = document.getElementById('paymentTimer');
  
  paymentTimer = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    timerDiv.textContent = `⏰ เหลือเวลา ${minutes}:${seconds.toString().padStart(2, '0')} นาที`;
    
    if (timeLeft <= 0) {
      clearInterval(paymentTimer);
      alert('❌ หมดเวลาชำระเงิน กรุณาทำการจองใหม่อีกครั้ง');
      closePaymentModal();
    }
  }, 1000);
}

function closePaymentModal() {
  clearInterval(paymentTimer);
  cleanupBookingLock();
  
  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea && uploadArea._dragHandlers) {
    uploadArea.removeEventListener('dragover', uploadArea._dragHandlers.handleDragOver);
    uploadArea.removeEventListener('dragleave', uploadArea._dragHandlers.handleDragLeave);
    uploadArea.removeEventListener('drop', uploadArea._dragHandlers.handleDrop);
    delete uploadArea._dragHandlers;
  }

  const modal = document.getElementById('paymentModal');
  if (modal) modal.remove();
  
  currentBookingData = null;
  uploadedSlipFile = null;
}

function cleanupBookingLock() {
  if (currentBookingData) {
    const uniqueKey = `${currentBookingData.field}_${currentBookingData.date}_${currentBookingData.time}`;
    database.ref('booking_locks/' + uniqueKey).remove();
  }
}

window.addEventListener('beforeunload', () => {
  cleanupBookingLock();
});

function submitPayment() {
  if (!uploadedSlipFile) {
    alert('❌ กรุณาอัพโหลดสลิปการโอนเงิน');
    return;
  }

  const btn = document.getElementById('confirmPaymentBtn');
  btn.disabled = true;
  btn.innerHTML = '⏳ กำลังอัพโหลด... <span class="spinner"></span>';
  
  uploadSlipAndCreateBooking();
}

function uploadSlipAndCreateBooking() {
  const data = currentBookingData;
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const slipBase64 = e.target.result;
    
    const bookingRef = database.ref('bookings').push();
    const uniqueKey = `${data.field}_${data.date}_${data.time}`;

    const bookingData = {
      userId: currentUser.uid,
      username: currentUser.fullname,
      phone: currentUser.phone,
      field: data.field,
      date: data.date,
      time: data.time,
      totalPrice: data.totalPrice,
      depositAmount: data.depositAmount,
      remainingAmount: data.remainingAmount,
      depositStatus: 'pending',
      depositSlipUrl: slipBase64,
      depositPaidAt: new Date().toISOString(),
      remainingStatus: 'unpaid',
      remainingPaidAt: null,
      bookingStatus: 'pending_payment',
      checkedInAt: null,
      completedAt: null,
      depositRefunded: false,
      depositRefundedAt: null,
      depositForfeited: false,
      depositForfeitedAt: null,
      field_date_time: uniqueKey,
      createdAt: new Date().toISOString()
    };

    database.ref('booking_locks/' + uniqueKey).transaction((currentData) => {
      if (currentData === null) {
        return { locked: true, timestamp: Date.now() };
      } else {
        return undefined;
      }
    }, (error, committed, snapshot) => {
      if (error) {
        alert('❌ เกิดข้อผิดพลาด: ' + error.message);
        document.getElementById('confirmPaymentBtn').disabled = false;
        document.getElementById('confirmPaymentBtn').textContent = '⬆️ อัพโหลดสลิป';
      } else if (!committed) {
        alert('❌ ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกช่วงเวลาอื่น');
        closePaymentModal();
        checkAvailability();
      } else {
        bookingRef.set(bookingData)
          .then(() => {
            clearInterval(paymentTimer);
            
            alert(`✅ อัพโหลดสลิปสำเร็จ!

📋 เลขที่การจอง: #${bookingRef.key.substr(-6).toUpperCase()}

ระบบจะตรวจสอบการชำระเงินภายใน 5 นาที
คุณจะได้รับการยืนยันผ่าน SMS

📍 สนาม: ${data.field}
📅 วันที่: ${data.date}
⏰ เวลา: ${data.time}
💰 มัดจำ: ${data.depositAmount.toLocaleString()} บาท ✅
💸 ค่าบริการคงเหลือ: ${data.remainingAmount.toLocaleString()} บาท

⚠️ กรุณามาตามเวลานัดเพื่อรับเงินมัดจำคืน`);
          
            closePaymentModal();
            resetBookingForm();
            document.location.href = '#checkBookingSection';
            updateBookingList();
          })
          .catch((error) => {
            database.ref('booking_locks/' + uniqueKey).remove();
            alert('❌ เกิดข้อผิดพลาด: ' + error.message);
            document.getElementById('confirmPaymentBtn').disabled = false;
            document.getElementById('confirmPaymentBtn').textContent = '⬆️ อัพโหลดสลิป';
          });
      }
    });
  };

  reader.readAsDataURL(uploadedSlipFile);
}
function updateBookingList() {
  debugLog('🔄 Updating booking list...');
  
  const bookingListDiv = document.getElementById('bookingList');
  if (!bookingListDiv) {
    console.log('❌ bookingList element not found');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    // ✅ แสดงข้อความให้ผู้ใช้ login
    bookingListDiv.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p style="color: #6b7280; font-size: 1.1em; margin-bottom: 20px;">
          กรุณา Login เพื่อดูรายการจอง
        </p>
        <button onclick="openLoginModal()" 
                style="background: #22c55e; color: white; padding: 12px 24px; 
                       border: none; border-radius: 8px; font-weight: 600; 
                       cursor: pointer; font-size: 1em;">
          🔐 เข้าสู่ระบบ
        </button>
      </div>
    `;
    return;
  }
  bookingListDiv.innerHTML = '<p style="text-align: center; color: #666;">⏳ กำลังโหลดข้อมูล...</p>';
  database.ref('bookings')
    .orderByChild('userId')
    .equalTo(user.uid)
    .once('value')
     .then((snapshot) => {
      debugLog('📊 Snapshot exists:', snapshot.exists());
      
      if (!snapshot.exists()) {
        bookingListDiv.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <p style="color: #6b7280; font-size: 1.1em;">
              ⚽ ยังไม่มีรายการจอง
            </p>
            <p style="color: #9ca3af; margin-top: 10px;">
              เริ่มจองสนามได้เลย!
            </p>
          </div>
        `;
        return;
      }

      const bookings = [];
      snapshot.forEach((childSnapshot) => {
        const booking = childSnapshot.val();
        booking.id = childSnapshot.key;
        
        // กรอง: ไม่แสดงรายการที่ถูกปฏิเสธ
        if (booking.bookingStatus !== 'rejected') {
          bookings.push(booking);
        }
      });

      debugLog('📋 Total bookings:', bookings.length);

      if (bookings.length === 0) {
        bookingListDiv.innerHTML = '<p style="text-align: center; color: #666;">ยังไม่มีรายการจอง</p>';
        return;
      }

      // เรียงตามวันที่ล่าสุด
      bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // แสดงรายการจอง
      bookingListDiv.innerHTML = bookings.map(booking => {
        return generateBookingCard(booking);
      }).join('');
    })
      .catch((error) => {
      console.error('❌ Error loading bookings:', error);
      bookingListDiv.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
          <p style="font-size: 1.1em; margin-bottom: 10px;">
            ❌ เกิดข้อผิดพลาดในการโหลดข้อมูล
          </p>
          <p style="color: #6b7280; font-size: 0.9em;">
            ${error.message}
          </p>
          <button onclick="updateBookingList()" 
                  style="margin-top: 20px; background: #22c55e; color: white; 
                         padding: 10px 20px; border: none; border-radius: 8px; 
                         cursor: pointer;">
            🔄 ลองใหม่
          </button>
        </div>
      `;
    });
  }

function generateBookingCard(booking) {
  // กำหนดสถานะและสี
  let statusColor = '#f59e0b';
  let statusText = 'รอตรวจสอบ';
  let statusBg = '#fef3c7';
  
  if (booking.bookingStatus === 'approved') {
    statusColor = '#10b981';
    statusText = 'อนุมัติแล้ว ✅';
    statusBg = '#d1fae5';
  } else if (booking.bookingStatus === 'pending_payment' || booking.bookingStatus === 'pending') {
    statusColor = '#f59e0b';
    statusText = 'รอตรวจสอบ ⏳';
    statusBg = '#fef3c7';
  } else if (booking.bookingStatus === 'confirmed') {
    statusColor = '#3b82f6';
    statusText = 'ยืนยันแล้ว';
    statusBg = '#dbeafe';
  } else if (booking.bookingStatus === 'completed') {
    statusColor = '#10b981';
    statusText = 'เสร็จสิ้น';
    statusBg = '#d1fae5';
  } else if (booking.bookingStatus === 'cancelled') {
    statusColor = '#6b7280';
    statusText = 'ยกเลิกแล้ว';
    statusBg = '#f3f4f6';
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  // เพิ่มปุ่มต่อเวลา (เฉพาะการจองที่ approved)
  let extensionButton = '';
  if (booking.bookingStatus === 'approved') {
    const bookingDate = new Date(booking.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate.getTime() === today.getTime()) {
      extensionButton = `
        <button class="extend-booking-btn" 
                onclick="requestBookingExtension('${booking.id}')"
                id="extend-btn-${booking.id}">
          <span>🔄</span>
          <span>ต่อเวลา 1 ชั่วโมง</span>
        </button>
        <div class="next-slot-info" id="next-slot-${booking.id}">
          กำลังตรวจสอบช่วงถัดไป...
        </div>
      `;
      
      setTimeout(() => checkNextSlotForBooking(booking), 100);
    }
  }

  return `
    <div class="booking-card" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid ${statusColor};">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #1f2937; font-size: 18px;">📋 ${booking.field || 'ไม่ระบุสนาม'}</h3>
        <span style="background: ${statusBg}; color: ${statusColor}; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">
          ${statusText}
        </span>
      </div>

      <!-- Info Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px;">
        <div>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">📅 วันที่เล่น</p>
          <p style="margin: 5px 0 0 0; color: #1f2937; font-weight: 600;">${formatDate(booking.date)}</p>
        </div>
        <div>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">⏰ เวลา</p>
          <p style="margin: 5px 0 0 0; color: #1f2937; font-weight: 600;">${booking.time || '-'}</p>
        </div>
        <div>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">💰 ราคารวม</p>
          <p style="margin: 5px 0 0 0; color: #1f2937; font-weight: 600;">฿${(booking.totalPrice || 0).toLocaleString()}</p>
        </div>
        <div>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">💵 มัดจำ</p>
          <p style="margin: 5px 0 0 0; color: #10b981; font-weight: 600;">฿${(booking.depositAmount || 0).toLocaleString()}</p>
        </div>
      </div>

      <!-- Created At -->
      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
        📝 จองเมื่อ: ${formatDateTime(booking.createdAt)}
      </p>

      <!-- Actions -->
      ${booking.bookingStatus !== 'cancelled' && booking.bookingStatus !== 'completed' ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          ${extensionButton}
          <button onclick="cancelBooking('${booking.id}')" 
                  id="cancel-btn-${booking.id}"
                  style="width: 100%; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; ${extensionButton ? 'margin-top: 12px;' : ''}">
            ❌ ยกเลิกการจอง
          </button>
        </div>
      ` : ''}
    </div>
  `;
}


function cancelBooking(bookingId) {

  if (isCancelling) {
     debugLog('⏳ Already cancelling a booking...');
     return;
    }

  if (!confirm("⚠️ ต้องการยกเลิกการจองนี้ใช่หรือไม่?\n\nข้อมูลการจองจะถูกลบออกจากระบบทันที")) {
    return;
  } 
  isCancelling = true;  
  debugLog('🗑️ Starting to cancel booking:', bookingId);

  // ใช้ bookingId หาปุ่มที่ถูกคลิก
  const cancelBtn = document.getElementById(`cancel-btn-${bookingId}`);
  const originalButtonText = cancelBtn ? cancelBtn.textContent : '❌ ยกเลิก';

  if (cancelBtn) {
    cancelBtn.textContent = '⏳ กำลังยกเลิก...';
    cancelBtn.disabled = true;
  }

  const bookingRef = database.ref('bookings/' + bookingId);

  bookingRef.once('value')
    .then((snapshot) => {
      const booking = snapshot.val();

      debugLog('📋 Booking data:', booking);
      
      if (!booking) {
        throw new Error('ไม่พบข้อมูลการจอง');
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('กรุณา Login ก่อนยกเลิกการจอง');
      }
        
      if (booking.userId !== currentUser.uid) {
        throw new Error('คุณไม่มีสิทธิ์ยกเลิกการจองนี้');
      }

      const uniqueKey = `${booking.field}_${booking.date}_${booking.time}`;
      debugLog('🔑 Lock key:', uniqueKey);

      return Promise.all([
        database.ref('bookings/' + bookingId).remove(),
        database.ref('booking_locks/' + uniqueKey).remove()
      ]);
    })
    .then(() => {
      console.log('✅ Booking cancelled successfully');
      alert("✅ ยกเลิกการจองเรียบร้อยแล้ว\n\nข้อมูลถูกลบออกจากระบบแล้ว");
      updateBookingList();
    })
    .catch((error) => {
      console.error('❌ Cancel booking error:', error);
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
  
    }).finally(() => {
      isCancelling = false; 

      // คืนค่าปุ่มเดิม
      if (cancelBtn) {
        cancelBtn.textContent = originalButtonText;
        cancelBtn.disabled = false;
      }
    })
}

// ========================================
// iNITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  console.log('🎯 DOM ready - initializing...');
  
  // ✅ CRITICAL: Initialize navigation
  initNavigation();
  
  // ✅ Start slider
  startSlider();
  
  // Close modal on background click
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target.id === 'loginModal' && typeof closeLoginModal === 'function') {
        closeLoginModal();
      }
    });
  }
  
  // ESC key
 document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (typeof closeLoginModal === 'function') closeLoginModal();
      
      const overlay = document.getElementById('menuOverlay');
      if (overlay && overlay.classList.contains('active')) {
         closeMobileMenu();
      }
      const extensionModal = document.getElementById('extensionModal');
    if (extensionModal && extensionModal.classList.contains('show')) {
      closeExtensionModal();
    }
    }
  });
// ========================================
// window RESIZE HANDLER (with debounce for better performance)
// ========================================
const handleResize = debounce(() => {
  if (window.innerWidth > 768) {
    const overlay = document.getElementById("menuOverlay");
    const hamburger = document.getElementById("hamburgerBtn");
    
    if (overlay) overlay.classList.remove("active");
    if (hamburger) hamburger.classList.remove("active");
    document.body.style.overflow = "";
  }
}, 150);

window.addEventListener("resize", handleResize);
});

// ========================================
// TOAST NOTIFICATION SYSTEM
// ========================================
const ToastSystem = {
  container: null,
  
  init() {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        document.body.appendChild(this.container);
      }
    }
  },
  
  show(message, type = 'success', duration = 3000) {
    this.init();
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
  },
  
  success(message, duration) {
    return this.show(message, 'success', duration);
  },
  
  error(message, duration) {
    return this.show(message, 'error', duration);
  },
  
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  },
  
  info(message, duration) {
    return this.show(message, 'info', duration);
  }
};

// Shorthand functions
function showToast(message, type = 'success', duration = 3000) {
  return ToastSystem.show(message, type, duration);
}

// ========================================
// GLOBAL LOADING OVERLAY SYSTEM
// ========================================
const LoadingSystem = {
  overlay: null,
  loadingText: null,
  
  init() {
    if (!this.overlay) {
      this.overlay = document.getElementById('global-loading');
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.id = 'global-loading';
        this.overlay.innerHTML = `
          <div class="loading-overlay">
            <div class="spinner"></div>
            <p class="loading-text">กำลังโหลด...</p>
          </div>
        `;
        document.body.appendChild(this.overlay);
      }
      this.loadingText = this.overlay.querySelector('.loading-text');
    }
  },
  
  show(message = 'กำลังโหลด...') {
    this.init();
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  
  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  
  // สำหรับปุ่ม
  showButton(button, originalText) {
    button.dataset.originalText = originalText || button.textContent;
    button.textContent = '';
    button.classList.add('btn-loading');
    button.disabled = true;
  },
  
  hideButton(button) {
    button.textContent = button.dataset.originalText || 'ตกลง';
    button.classList.remove('btn-loading');
    button.disabled = false;
  }
};

// Shorthand functions
function showLoading(message) {
  LoadingSystem.show(message);
}

function hideLoading() {
  LoadingSystem.hide();
}




// ========================================
// FIREBASE INITIALIZATION
// ========================================
let firebaseInitRetryCount = 0;
const MAX_FIREBASE_RETRIES = 50;

function initializeFirebase() {
  firebaseInitRetryCount++;
  if (window.firebaseLoadError) {
    console.error('❌ Firebase scripts failed to load (network error)');
    alert('⚠️ ไม่สามารถโหลด Firebase scripts ได้\n\nสาเหตุที่เป็นไปได้:\n- Network ไม่เสถียร\n- Firewall บล็อก www.gstatic.com\n- กรุณาเปิด Console (F12) เพื่อดูรายละเอียด');
    return;
  }
  
  if (typeof firebase === 'undefined') {
    if (firebaseInitRetryCount > MAX_FIREBASE_RETRIES) {
      console.error('❌ Firebase scripts failed to load after ' + (MAX_FIREBASE_RETRIES * 100 / 1000) + ' seconds');
      alert('⚠️ ไม่สามารถเชื่อมต่อ Firebase ได้\n\nกรุณาตรวจสอบ:\n- สัญญาณอินเทอร์เน็ต\n- Firewall/Proxy settings\n- Browser console (F12) สำหรับรายละเอียด');
      return;
    }
    
    if (firebaseInitRetryCount === 1 || firebaseInitRetryCount % 10 === 0) {
      console.log('⏳ Waiting for Firebase scripts... (' + firebaseInitRetryCount + '/' + MAX_FIREBASE_RETRIES + ')');
    }
    setTimeout(initializeFirebase, 100);
    return;
  }

  try {    // ⚠️⚠️⚠️ SECURITY WARNING ⚠️⚠️⚠️
    // Firebase Config นี้เปิดเผยใน client-side code
    // TODO ด่วน:
    // 1. Setup Firebase Security Rules (ดูไฟล์ firebase-security-rules.json)
    // 2. Enable Firebase App Check ใน Firebase Console
    // 3. จำกัด domains ที่อนุญาต
    

    const firebaseConfig = {
      apiKey: "AIzaSyB6jVc8qcyS9zIJvfi-E1BL7BaxrUorO7w",
      authDomain: "prijit-sport.firebaseapp.com",
      databaseURL: "https://prijit-sport-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "prijit-sport",
      storageBucket: "prijit-sport.firebasestorage.app",
      messagingSenderId: "19782245186",
      appId: "1:19782245186:web:8ff3e2e17a214edc3546db"
    };

    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    console.log("✅ Firebase ready! (loaded in " + (firebaseInitRetryCount * 100) + "ms)");
    
    // Initialize time slots after Firebase is ready
    initializeTimeSlots();
    console.log("✅ Time slots initialized");
    
    auth.onAuthStateChanged((user) => {
      if (user) {
        database.ref('users/' + user.uid).once('value')
          .then((snapshot) => {
            currentUser = {
              uid: user.uid,
              ...snapshot.val()
            };
            
            document.getElementById("currentUser").textContent = currentUser.fullname;
            document.getElementById("loginNavBtn").style.display = "none";
            document.getElementById("userInfo").style.display = "flex";
            
            updateBookingList();
            console.log("✅ Session restored:", currentUser.fullname);
          })
          .catch((error) => {
            console.error("❌ Failed to load user:", error);
          });
      } else {
        currentUser = null;
        document.getElementById("loginNavBtn").style.display = "inline-block";
        document.getElementById("userInfo").style.display = "none";
      }
    });
    // ตั้งค่าวันที่ขั้นต่ำใน date input เป็นวันนี้
    const dateInput = document.getElementById('dateSelect');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
}
    // ========================================
    // STAFF GALLERY FUNCTIONS
    // ========================================
    function loadStaffGallery() {
      const container = document.getElementById('staffGalleryContainer');
      if (!container) return;
      
      database.ref('gallery').orderByChild('order').on('value', (snapshot) => {
        container.innerHTML = '';
        
        if (!snapshot.exists()) {
          container.innerHTML = '<div class="content-loading-state">📷 ยังไม่มีรูปภาพ</div>';
          return;
        }

        const items = [];
        snapshot.forEach((child) => {
          items.push({ id: child.key, ...child.val() });
        });

        items.sort((a, b) => (a.order || 0) - (b.order || 0));

        items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'staff-gallery-card';
          card.onclick = () => openStaffModal(item.url);
          card.innerHTML = `
            <img src="${item.url}" alt="${item.title}" loading="lazy">
            <div class="staff-gallery-card-title">${item.title}</div>
          `;
          container.appendChild(card);
        });
      });
    }

    // ✅ Modal functions ถูกย้ายไปเป็น global แล้ว (ดูด้านบน)


    // เพิ่มการปิด Modal ด้วย ESC key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        const modal = document.getElementById('staffGalleryModal');
        if (modal && modal.classList.contains('show')) {
          closeStaffModal();
        }
      }
    });

    // ป้องกันการคลิกข้างในรูปภาพแล้ว Modal ปิด (เฉพาะรูปภาพเท่านั้น)
    const modalContent = document.querySelector('.staff-gallery-modal img');
    if (modalContent) {
      modalContent.addEventListener('click', function(event) {
        event.stopPropagation();
      });
    }

    // ทำให้ปุ่ม X ทำงานได้แน่นอน
    const closeButton = document.querySelector('.staff-gallery-close');
    if (closeButton) {
      closeButton.addEventListener('click', function(event) {
        event.stopPropagation(); // ป้องกัน event bubble
        closeStaffModal();
      });
    }

    // เพิ่ม Touch Support สำหรับ Mobile
    window.addEventListener('load', function() {
      const modal = document.getElementById('staffGalleryModal');
      const modalImg = document.getElementById('staffGalleryModalImg');
      
      if (modal && modalImg) {
        let touchStartY = 0;
        let touchEndY = 0;
        
        // Swipe down เพื่อปิด Modal (Mobile UX)
        modal.addEventListener('touchstart', function(e) {
          touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        modal.addEventListener('touchend', function(e) {
          touchEndY = e.changedTouches[0].screenY;
          const swipeDistance = touchEndY - touchStartY;
          
          // ถ้า swipe down มากกว่า 100px ให้ปิด Modal
          if (swipeDistance > 100) {
            closeStaffModal();
          }
        }, { passive: true });
        
        console.log('✅ Mobile touch events initialized');
      }
    });

    // ========================================
    // ACTIVITIES FUNCTIONS
    // ========================================
    function loadActivities() {
      const container = document.getElementById('activitiesContainer');
      if (!container) return;
      
      database.ref('activities').orderByChild('createdAt').on('value', (snapshot) => {
        container.innerHTML = '';
        
        if (!snapshot.exists()) {
          container.innerHTML = '<div class="content-loading-state">📝 ยังไม่มีข่าวสาร</div>';
          return;
        }

        const items = [];
        snapshot.forEach((child) => {
          items.push({ id: child.key, ...child.val() });
        });

        items.reverse();

        items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'activity-card';
          card.innerHTML = `
            <div class="activity-header">
              <div class="activity-title">${escapeHtml(item.title)}</div>
              <div class="activity-date">${formatDate(item.createdAt)}</div>
            </div>
            <div class="activity-content">${escapeHtml(item.content)}</div>
          `;
          container.appendChild(card);
        });
      });
    }

    function formatDate(iso) {
      if (!iso) return '-';
      const d = new Date(iso);
      return d.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Initialize
    loadStaffGallery();
    loadActivities();

    
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    alert("⚠️ ไม่สามารถเชื่อมต่อระบบได้\n\nError: " + error.message);
  }
}

// ========================================
// SERVICE WORKER ERROR HANDLING
// ========================================
// จัดการ Service Worker errors จาก Firebase Hosting
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        console.log('🔧 Firebase Service Worker detected');
        
        // Disable navigation preload เพื่อป้องกัน errors
        registrations.forEach(registration => {
          if (registration.navigationPreload) {
            registration.navigationPreload.disable()
              .then(() => console.log('✅ Navigation preload disabled'))
              .catch(() => {}); // Ignore errors
          }
        });
      }
    }).catch(() => {}); // Ignore errors
  });
}

// ป้องกัน unhandled promise rejections จาก Service Worker
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && 
      event.reason.message.includes('service worker')) {
    console.log('⚠️ Service Worker error caught and ignored');
    event.preventDefault();
  }
});


// ========================================
// EXTENSION SYSTEM FUNCTIONS - ระบบต่อเวลา
// ========================================

let currentExtensionBooking = null;
let extensionCountdownInterval = null;

// ตรวจสอบช่วงเวลาถัดไป
async function checkNextSlotForBooking(booking) {
  const timeSlotParts = booking.time.split(' - ');
  if (timeSlotParts.length < 2) return;
  
  const endTime = timeSlotParts[1];
  const nextStartTime = endTime;
  const nextEndTime = addOneHourToTime(endTime);
  
  try {
    const snapshot = await database.ref('bookings')
      .orderByChild('field_date_time')
      .equalTo(`${booking.field}_${booking.date}_${nextStartTime} - ${nextEndTime}`)
      .once('value');
    
    const nextSlotInfo = document.getElementById(`next-slot-${booking.id}`);
    if (!nextSlotInfo) return;
    
    if (snapshot.exists()) {
      nextSlotInfo.innerHTML = `
        <span style="color: #ef4444;">❌ ช่วงถัดไป ${nextStartTime} - ${nextEndTime} ถูกจองแล้ว</span>
      `;
      const btn = document.getElementById(`extend-btn-${booking.id}`);
      if (btn) btn.disabled = true;
    } else {
      nextSlotInfo.innerHTML = `
        <span style="color: #22c55e;">✓ ช่วงถัดไป ${nextStartTime} - ${nextEndTime} ว่าง</span>
      `;
    }
  } catch (error) {
    console.error('Error checking next slot:', error);
  }
}

// ขอต่อเวลา
async function requestBookingExtension(bookingId) {
  try {
    const snapshot = await database.ref(`bookings/${bookingId}`).once('value');
    const booking = snapshot.val();
    
    if (!booking) {
      showToast('❌ ไม่พบข้อมูลการจอง', 'error');
      return;
    }
    
    currentExtensionBooking = { ...booking, id: bookingId };
    
    const timeSlotParts = booking.time.split(' - ');
    const endTime = timeSlotParts[1];
    const nextStartTime = endTime;
    const nextEndTime = addOneHourToTime(endTime);
    
    // ตรวจสอบว่าช่วงถัดไปว่างหรือไม่
    const nextSlotSnapshot = await database.ref('bookings')
      .orderByChild('field_date_time')
      .equalTo(`${booking.field}_${booking.date}_${nextStartTime} - ${nextEndTime}`)
      .once('value');
    
    const modal = document.getElementById('extensionModal');
    modal.classList.add('show');
    
    if (!nextSlotSnapshot.exists()) {
      // ช่วงว่าง
      document.getElementById('availableExtensionSlot').style.display = 'block';
      document.getElementById('bookedExtensionSlot').style.display = 'none';
      
      document.getElementById('extensionSlotTime').textContent = `${nextStartTime} - ${nextEndTime}`;
      
      const hour = parseInt(nextStartTime.split(':')[0]);
      let price = calculateFieldPrice(booking.field, hour);
      document.getElementById('extensionSlotPrice').textContent = price;
      
      startExtensionCountdown(300);
      
    } else {
      // ช่วงถูกจองแล้ว
      document.getElementById('availableExtensionSlot').style.display = 'none';
      document.getElementById('bookedExtensionSlot').style.display = 'block';
      
      document.getElementById('bookedExtensionSlotTime').textContent = `${nextStartTime} - ${nextEndTime}`;
      
      await findAlternativeSlots(booking);
    }
    
  } catch (error) {
    console.error('Error requesting extension:', error);
    showToast('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
  }
}

// นับถอยหลัง 5 นาที
function startExtensionCountdown(seconds) {
  let remaining = seconds;
  const countdownDisplay = document.getElementById('extensionCountdown');
  const confirmBtn = document.getElementById('confirmExtensionBtn');
  
  if (extensionCountdownInterval) {
    clearInterval(extensionCountdownInterval);
  }
  
  extensionCountdownInterval = setInterval(() => {
    remaining--;
    
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;
    countdownDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
    
    if (remaining <= 60) {
      countdownDisplay.style.color = '#dc2626';
    }
    
    if (remaining <= 0) {
      clearInterval(extensionCountdownInterval);
      confirmBtn.disabled = true;
      showToast('⏰ หมดเวลายืนยัน กรุณาลองใหม่อีกครั้ง', 'error');
      setTimeout(() => closeExtensionModal(), 2000);
    }
  }, 1000);
}

// ยืนยันชำระเงิน
async function confirmExtensionPayment() {
  if (!currentExtensionBooking) return;
  
  const confirmBtn = document.getElementById('confirmExtensionBtn');
  confirmBtn.textContent = 'กำลังดำเนินการ...';
  confirmBtn.disabled = true;
  
  try {
    const booking = currentExtensionBooking;
    const timeSlotParts = booking.time.split(' - ');
    const endTime = timeSlotParts[1];
    const nextStartTime = endTime;
    const nextEndTime = addOneHourToTime(endTime);
    const timeSlot = `${nextStartTime} - ${nextEndTime}`;
    
    const hour = parseInt(nextStartTime.split(':')[0]);
    const price = calculateFieldPrice(booking.field, hour);
    
    const newBookingRef = database.ref('bookings').push();
    const uniqueKey = `${booking.field}_${booking.date}_${timeSlot}`;
    
    const extensionData = {
      userId: booking.userId,
      username: booking.username,
      phone: booking.phone,
      field: booking.field,
      date: booking.date,
      time: timeSlot,
      totalPrice: price,
      depositAmount: 0,
      remainingAmount: price,
      depositStatus: 'not_required',
      remainingStatus: 'unpaid',
      bookingStatus: 'approved',
      extendedFrom: booking.id,
      field_date_time: uniqueKey,
      createdAt: new Date().toISOString()
    };
    
    await newBookingRef.set(extensionData);
    
    await database.ref(`bookings/${booking.id}`).update({
      extendedTo: newBookingRef.key
    });
    
    showToast('✅ ต่อเวลาสำเร็จ! ขอบคุณที่ใช้บริการ', 'success');
    closeExtensionModal();
    updateBookingList();
    
  } catch (error) {
    console.error('Error confirming extension:', error);
    showToast('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
    confirmBtn.textContent = 'ยืนยันชำระเงิน';
    confirmBtn.disabled = false;
  }
}

// หาช่วงเวลาทางเลือก
async function findAlternativeSlots(booking) {
  console.log('🔍 Finding alternative slots for:', booking.time);
  
  const container = document.getElementById('alternativeSlotsList');
  container.innerHTML = '<div class="alternative-title">💡 ช่วงเวลาอื่นที่ว่าง</div>';
  
  try {
    const timeSlotParts = booking.time.split(' - ');
    const endTime = timeSlotParts[1]; // เช่น "16:00"
    console.log('  Current end time:', endTime);
    
    const allSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    
    // แก้ไข: หา index ที่ตรงกับ endTime
    const currentIndex = allSlots.indexOf(endTime);
    console.log('  Current index:', currentIndex);
    
    // ถ้าหาไม่เจอ ให้หาจากชั่วโมง
    let startIndex = currentIndex;
    if (currentIndex === -1) {
      const hour = parseInt(endTime.split(':')[0]);
      startIndex = allSlots.findIndex(t => parseInt(t.split(':')[0]) === hour);
      console.log('  Using hour-based index:', startIndex);
    }
    
    const alternativesFound = [];
    
    // หาช่วงถัดไป (เพิ่มเป็น 5 ช่วง)
    for (let i = startIndex + 1; i < allSlots.length && alternativesFound.length < 5; i++) {
      const start = allSlots[i];
      const end = addOneHourToTime(start);
      const timeSlot = `${start} - ${end}`;
      
      const snapshot = await database.ref('bookings')
        .orderByChild('field_date_time')
        .equalTo(`${booking.field}_${booking.date}_${timeSlot}`)
        .once('value');
      
      if (!snapshot.exists()) {
        const hour = parseInt(start.split(':')[0]);
        const price = calculateFieldPrice(booking.field, hour);
        
        const slotDiv = document.createElement('div');
        slotDiv.className = 'alternative-slot';
        slotDiv.innerHTML = `
          <span class="alternative-slot-time">${timeSlot}</span>
          <span class="alternative-slot-price">${price} บาท</span>
        `;
        slotDiv.onclick = () => selectAlternativeSlot(timeSlot, price);
        container.appendChild(slotDiv);
        
        alternativesFound.push(timeSlot);
      }
    }
    
    if (alternativesFound.length === 0) {
      container.innerHTML += '<p style="text-align: center; color: #6b7280; padding: 20px;">ไม่มีช่วงเวลาอื่นที่ว่าง</p>';
    }
  } catch (error) {
    console.error('Error finding alternatives:', error);
  }
}

// เลือกช่วงเวลาทางเลือก
function selectAlternativeSlot(timeSlot, price) {
  if (confirm(`ต้องการจอง ${timeSlot} ในราคา ${price} บาทหรือไม่?`)) {
    createAlternativeBooking(timeSlot, price);
  }
}

// สร้างการจองทางเลือก
async function createAlternativeBooking(timeSlot, price) {
  try {
    // ✅ ตรวจสอบว่ามี currentExtensionBooking หรือไม่
    if (!currentExtensionBooking) {
      showToast('❌ เกิดข้อผิดพลาด: ไม่พบข้อมูลการจอง', 'error');
      return;
    }
    
    const booking = currentExtensionBooking;
    const uniqueKey = `${booking.field}_${booking.date}_${timeSlot}`;
    
    // ✅ แสดง Loading
    showLoading('กำลังตรวจสอบความว่าง...');
    
    // ✅ ตรวจสอบความว่างอีกครั้งก่อนจอง
    const availabilityCheck = await database.ref('bookings')
      .orderByChild('field_date_time')
      .equalTo(uniqueKey)
      .once('value');
    
    if (availabilityCheck.exists()) {
      hideLoading();
      showToast('❌ ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกช่วงเวลาอื่น', 'error');
      return;
    }
    
    // ✅ อัพเดท loading message
    showLoading('กำลังสร้างการจอง...');
    
    // ✅ Lock slot ก่อนจอง
    const lockRef = database.ref('booking_locks/' + uniqueKey);
    await lockRef.set({
      userId: booking.userId,
      timestamp: Date.now()
    });
    
    // ✅ สร้างการจอง
    const newBookingRef = database.ref('bookings').push();
    const newBookingData = {
      userId: booking.userId,
      username: booking.username,
      phone: booking.phone,
      field: booking.field,
      date: booking.date,
      time: timeSlot,
      totalPrice: price,
      depositAmount: 0,
      remainingAmount: price,
      depositStatus: 'not_required',
      remainingStatus: 'unpaid',
      bookingStatus: 'approved',
      field_date_time: uniqueKey,
      createdAt: new Date().toISOString(),
      alternativeBooking: true // ✅ ทำเครื่องหมายว่าเป็นการจองทางเลือก
    };
    
    await newBookingRef.set(newBookingData);
    
    // ✅ ลบ lock
    await lockRef.remove();
    
    hideLoading();
    showToast('✅ จองช่วงเวลาใหม่สำเร็จ! กรุณาชำระเงิน', 'success');
    closeExtensionModal();
    
    // ✅ อัพเดทรายการจองและแสดงหน้า Dashboard
    updateBookingList();
    setTimeout(() => {
      const section = document.getElementById('checkBookingSection');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
    
  } catch (error) {
    console.error('Error creating alternative booking:', error);
    hideLoading();
    showToast('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
  }
}


// ปิด modal
function closeExtensionModal() {
  const modal = document.getElementById('extensionModal');
  modal.classList.remove('show');
  
  if (extensionCountdownInterval) {
    clearInterval(extensionCountdownInterval);
  }
  
  const confirmBtn = document.getElementById('confirmExtensionBtn');
  confirmBtn.textContent = 'ยืนยันชำระเงิน';
  confirmBtn.disabled = false;
  
  currentExtensionBooking = null;
}

// Helper: เพิ่ม 1 ชั่วโมง
function addOneHourToTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newHours = (hours + 1) % 24;
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper: คำนวณราคาสนาม
function calculateFieldPrice(field, hour) {
  let price = 0;
  
  if (field.includes('สนาม 1') || field.includes('สนาม 2') || field.includes('สนาม 3')) {
    price = hour >= 18 ? 1200 : 1000;
  } else if (field.includes('สนาม 4')) {
    price = hour >= 18 ? 1300 : 1100;
  } else if (field.includes('สนาม 5')) {
    price = hour >= 18 ? 1100 : 900;
  } else if (field.includes('สนาม 6')) {
    price = hour >= 18 ? 900 : 700;
  }
  
  return price;
}
// ========================================
// 🧹 CLEANUP: ป้องกัน Memory Leaks
// ========================================

window.addEventListener('beforeunload', () => {
  console.log('🧹 Cleaning up resources...');
  
  // 1. ปิด Firebase listeners
  if (database) {
    database.ref('bookings').off();
    database.ref('users').off();
  }
  
  // 2. Clear timers
  if (typeof paymentTimer !== 'undefined' && paymentTimer) {
    clearInterval(paymentTimer);
  }
  
  if (typeof extensionCountdownInterval !== 'undefined' && extensionCountdownInterval) {
    clearInterval(extensionCountdownInterval);
  }
  
  // 3. Cleanup booking locks
  if (typeof currentBookingData !== 'undefined' && currentBookingData) {
    const uniqueKey = `${currentBookingData.field}_${currentBookingData.date}_${currentBookingData.time}`;
    database.ref('booking_locks/' + uniqueKey).remove().catch(() => {});
  }
});

initializeFirebase();