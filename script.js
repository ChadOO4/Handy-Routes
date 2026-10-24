// Fades the service cards in when the page loads.
document.addEventListener('DOMContentLoaded', function () {
  var cards = document.querySelectorAll('.card');
  cards.forEach(function (card, index) {
    card.style.opacity = '0';
    card.style.transition = 'opacity 0.6s ease';
    setTimeout(function () {
      card.style.opacity = '1';
    }, 200 * (index + 1));
  });
});
