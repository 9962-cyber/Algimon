document.addEventListener('DOMContentLoaded', () => {
    /*  CONFIGURATION  */
    const MOBILE_BREAKPOINT = 768;

    /* --- DOM ELEMENTS --- */
    const navbar = document.getElementById('navbar');
    const navIndicator = document.getElementById('nav-indicator');
    const navItems = document.querySelectorAll('.nav-item');
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileIcon = mobileToggle.querySelector('i');
    const navLinksContainer = document.querySelector('.nav-links');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    /* --- STATE MANAGEMENT --- */
    let isMenuOpen = false;

    // Helper to check current device state
    const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

    /* 1. NAVBAR SCROLL LOGIC 
       Refactored to handle height changes dynamically 
    */
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.remove('is-top');
            navbar.classList.add('is-scrolled');
            // If menu is open, adjust its top position based on the smaller navbar
            if (isMobile()) mobileMenu.style.top = '60px'; 
        } else {
            navbar.classList.add('is-top');
            navbar.classList.remove('is-scrolled');
            // If menu is open, adjust its top position based on the taller navbar
            if (isMobile()) mobileMenu.style.top = '70px'; 
        }
        
        // Handle Scroll to Top Button Visibility here to save event listeners
        if (window.scrollY > 400) {
            scrollTopBtn.classList.add('is-visible');
        } else {
            scrollTopBtn.classList.remove('is-visible');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Init on load

    /* 2. INDICATOR LOGIC 
       Added check to hide immediately on mobile
    */
    function moveIndicator(element) {
        if (!element || isMobile()) {
            hideIndicator(); // Ensure it's hidden if we accidentally trigger it on mobile
            return; 
        }

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
    
    if (navLinksContainer) {
        navLinksContainer.addEventListener('mouseleave', hideIndicator);
    }

    /* 3. MOBILE MENU TOGGLE */
    const toggleMenu = (forceClose = false) => {
        if (forceClose) {
            isMenuOpen = false;
        } else {
            isMenuOpen = !isMenuOpen;
        }

        if (isMenuOpen) {
            mobileMenu.classList.add('is-open');
            mobileIcon.classList.replace('ph-list', 'ph-x');
            
            // Set initial top position based on current scroll state
            const currentTop = navbar.classList.contains('is-scrolled') ? '60px' : '70px';
            mobileMenu.style.top = currentTop;
        } else {
            mobileMenu.classList.remove('is-open');
            mobileIcon.classList.replace('ph-x', 'ph-list');
        }
    };

    mobileToggle.addEventListener('click', () => toggleMenu());

    // Close menu when a link is clicked
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => toggleMenu(true));
    });

    /* 4. WINDOW RESIZE HANDLER (CRITICAL FOR RESPONSIVENESS) 
       This handles orientation changes (portrait to landscape) 
       and resizing desktop windows to mobile width.
    */
    window.addEventListener('resize', () => {
        // If we resize TO desktop FROM mobile, force close the menu
        if (!isMobile() && isMenuOpen) {
            toggleMenu(true);
        }
        
        // If we are on mobile, ensure the top position is correct based on scroll
        if (isMobile()) {
             const currentTop = navbar.classList.contains('is-scrolled') ? '60px' : '70px';
             mobileMenu.style.top = currentTop;
        } else {
            // Hide the hover indicator if we resize
            hideIndicator();
        }
    });

    /* 5. SCROLL TO TOP ACTION */
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    /* 6. ANIMATION OBSERVER */
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, obs) => {
        let delayCounter = 0; 
        
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                if (!entry.target.classList.contains('visible')) {
                    // Reduced delay for mobile (optional, feels snappier)
                    const delayBase = isMobile() ? 100 : 150; 
                    
                    entry.target.style.transitionDelay = `${delayCounter * delayBase}ms`;
                    delayCounter++;
                    
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in-up');
    fadeElements.forEach(el => observer.observe(el));
});