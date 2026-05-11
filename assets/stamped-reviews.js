(function() {
  // Your Stamped.io API Public Key
  const apiKey = 'YOUR_API_KEY_HERE';
  const storeUrl = Shopify?.shop || window.location.hostname; // Fallback to hostname

  // Function to fetch reviews from Stamped.io
  async function fetchReviews() {
    const url = `https://stamped.io/api/widget/reviews?storeUrl=${storeUrl}&apiKey=${apiKey}&limit=5`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data?.data?.length > 0) {
        displayReviews(data.data);
      } else {
        console.log('No reviews found.');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }

  // Function to display reviews on the page
  function displayReviews(reviews) {
    const container = document.getElementById('stamped-reviews-container');
    if (!container) return;

    let html = '<div class="stamped-reviews">';

    reviews.forEach(review => {
      html += `
        <div class="stamped-review">
          <h3>${sanitize(review.author)}</h3>
          <div class="stamped-rating">${generateStars(review.rating)}</div>
          <p>${sanitize(review.reviewMessage)}</p>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // Function to generate star ratings
  function generateStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  // Function to sanitize HTML input to prevent XSS attacks
  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Fetch reviews when the DOM is ready
  document.addEventListener('DOMContentLoaded', fetchReviews);
})();