import { getOptimizedVideoUrl } from '../../services/cloudinary-service.js';

export function updateHeroVideoElement(url) {
  const heroVideo = document.querySelector('.hero-video');
  const heroFallback = document.querySelector('.hero-fallback');
  if (!heroVideo) return;

  if (url) {
    const optimizedVideoUrl = getOptimizedVideoUrl(url);
    const source = heroVideo.querySelector('source');
    if (source && source.getAttribute('src') === optimizedVideoUrl) {
      return;
    }
    heroVideo.innerHTML = `<source src="${optimizedVideoUrl}" type="video/mp4">`;
    heroVideo.style.display = 'block';
    if (heroFallback) heroFallback.style.display = 'flex'; // show fallback while loading
    heroVideo.load();
    heroVideo.play()
      .then(() => {
        if (heroFallback) heroFallback.style.display = 'none'; // hide fallback only if playing successfully
      })
      .catch(err => {
        console.warn('Hero video autoplay blocked or failed:', err);
        heroVideo.style.display = 'none';
        if (heroFallback) heroFallback.style.display = 'flex'; // keep showing fallback
      });
  } else {
    heroVideo.style.display = 'none';
    heroVideo.innerHTML = '';
    if (heroFallback) heroFallback.style.display = 'flex';
  }
}

window.updateHeroVideoElement = updateHeroVideoElement;
