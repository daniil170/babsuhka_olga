import { getOptimizedImageUrl } from '../../services/cloudinary-service.js';

export function updateBrandImages(settings) {
  if (!settings) return;

  // Update Hero Logo dynamically
  const logoEl = document.querySelector('.hero-logo-img');
  if (logoEl) {
    logoEl.src = settings.logoHeroImageUrl 
      ? getOptimizedImageUrl(settings.logoHeroImageUrl, 300) 
      : '/logo_hero.png';
  }

  // Update Brand Story image dynamically
  const storyEl = document.querySelector('.story-img');
  if (storyEl) {
    storyEl.src = settings.brandStoryImageUrl 
      ? getOptimizedImageUrl(settings.brandStoryImageUrl, 800) 
      : '/brand_story.png';
  }
}
