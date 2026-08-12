/**
 * Blue Bird CSS Framework JS Helper
 * @param {string|object} component - Component name ('snackbar', 'drawer', 'carousel', 'toast', 'tab', 'command', 'popover') or options
 * @param {object} [options] - Component configuration options
 */
function bluebird(component, options) {
    if (typeof component === 'object') {
        options = component;
        component = 'snackbar';
    }

    // --- SNACKBAR COMPONENT ---
    if (component === 'snackbar') {
        let snackbarEl = document.getElementById('snackbar');

        if (!snackbarEl) {
            snackbarEl = document.createElement('div');
            snackbarEl.id = 'snackbar';
            document.body.appendChild(snackbarEl);
        }

        snackbarEl.className = 'show';

        if (options && options.type) {
            snackbarEl.classList.add(options.type);
        } else {
            snackbarEl.classList.add('info');
        }

        snackbarEl.textContent = (options && options.message) || '';
        setTimeout(() => {
            snackbarEl.classList.add('show');
        }, 10);

        const duration = (options && options.duration) || 3000;
        if (snackbarEl.timeoutId) {
            clearTimeout(snackbarEl.timeoutId);
        }

        snackbarEl.timeoutId = setTimeout(function () {
            snackbarEl.className = '';
        }, duration);
    }

    // --- MULTI-TOAST SYSTEM ---
    if (component === 'toast') {
        const position = (options && options.position) || 'bottom-right';
        let container = document.querySelector(`.toast-container.${position}`);

        if (!container) {
            container = document.createElement('div');
            container.className = `toast-container ${position}`;
            document.body.appendChild(container);
        }

        const toastEl = document.createElement('div');
        const typeClass = (options && options.type) ? `toast-${options.type}` : 'toast-info';
        toastEl.className = `toast ${typeClass}`;

        const title = (options && options.title) ? `<div class="toast-title">${options.title}</div>` : '';
        const desc = (options && options.description) ? `<div class="toast-description">${options.description}</div>` : '';

        toastEl.innerHTML = `
      <div class="toast-content">
        ${title}
        ${desc}
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

        const closeBtn = toastEl.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => dismissToast(toastEl));

        container.appendChild(toastEl);

        const duration = (options && options.duration) !== undefined ? options.duration : 4000;
        if (duration > 0) {
            setTimeout(() => dismissToast(toastEl), duration);
        }
    }

    // --- TABS COMPONENT ---
    if (component === 'tab') {
        const targetId = options && options.id;
        if (!targetId) return;

        const targetContent = document.getElementById(targetId);
        if (!targetContent) return;

        const tabsContainer = targetContent.closest('.tabs');
        if (!tabsContainer) return;

        const allTriggers = tabsContainer.querySelectorAll('.tab-trigger');
        const allContents = tabsContainer.querySelectorAll('.tab-content');

        allContents.forEach(c => c.classList.remove('active'));
        allTriggers.forEach(t => t.classList.remove('active'));

        targetContent.classList.add('active');

        const matchingTrigger = Array.from(allTriggers).find(t =>
            t.getAttribute('data-tab-target') === targetId || t.getAttribute('href') === `#${targetId}`
        );

        if (matchingTrigger) {
            matchingTrigger.classList.add('active');
        }
    }

    // --- COMMAND PALETTE MODAL ---
    if (component === 'command') {
        const action = (options && options.action) || 'toggle';
        let backdrop = document.querySelector('.command-backdrop');

        if (!backdrop) {
            backdrop = createCommandPaletteModal();
        }

        const isOpen = backdrop.classList.contains('open');

        if (action === 'open' || (action === 'toggle' && !isOpen)) {
            backdrop.classList.add('open');
            const input = backdrop.querySelector('.command-input');
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 50);
            }
        } else if (action === 'close' || (action === 'toggle' && isOpen)) {
            backdrop.classList.remove('open');
        }
    }

    // --- POPOVER COMPONENT ---
    if (component === 'popover') {
        const id = options && options.id;
        const action = (options && options.action) || 'toggle';
        if (!id) return;

        const popoverEl = document.getElementById(id) || document.querySelector(`[data-popover-id="${id}"]`);
        if (!popoverEl) return;

        const isOpen = popoverEl.classList.contains('open');
        if (action === 'open' || (action === 'toggle' && !isOpen)) {
            popoverEl.classList.add('open');
        } else {
            popoverEl.classList.remove('open');
        }
    }

    // --- STANDALONE DRAWER COMPONENT ---
    if (component === 'drawer') {
        cleanupOrphanedBackdrops();

        const id = options && options.id;
        const action = (options && options.action) || 'toggle';
        if (!id) return;

        const drawerEl = document.getElementById(id);
        if (!drawerEl) return;

        let overlay = document.querySelector(`.drawer-backdrop[data-for="${id}"]`);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'drawer-backdrop';
            overlay.setAttribute('data-for', id);
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => {
                bluebird('drawer', { id, action: 'close' });
            });
        }

        const isOpen = drawerEl.classList.contains('open') || drawerEl.classList.contains('active');

        if (action === 'open' || (action === 'toggle' && !isOpen)) {
            drawerEl.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        } else if (action === 'close' || (action === 'toggle' && isOpen)) {
            drawerEl.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
            setTimeout(() => {
                if (overlay && overlay.parentNode && !drawerEl.classList.contains('open')) {
                    overlay.remove();
                }
            }, 300);
        }
    }

    // --- CAROUSEL COMPONENT ---
    if (component === 'carousel') {
        const selector = (options && options.selector) || '.carousel';
        const carousels = document.querySelectorAll(selector);
        carousels.forEach(carousel => initSingleCarousel(carousel, options));
    }
}

/**
 * Global alias for snackbar
 * @param {object} options - Snackbar configuration options
 */
function snackbar(options) {
    bluebird('snackbar', options);
}

/**
 * Global alias for toast notification
 * @param {object} options - Toast configuration options
 */
function toast(options) {
    bluebird('toast', options);
}

function dismissToast(toastEl) {
    if (!toastEl || toastEl.isDismissing) return;
    toastEl.isDismissing = true;
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(-10px) scale(0.95)';
    setTimeout(() => {
        if (toastEl.parentNode) {
            toastEl.remove();
        }
    }, 200);
}

/**
 * Create default command palette DOM modal
 */
function createCommandPaletteModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'command-backdrop';
    backdrop.innerHTML = `
    <div class="command-dialog">
      <div class="command-input-wrapper">
        <span>🔍</span>
        <input type="text" class="command-input" placeholder="Type a command or search documentation..." />
        <kbd>ESC</kbd>
      </div>
      <div class="command-list">
        <div class="command-group">
          <div class="command-group-title">Navigation</div>
          <div class="command-item" data-navigate="#/"><span>Documentation Home</span><kbd>↵</kbd></div>
          <div class="command-item" data-navigate="#/nextjs"><span>Next.js Integration Guide</span><kbd>↵</kbd></div>
          <div class="command-item" data-navigate="#/buttons"><span>Buttons & Badges</span><kbd>↵</kbd></div>
          <div class="command-item" data-navigate="#/forms"><span>Forms & Inputs</span><kbd>↵</kbd></div>
        </div>
        <div class="command-group">
          <div class="command-group-title">Components</div>
          <div class="command-item" data-navigate="#/carousel"><span>Touch Carousel</span><kbd>↵</kbd></div>
          <div class="command-item" data-navigate="#/aside-drawer"><span>Aside & Drawers</span><kbd>↵</kbd></div>
          <div class="command-item" data-navigate="#/animations"><span>CSS Animations</span><kbd>↵</kbd></div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            bluebird('command', { action: 'close' });
        }
    });

    const input = backdrop.querySelector('.command-input');
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = backdrop.querySelectorAll('.command-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    });

    backdrop.addEventListener('click', (e) => {
        const item = e.target.closest('.command-item');
        if (item && item.getAttribute('data-navigate')) {
            window.location.hash = item.getAttribute('data-navigate');
            bluebird('command', { action: 'close' });
        }
    });

    return backdrop;
}

/**
 * Remove backdrops whose target drawer no longer exists in DOM
 */
function cleanupOrphanedBackdrops() {
    document.querySelectorAll('.drawer-backdrop[data-for]').forEach(backdrop => {
        const targetId = backdrop.getAttribute('data-for');
        if (!document.getElementById(targetId)) {
            backdrop.remove();
        }
    });
}

function initMobileDrawer() {
    const mainEl = document.querySelector('main');
    const aside = mainEl ? mainEl.querySelector(':scope > aside') : null;
    if (!aside) return;

    let overlay = document.querySelector('.bluebird-drawer-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'bluebird-drawer-overlay';
        document.body.appendChild(overlay);
    }

    let drawer = document.querySelector('.bluebird-drawer');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.className = 'bluebird-drawer';
        document.body.appendChild(drawer);
    }

    drawer.innerHTML = aside.innerHTML;

    let toggle = document.querySelector('.bluebird-drawer-toggle');
    if (!toggle) {
        toggle = document.createElement('button');
        toggle.className = 'bluebird-drawer-toggle';
        toggle.innerHTML = '☰';
        toggle.setAttribute('aria-label', 'Toggle navigation menu');

        const header = document.querySelector('header');
        if (header) {
            const nav = header.querySelector('nav');
            if (nav) {
                nav.insertBefore(toggle, nav.firstChild);
            } else {
                header.prepend(toggle);
            }
        } else {
            document.body.prepend(toggle);
        }
    }
}

// Global keyboard listener for Ctrl+K / Cmd+K Command Palette shortcut & ESC key
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        bluebird('command', { action: 'toggle' });
    }

    if (e.key === 'Escape') {
        const commandBackdrop = document.querySelector('.command-backdrop.open');
        if (commandBackdrop) {
            bluebird('command', { action: 'close' });
        }
    }
});

// Global click listener for Material Ripples, Mobile Navigation Drawer, Tabs, Popovers & Declarative Data Attributes
document.addEventListener('click', function (e) {
    // 1. Declarative Tab Trigger Click
    const tabTrigger = e.target.closest('[data-tab-target], .tab-trigger');
    if (tabTrigger) {
        const targetId = tabTrigger.getAttribute('data-tab-target') || (tabTrigger.getAttribute('href') || '').replace('#', '');
        if (targetId) {
            e.preventDefault();
            bluebird('tab', { id: targetId });
        }
    }

    // 2. Declarative Popover Trigger Click
    const popoverTrigger = e.target.closest('[data-popover-target]');
    if (popoverTrigger) {
        const popoverId = popoverTrigger.getAttribute('data-popover-target');
        bluebird('popover', { id: popoverId, action: 'toggle' });
    }

    // Close open popovers when clicking outside
    if (!e.target.closest('.popover') && !e.target.closest('[data-popover-target]')) {
        document.querySelectorAll('.popover.open').forEach(p => p.classList.remove('open'));
    }

    // 3. Mobile Navigation Toggle Button Click
    const mobileToggle = e.target.closest('.bluebird-drawer-toggle');
    if (mobileToggle) {
        e.preventDefault();
        e.stopPropagation();
        initMobileDrawer();
        const drawer = document.querySelector('.bluebird-drawer');
        const overlay = document.querySelector('.bluebird-drawer-overlay');
        if (drawer && overlay) {
            const isOpen = drawer.classList.contains('open');
            if (isOpen) {
                drawer.classList.remove('open');
                overlay.classList.remove('open');
                document.body.style.overflow = '';
            } else {
                drawer.classList.add('open');
                overlay.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
        }
        return;
    }

    // 4. Mobile Navigation Overlay Click
    if (e.target.closest('.bluebird-drawer-overlay')) {
        const drawer = document.querySelector('.bluebird-drawer');
        const overlay = document.querySelector('.bluebird-drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        return;
    }

    // 5. Mobile Navigation Drawer Link Click
    if (e.target.closest('.bluebird-drawer a')) {
        const drawer = document.querySelector('.bluebird-drawer');
        const overlay = document.querySelector('.bluebird-drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Material Ripple Effect
    const btn = e.target.closest("button, a[role='button']");
    if (btn && !btn.classList.contains('fab') && !btn.classList.contains('carousel-nav') && !btn.classList.contains('bluebird-drawer-toggle')) {
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    // Declarative Standalone Drawer Triggers
    const drawerTrigger = e.target.closest('[data-drawer-target]');
    if (drawerTrigger) {
        const id = drawerTrigger.getAttribute('data-drawer-target');
        bluebird('drawer', { id, action: 'toggle' });
    }

    const drawerClose = e.target.closest('[data-drawer-close]');
    if (drawerClose) {
        const drawerEl = drawerClose.closest('.drawer');
        if (drawerEl && drawerEl.id) {
            bluebird('drawer', { id: drawerEl.id, action: 'close' });
        }
    }
});

/**
 * Single Carousel Initialization logic with Touch/Swipe, Drag & Arrow Controls
 */
function initSingleCarousel(carousel, opts = {}) {
    if (carousel._bb_initialized) return;
    carousel._bb_initialized = true;

    const track = carousel.querySelector('.carousel-track');
    if (!track) return;

    const items = Array.from(track.querySelectorAll('.carousel-item, .carousel-card'));
    if (items.length === 0) return;

    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    let indicatorsContainer = carousel.querySelector('.carousel-indicators');

    let currentSlideIndex = 0;

    if (indicatorsContainer && indicatorsContainer.children.length === 0) {
        items.forEach((_, idx) => {
            const dot = document.createElement('button');
            dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                scrollToSlide(idx);
            });
            indicatorsContainer.appendChild(dot);
        });
    }

    function scrollToSlide(index) {
        if (index < 0) index = 0;
        if (index >= items.length) index = items.length - 1;
        currentSlideIndex = index;
        const targetItem = items[index];
        if (targetItem) {
            track.scrollTo({
                left: targetItem.offsetLeft - track.offsetLeft,
                behavior: 'smooth'
            });
            updateIndicators(index);
        }
    }

    function updateIndicators(activeIndex) {
        if (!indicatorsContainer) return;
        const dots = Array.from(indicatorsContainer.children);
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === activeIndex);
        });
    }

    let scrollTimeout;
    track.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const trackLeft = track.scrollLeft;
            let closestIndex = 0;
            let minDistance = Infinity;

            items.forEach((item, idx) => {
                const distance = Math.abs(item.offsetLeft - track.offsetLeft - trackLeft);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = idx;
                }
            });

            currentSlideIndex = closestIndex;
            updateIndicators(closestIndex);
        }, 40);
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToSlide(currentSlideIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToSlide(currentSlideIndex + 1);
        });
    }

    // Mobile Touch Swipe & Desktop Mouse Drag
    let startX = 0;
    let isDragging = false;

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;

        if (Math.abs(diffX) > 35) {
            if (diffX > 0) {
                scrollToSlide(currentSlideIndex + 1);
            } else {
                scrollToSlide(currentSlideIndex - 1);
            }
        }
    });

    track.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        track.style.cursor = 'grabbing';
    });

    track.addEventListener('mouseleave', () => {
        isDragging = false;
        track.style.cursor = 'grab';
    });

    track.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        track.style.cursor = 'grab';
        const endX = e.clientX;
        const diffX = startX - endX;

        if (Math.abs(diffX) > 35) {
            if (diffX > 0) {
                scrollToSlide(currentSlideIndex + 1);
            } else {
                scrollToSlide(currentSlideIndex - 1);
            }
        }
    });

    const isAutoplay = (opts && opts.autoplay) || carousel.getAttribute('data-autoplay') === 'true';
    const intervalTime = parseInt((opts && opts.interval) || carousel.getAttribute('data-interval') || 3500, 10);

    if (isAutoplay) {
        let autoInterval = setInterval(() => {
            const nextIdx = (currentSlideIndex + 1) % items.length;
            scrollToSlide(nextIdx);
        }, intervalTime);

        carousel.addEventListener('mouseenter', () => clearInterval(autoInterval));
        carousel.addEventListener('mouseleave', () => {
            autoInterval = setInterval(() => {
                const nextIdx = (currentSlideIndex + 1) % items.length;
                scrollToSlide(nextIdx);
            }, intervalTime);
        });
    }
}

// Auto Setup Helper Elements on DOMReady
(function () {
    function init() {
        cleanupOrphanedBackdrops();
        initMobileDrawer();
        document.querySelectorAll('.carousel').forEach(c => initSingleCarousel(c));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
    } else {
        setTimeout(init, 100);
    }
})();