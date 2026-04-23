/* ================================================
   Portfolio — Scroll Animations & Interactions
   ================================================ */

(function () {
  'use strict';

  // --- Scroll Reveal ---
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // --- Timeline Line Animation ---
  const timelineLine = document.querySelector('.timeline__line');

  if (timelineLine) {
    const lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            timelineLine.classList.add('active');
            lineObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    lineObserver.observe(timelineLine);
  }

  // --- Timeline Dot Activation ---
  const timelineItems = document.querySelectorAll('.timeline__item');

  const dotObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          dotObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  timelineItems.forEach((item) => dotObserver.observe(item));

  // --- Mobile Nav Toggle ---
  const toggle = document.querySelector('.nav__toggle');
  const navLinks = document.querySelector('.nav__links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }

  // --- Smooth Scroll for Nav Links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = document.querySelector('.nav').offsetHeight;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // --- Active Nav Highlight ---
  const sections = document.querySelectorAll('.section[id]');
  const navAnchors = document.querySelectorAll('.nav__links a');

  const highlightObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navAnchors.forEach((a) => {
            a.style.color = a.getAttribute('href') === `#${id}` ? 'var(--gray-900)' : '';
          });
        }
      });
    },
    { threshold: 0.2, rootMargin: '-64px 0px -50% 0px' }
  );

  sections.forEach((section) => highlightObserver.observe(section));
  
  // --- Image Viewer / Lightbox ---
  const viewer = document.getElementById('imageViewer');
  const ivImage = document.getElementById('ivImage');
  const ivClose = document.getElementById('ivClose');
  const ivRotate = document.getElementById('ivRotate');
  const ivZoomIn = document.getElementById('ivZoomIn');
  const ivZoomOut = document.getElementById('ivZoomOut');
  const overlay = document.querySelector('.image-viewer__overlay');
  const content = document.querySelector('.image-viewer__content');

  let currentScale = 1;
  let currentRotate = 0;
  let isDragging = false;
  let startX, startY, translateX = 0, translateY = 0;

  const updateTransform = () => {
    if (!ivImage) return;
    ivImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale}) rotate(${currentRotate}deg)`;
  };

  const resetViewer = () => {
    currentScale = 1;
    currentRotate = 0;
    translateX = 0;
    translateY = 0;
    updateTransform();
  };

  const closeViewer = () => {
    if (!viewer) return;
    viewer.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (ivImage) ivImage.src = '';
    }, 300);
  };

  if (viewer && ivImage && ivClose && ivRotate && ivZoomIn && ivZoomOut && overlay && content) {
    document.querySelectorAll('.card__cert-img').forEach((img) => {
      img.addEventListener('click', () => {
        ivImage.src = img.src;
        resetViewer();
        viewer.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    ivClose.addEventListener('click', closeViewer);
    overlay.addEventListener('click', closeViewer);

    ivRotate.addEventListener('click', () => {
      currentRotate += 90;
      updateTransform();
    });

    ivZoomIn.addEventListener('click', () => {
      currentScale = Math.min(currentScale + 0.5, 4);
      updateTransform();
    });

    ivZoomOut.addEventListener('click', () => {
      currentScale = Math.max(currentScale - 0.5, 0.5);
      updateTransform();
    });

    viewer.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        currentScale = Math.min(currentScale + 0.1, 5);
      } else {
        currentScale = Math.max(currentScale - 0.1, 0.5);
      }
      updateTransform();
    });

    content.addEventListener('mousedown', (e) => {
      if (e.target.closest('.image-viewer__controls')) return;
      isDragging = true;
      ivImage.classList.add('no-transition');
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      ivImage.classList.remove('no-transition');
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (viewer && viewer.classList.contains('active')) {
      closeViewer();
    }
  });
})();

