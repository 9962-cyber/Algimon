document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const navbar = document.getElementById('navbar');
    const navIndicator = document.getElementById('nav-indicator');
    const navItems = document.querySelectorAll('.nav-item');
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileIcon = mobileToggle.querySelector('i');
    const backToTop = document.getElementById('back-to-top');

    // 1. Unified Scroll Logic (Sticky Header + Back to Top)
    const handleScroll = () => {
        // Sticky Navbar Logic
        if (window.scrollY > 50) {
            navbar.classList.remove('is-top');
            navbar.classList.add('is-scrolled');
            if (window.innerWidth <= 768) mobileMenu.style.top = '60px';
        } else {
            navbar.classList.add('is-top');
            navbar.classList.remove('is-scrolled');
            if (window.innerWidth <= 768) mobileMenu.style.top = '70px';
        }

        // Back to Top Button Logic
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Init check

    // 2. Sliding Indicator Logic
    function moveIndicator(element) {
        if (!element || window.innerWidth <= 768) return; 
        const parentRect = element.parentElement.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const left = elementRect.left - parentRect.left;
        const width = elementRect.width;

        navIndicator.style.width = `${width * 0.6}px`; 
        navIndicator.style.transform = `translateX(${left + (width * 0.2)}px)`;
        navIndicator.style.opacity = '1';
    }

    function hideIndicator() {
        navIndicator.style.opacity = '0';
        navIndicator.style.width = '0px';
    }

    navItems.forEach(item => {
        item.addEventListener('mouseenter', (e) => moveIndicator(e.target));
    });

    // Ensure indicator hides when leaving the nav container
    const navLinksContainer = document.querySelector('.nav-links');
    if (navLinksContainer) {
        navLinksContainer.addEventListener('mouseleave', hideIndicator);
    }

    // 3. Mobile Menu Logic
    let isMenuOpen = false;
    mobileToggle.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            mobileMenu.classList.add('is-open');
            mobileIcon.classList.replace('ph-list', 'ph-x');
        } else {
            mobileMenu.classList.remove('is-open');
            mobileIcon.classList.replace('ph-x', 'ph-list');
        }
    });

    // Close mobile menu when a link is clicked
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            isMenuOpen = false;
            mobileMenu.classList.remove('is-open');
            mobileIcon.classList.replace('ph-x', 'ph-list');
        });
    });

    // 4. Counters (Original Logic)
    const stats = document.querySelectorAll('.stat-number');
    const observerStats = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const target = +stat.getAttribute('data-target');
                const speed = 100;

                const updateCount = () => {
                    const currentText = stat.innerText.replace(/\D/g, ''); 
                    const count = +currentText;
                    const inc = target / speed;

                    const labelText = stat.parentElement.querySelector('.stat-label').innerText;
                    const isPercent = labelText.includes('Satisfaction') || target === 100;
                    const suffix = isPercent ? '%' : '+';

                    if (count < target) {
                        stat.innerText = Math.ceil(count + inc) + suffix;
                        setTimeout(updateCount, 25);
                    } else {
                        stat.innerText = target + suffix;
                    }
                };

                updateCount();
                observer.unobserve(stat);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => observerStats.observe(stat));

    // 5. Scroll Reveal (Original Logic)
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const scrollElements = document.querySelectorAll('.reveal-on-scroll');
    scrollElements.forEach(el => observer.observe(el));
});
/* =========================================
   SCHEDULE APPOINTMENT MODAL LOGIC
========================================= */

// 1. Modal Open/Close
function openScheduleModal() {
    document.getElementById('modal-schedule').classList.add('active');
    renderCalendar(); // Render the calendar when opened
}

function closeScheduleModal() {
    document.getElementById('modal-schedule').classList.remove('active');
    document.getElementById('form-schedule').reset();
    
    // Reset toggles to default hidden states
    document.getElementById('recurrence-options').style.display = 'none';
    document.getElementById('saved-property-wrapper').style.display = 'block';
    document.getElementById('input-custom-address').style.display = 'none';
    
    // Clear selected date
    selectedDate = null;
}

// 2. Form Toggles Logic
function toggleRepeatOptions() {
    const isChecked = document.getElementById('toggle-repeat').checked;
    const optionsDiv = document.getElementById('recurrence-options');
    optionsDiv.style.display = isChecked ? 'block' : 'none';
}

function toggleAddressInput() {
    const isCustom = document.getElementById('toggle-custom-address').checked;
    const selectWrapper = document.getElementById('saved-property-wrapper');
    const inputWrapper = document.getElementById('input-custom-address');
    
    if (isCustom) {
        selectWrapper.style.display = 'none';
        inputWrapper.style.display = 'block';
        document.getElementById('select-saved-property').required = false;
        inputWrapper.required = true;
    } else {
        selectWrapper.style.display = 'block';
        inputWrapper.style.display = 'none';
        document.getElementById('select-saved-property').required = true;
        inputWrapper.required = false;
    }
}

// 3. Custom Functional Calendar Logic
let currentDate = new Date(); // Gets today's real date
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null; // Stores the clicked date

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function renderCalendar() {
    const monthYearDisplay = document.getElementById('month-year-display');
    const daysContainer = document.getElementById('calendar-days');
    
    // Update Header Text
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Clear previous days
    daysContainer.innerHTML = '';
    
    // Get first day of month and total days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add empty slots for days before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-day empty';
        daysContainer.appendChild(emptyDiv);
    }
    
    // Render actual days
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.textContent = i;
        
        // Check if this day is currently selected
        if (selectedDate && 
            selectedDate.getDate() === i && 
            selectedDate.getMonth() === currentMonth && 
            selectedDate.getFullYear() === currentYear) {
            dayDiv.classList.add('selected');
        }
        
        // Add click event to select date
        dayDiv.onclick = function() {
            // Remove 'selected' from all other days
            document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
            // Add 'selected' to clicked day
            dayDiv.classList.add('selected');
            
            // Save the exact date globally and in hidden input for form submission
            selectedDate = new Date(currentYear, currentMonth, i);
            
            // Format to YYYY-MM-DD for standard form handling
            const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            document.getElementById('selected-schedule-date').value = formattedDate;
        };
        
        daysContainer.appendChild(dayDiv);
    }
}

// Change months
function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

// 4. Form Submission
function submitSchedule(event) {
    event.preventDefault();
    
    const dateInput = document.getElementById('selected-schedule-date').value;
    if (!dateInput) {
        alert("Please select a date from the calendar on the left.");
        return;
    }
    
    alert("Appointment Scheduled Successfully for " + dateInput + "!");
    closeScheduleModal();
}