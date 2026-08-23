import { getOptimizedVideoUrl } from '../../services/cloudinary-service.js';

let currentVideoUrl = '';
let hasInteractionListener = false;

export function updateHeroVideoElement(url) {
  const heroVideo = document.querySelector('.hero-video');
  const heroFallback = document.querySelector('.hero-fallback');
  if (!heroVideo) return;

  if (url) {
    const optimizedVideoUrl = getOptimizedVideoUrl(url);
    if (currentVideoUrl === optimizedVideoUrl && heroVideo.src) {
      playHeroVideo();
      return;
    }

    currentVideoUrl = optimizedVideoUrl;

    // Explicitly configure HTML5 video for autoplay compliance (Chrome, Safari, iOS, macOS)
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline = true;
    heroVideo.loop = true;
    heroVideo.autoplay = true;

    heroVideo.setAttribute('muted', '');
    heroVideo.setAttribute('playsinline', '');
    heroVideo.setAttribute('webkit-playsinline', '');
    heroVideo.setAttribute('autoplay', '');
    heroVideo.setAttribute('loop', '');

    heroVideo.src = optimizedVideoUrl;
    heroVideo.style.display = 'block';

    const onPlaying = () => {
      if (heroFallback) {
        heroFallback.style.opacity = '0';
        heroFallback.style.visibility = 'hidden';
      }
    };

    heroVideo.removeEventListener('playing', onPlaying);
    heroVideo.removeEventListener('loadeddata', onPlaying);
    heroVideo.addEventListener('playing', onPlaying);
    heroVideo.addEventListener('loadeddata', onPlaying);

    heroVideo.load();
    playHeroVideo();

    setupUserInteractionPlayFallback();
  } else {
    currentVideoUrl = '';
    heroVideo.style.display = 'none';
    heroVideo.removeAttribute('src');
    heroVideo.load();
    if (heroFallback) {
      heroFallback.style.opacity = '1';
      heroFallback.style.visibility = 'visible';
      heroFallback.style.display = 'flex';
    }
  }
}

export function playHeroVideo() {
  const heroVideo = document.querySelector('.hero-video');
  const heroFallback = document.querySelector('.hero-fallback');
  if (!heroVideo || !heroVideo.src || heroVideo.style.display === 'none') return;

  // Ensure muted is true before any play attempt
  heroVideo.muted = true;

  const playPromise = heroVideo.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        if (heroFallback) {
          heroFallback.style.opacity = '0';
          heroFallback.style.visibility = 'hidden';
        }
      })
      .catch((err) => {
        // Do NOT hide video on autoplay policy warning, keep waiting for user interaction or visibility change
        console.info('Hero video play deferred until user interaction or tab focus:', err.message);
      });
  }
}

function setupUserInteractionPlayFallback() {
  if (hasInteractionListener) return;
  hasInteractionListener = true;

  const resume = () => {
    playHeroVideo();
  };

  window.addEventListener('click', resume, { passive: true });
  window.addEventListener('touchstart', resume, { passive: true });
  window.addEventListener('scroll', resume, { passive: true });
  
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !document.getElementById('admin-panel')?.classList.contains('open')) {
      playHeroVideo();
    }
  });
}

window.updateHeroVideoElement = updateHeroVideoElement;
window.playHeroVideo = playHeroVideo;
