document.addEventListener("DOMContentLoaded", function () {
  function loadLottieInto(container) {
    const src = container.getAttribute("data-src");
    if (!src) return;

    const player = document.createElement("lottie-player");
    player.setAttribute("src", src);
    player.setAttribute("background", "transparent");
    player.setAttribute("speed", "1");
    player.setAttribute("loop", "");
    player.setAttribute("autoplay", "");
    player.style.display = "block";

    container.appendChild(player);
    container.classList.remove("lazy-lottie-container");
  }

  const containers = document.querySelectorAll(".lazy-lottie-container");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadLottieInto(entry.target);
          obs.unobserve(entry.target);
        }
      });
    });

    containers.forEach(container => observer.observe(container));
  } else {
    // Fallback: just load everything
    containers.forEach(loadLottieInto);
  }
});