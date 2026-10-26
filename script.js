// Fades the service cards in once when the page loads, unless the visitor prefers reduced motion.
document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cards = document.querySelectorAll('.card');
  cards.forEach(function (card, index) {
    card.style.opacity = '0';
    card.style.transition = 'opacity 0.8s ease';
    setTimeout(function () {
      card.style.opacity = '1';
    }, 250 * (index + 1));
  });
});
