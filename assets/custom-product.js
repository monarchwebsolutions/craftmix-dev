// Product page custom js
// Image switching in product images
document.addEventListener("DOMContentLoaded", function () {
  const mainImage = document.getElementById("main-product-image");
  const containers = document.querySelectorAll(".secondary-img-container");

  function activateFromContainer(container) {
    const largeSrc = container.getAttribute("data-large-src");
    if (!largeSrc) return;

    // Prefer the inner img alt for accessibility/accuracy
    const img = container.querySelector(".secondary-image");
    const alt = img?.alt || container.getAttribute("aria-label") || mainImage.alt || "";

    mainImage.src = largeSrc;
    mainImage.alt = alt;
  }

  containers.forEach(container => {
    // Buttons already support Enter/Space -> click
    container.addEventListener("click", function () {
      activateFromContainer(this);
    });
  });
});

// Flavor Change
document.addEventListener('DOMContentLoaded', function () {
  const flavorSlider = document.querySelector('.change-flavor-body');
  const flavorCards = document.querySelectorAll('.flavor-card');
  let isDown = false;
  let startX;
  let scrollLeft;
  let isDragging = false;


  // Slider functionality
  if (flavorSlider) {
    flavorSlider.addEventListener('mousedown', (e) => {
      isDown = true;
      flavorSlider.style.cursor = 'grabbing';
      startX = e.pageX - flavorSlider.offsetLeft;
      scrollLeft = flavorSlider.scrollLeft;
    });

    flavorSlider.addEventListener('mouseleave', () => {
      isDown = false;
      flavorSlider.style.cursor = 'grab';
    });

    flavorSlider.addEventListener('mouseup', () => {
      isDown = false;
      flavorSlider.style.cursor = 'grab';
    });

    flavorSlider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - flavorSlider.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed
      flavorSlider.scrollLeft = scrollLeft - walk;
      isDragging = true;
    });
  }

  // Flavor redirect functionality
 flavorCards.forEach(card => {
  card.addEventListener('click', function(e) {
    if (!isDragging) {
      // Remove active class from all li elements
      document.querySelectorAll('.change-flavor-list li').forEach(li => li.classList.remove('active'));
      
      // Add active class to the parent li of the clicked card
      this.closest('li').classList.add('active');

      // Redirect to the product page
      const productUrl = this.dataset.url; // Ensure each card has a 'data-url' attribute
      if (productUrl) {
        window.location.href = productUrl;
      }
    }
  });
});

  // Reset isDragging on mouse up
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

});