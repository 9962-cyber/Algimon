        document.addEventListener('DOMContentLoaded', () => {
            // 
            // 1. NAVBAR & MENU LOGIC
            // 
            const navbar = document.getElementById('navbar');
            const navItems = document.querySelectorAll('.nav-item');
            const mobileToggle = document.getElementById('mobile-toggle');
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileIcon = mobileToggle.querySelector('i');

            // Sticky Header Logic
            const handleScroll = () => {
                if (window.scrollY > 50) {
                    navbar.classList.remove('is-top');
                    navbar.classList.add('is-scrolled');
                    if (window.innerWidth <= 768) mobileMenu.style.top = '60px';
                } else {
                    navbar.classList.add('is-top');
                    navbar.classList.remove('is-scrolled');
                    if (window.innerWidth <= 768) mobileMenu.style.top = '70px';
                }
            };
            window.addEventListener('scroll', handleScroll);
            handleScroll(); 

            // Mobile Menu Toggle
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
            
            // Close mobile menu when clicking a link
            document.querySelectorAll('.mobile-link').forEach(link => {
                link.addEventListener('click', () => {
                    isMenuOpen = false;
                    mobileMenu.classList.remove('is-open');
                    mobileIcon.classList.replace('ph-x', 'ph-list');
                });
            });

            // 
            // 2. 🐢 SLOW FADE-IN SCROLL ANIMATION 🐢
            // 
            const style = document.createElement('style');
            style.innerHTML = `
                .reveal-on-scroll {
                    opacity: 0;
                    transform: translateY(60px);
                    transition: opacity 1.5s ease-out, transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    will-change: opacity, transform;
                }
                .reveal-on-scroll.is-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
            const revealElements = document.querySelectorAll('.section-history, .section-projects, .section-trusted-by, .section-references');
            
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        revealObserver.unobserve(entry.target); 
                    }
                });
            }, { 
                threshold: 0.1, 
                rootMargin: "0px 0px -50px 0px" 
            });

            revealElements.forEach((el) => {
                el.classList.add('reveal-on-scroll');
                revealObserver.observe(el);
            });

            //
            // 3. CAROUSEL LOGIC
            //
            const carousels = [
                { id: 'projects', track: document.getElementById('track-projects'), index: 0 },
                { id: 'ongoing', track: document.getElementById('track-ongoing'), index: 0 }
            ];

            carousels.forEach(carousel => {
                if(!carousel.track) return; 
                
                const originalItems = Array.from(carousel.track.children);
                if (originalItems.length === 0) return; 

                originalItems.forEach(item => carousel.track.appendChild(item.cloneNode(true)));
                originalItems.forEach(item => carousel.track.appendChild(item.cloneNode(true)));

                const getSlideWidth = () => originalItems[0].offsetWidth + parseFloat(getComputedStyle(originalItems[0]).marginRight);
                
                let initialOffset = originalItems.length * getSlideWidth();
                carousel.track.style.transform = `translateX(-${initialOffset}px)`;
                
                const slide = () => {
                    if (carousel.index < 0) {
                        carousel.track.style.transition = 'none';
                        carousel.index = originalItems.length; 
                        let newTransform = carousel.index * getSlideWidth();
                        carousel.track.style.transform = `translateX(-${newTransform}px)`;
                        
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                carousel.track.style.transition = 'transform 0.4s ease-in-out';
                                carousel.index--; 
                                newTransform = carousel.index * getSlideWidth();
                                carousel.track.style.transform = `translateX(-${newTransform}px)`;
                            });
                        });

                    } else if (carousel.index >= originalItems.length) {
                        carousel.track.style.transition = 'none';
                        carousel.index = 0; 
                        let newTransform = carousel.index * getSlideWidth() + initialOffset;
                        carousel.track.style.transform = `translateX(-${newTransform}px)`;

                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                carousel.track.style.transition = 'transform 0.4s ease-in-out';
                                carousel.index++; 
                                newTransform = carousel.index * getSlideWidth() + initialOffset;
                                carousel.track.style.transform = `translateX(-${newTransform}px)`;
                            });
                        });
                        
                    } else {
                        const newTransform = carousel.index * getSlideWidth() + initialOffset;
                        carousel.track.style.transition = 'transform 0.4s ease-in-out';
                        carousel.track.style.transform = `translateX(-${newTransform}px)`;
                    }
                };
                
                document.querySelectorAll(`.carousel-button[data-carousel="${carousel.id}"]`).forEach(button => {
                    button.addEventListener('click', () => {
                        if (button.classList.contains('next-button')) {
                            carousel.index++;
                        } else {
                            carousel.index--;
                        }
                        slide();
                    });
                });
                
                window.addEventListener('resize', () => {
                    const slideWidth = getSlideWidth();
                    initialOffset = originalItems.length * slideWidth;
                    const newTransform = carousel.index * slideWidth + initialOffset;
                    carousel.track.style.transition = 'none';
                    carousel.track.style.transform = `translateX(-${newTransform}px)`;
                });
            });

            // 
            // 4. ANIMATED NUMBER COUNTERS
            // 
            const statsSection = document.querySelector('.history-stats');
            const statsNumbers = document.querySelectorAll('.stat-number');
            let started = false;

            if (statsSection && statsNumbers.length > 0) {
                const statsObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && !started) {
                        started = true;
                        statsNumbers.forEach(stat => {
                            const rawText = stat.innerText;
                            const target = parseInt(rawText); 
                            const suffix = rawText.replace(/[0-9]/g, ''); 
                            
                            let start = 0;
                            const duration = 2000;
                            const increment = target / (duration / 16); 

                            const timer = setInterval(() => {
                                start += increment;
                                stat.innerText = Math.floor(start) + suffix;
                                if (start >= target) {
                                    stat.innerText = target + suffix;
                                    clearInterval(timer);
                                }
                            }, 16);
                        });
                    }
                });
                statsObserver.observe(statsSection);
            }

            // 
            // 5. SMOOTH SCROLL OFFSET FIX
            // 
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href');
                    if(targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        const offset = 90; 
                        const bodyRect = document.body.getBoundingClientRect().top;
                        const elementRect = targetElement.getBoundingClientRect().top;
                        const elementPosition = elementRect - bodyRect;
                        const offsetPosition = elementPosition - offset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth"
                        });
                    }
                });
            });

            //
            // 6. IMAGE HOVER EFFECTS
            //
            const imageHoverStyle = document.createElement('style');
            imageHoverStyle.innerHTML = `
                .history-image-wrapper { overflow: hidden; position: relative; }
                .history-image { transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
                .history-image-wrapper:hover .history-image { transform: scale(1.08); }
                .history-image-wrapper:hover { box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important; }

                .carousel-item { transition: transform 0.4s ease, box-shadow 0.4s ease !important; }
                .carousel-item img { transition: transform 0.5s ease; }
                .carousel-item:hover { transform: translateY(-10px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important; z-index: 2; }
                .carousel-item:hover img { transform: scale(1.1); }

                .logo-grid-item img { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .logo-grid-item:hover img { transform: scale(1.2); filter: drop-shadow(0 15px 15px rgba(0,0,0,0.2)); }
            `;
            document.head.appendChild(imageHoverStyle);

            // 
            // 7. GLOSS & BACK TO TOP
            // 
            const glossStyle = document.createElement('style');
            glossStyle.innerHTML = `
                .carousel-item { position: relative; overflow: hidden; }
                .carousel-item::before {
                    content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
                    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
                    transform: skewX(-25deg); z-index: 10; pointer-events: none; transition: none;
                }
                .carousel-item:hover::before { left: 150%; transition: left 0.7s ease; }

                #back-to-top {
                    position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px;
                    background-color: #6d2c24; color: white; border: none; border-radius: 50%;
                    font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3); opacity: 0; visibility: hidden;
                    transform: translateY(20px) scale(0.9); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    z-index: 2000;
                }
                #back-to-top.visible { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
                #back-to-top:hover { background-color: #c44d39; transform: translateY(-5px) scale(1.05); box-shadow: 0 8px 25px rgba(196, 77, 57, 0.5); }
            `;
            document.head.appendChild(glossStyle);

            const topBtn = document.createElement('button');
            topBtn.id = 'back-to-top';
            topBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>'; 
            document.body.appendChild(topBtn);

            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    topBtn.classList.add('visible');
                } else {
                    topBtn.classList.remove('visible');
                }
            });

            topBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // 
            // 8. MOBILE RESPONSIVE CSS
            // 
            const mobileAboutStyle = document.createElement('style');
            mobileAboutStyle.innerHTML = `
                @media screen and (max-width: 992px) {
                    .section-history .history-content { flex-direction: column !important; gap: 30px; }
                    .history-image-wrapper, .history-text { max-width: 100% !important; flex: 0 0 100% !important; width: 100% !important; }
                    .history-text { text-align: center; display: flex; flex-direction: column; align-items: center; }
                    .divider { margin: 0 auto 1.5rem auto !important; }
                    .history-stats { width: 100%; justify-content: center; flex-wrap: wrap; gap: 20px; margin-top: 10px; }
                    .history-image-wrapper { margin-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
                    .section-history { padding-top: 100px; padding-bottom: 50px; }
                }
            `;
            document.head.appendChild(mobileAboutStyle);
        });