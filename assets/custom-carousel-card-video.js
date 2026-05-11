document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".custom-review-carousel-card");

  // Pause all other videos when one plays
  function pauseAllOtherVideos(currentVideo) {
    const videos = document.querySelectorAll(".custom-video-review-carousel-video");

    videos.forEach((video) => {
      if (video !== currentVideo) {
        video.pause();
        const parentCard = video.closest(".custom-review-carousel-card");
        const playBtn = parentCard ? parentCard.querySelector(".play-btn") : null;
        if (playBtn) playBtn.style.display = "block";
      }
    });
  }

  // Pause videos when they leave the viewport
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;

        if (!entry.isIntersecting) {
          video.pause();
          const parentCard = video.closest(".custom-review-carousel-card");
          const playBtn = parentCard ? parentCard.querySelector(".play-btn") : null;
          if (playBtn) playBtn.style.display = "block";
        }
      });
    },
    { threshold: 0.1 }
  );

  // Apply behavior to each video card
  cards.forEach((card) => {
    const video = card.querySelector(".custom-video-review-carousel-video");
    const playBtn = card.querySelector(".play-btn");
    const volumeBtn = card.querySelector(".volume-btn");
    const volumeIcon = volumeBtn ? volumeBtn.querySelector(".volume-icon") : null;
    const muteIcon = volumeBtn ? volumeBtn.querySelector(".mute-icon") : null;

    if (!video || !playBtn || !volumeBtn || !volumeIcon || !muteIcon) return;

    // Make sure video is focusable if you want keydown on it to work
    if (!video.hasAttribute("tabindex")) video.setAttribute("tabindex", "0");

    // Persisted user preference: default to whatever the video starts as
    card.dataset.userMuted = video.muted ? "true" : "false";

    function syncVolumeIcons() {
      if (video.muted) {
        volumeIcon.style.display = "none";
        muteIcon.style.display = "block";
      } else {
        volumeIcon.style.display = "block";
        muteIcon.style.display = "none";
      }
    }

    // Ensure icons match initial state
    syncVolumeIcons();

    function toggleVideoPlay() {
      const isPlaying = !video.paused;

      if (isPlaying) {
        video.pause();
        playBtn.style.display = "block";
        return;
      }

      pauseAllOtherVideos(video);

      // Respect user preference when starting playback
      const prefMuted = card.dataset.userMuted === "true";
      video.muted = prefMuted;

      video
        .play()
        .then(() => {
          playBtn.style.display = "none";
        })
        .catch((err) => {
          // If unmuted play is blocked, fall back to muted and persist preference
          video.muted = true;
          card.dataset.userMuted = "true";
          syncVolumeIcons();

          try {
            const p2 = video.play();
            if (p2 && typeof p2.catch === "function") {
              p2.catch(() => {});
            }
          } catch (e) {}

          console.error("Video play failed:", err);
        });
    }

    video.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleVideoPlay();
    });

    video.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        toggleVideoPlay();
      }
    });

    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleVideoPlay();
    });

    // KEYBOARD: if play starts via keydown on playBtn, move focus to the associated video
    playBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();

        toggleVideoPlay();

        // If the play button is being hidden, move focus to the video
        requestAnimationFrame(() => {
          video.focus();
        });
      }
    });

    video.addEventListener("ended", () => {
      playBtn.style.display = "block";
    });

    volumeBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      // Toggle mute and persist preference, even if paused
      video.muted = !video.muted;
      card.dataset.userMuted = video.muted ? "true" : "false";

      syncVolumeIcons();
    });

    // Optional: keyboard support for mute toggle too
    volumeBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();

        video.muted = !video.muted;
        card.dataset.userMuted = video.muted ? "true" : "false";
        syncVolumeIcons();
      }
    });

    // Start observing the video for scroll visibility
    observer.observe(video);
  });
});

