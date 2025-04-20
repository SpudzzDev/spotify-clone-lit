import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/range/range.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path.js";

// Set the base path to the Shoelace assets
setBasePath("https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/dist/");

document.addEventListener('DOMContentLoaded', () => {
  // Playlist data
  const songs = [
    { title: "Shape of You", artist: "Ed Sheeran", duration: "3:54", color: "#ed4264" },
    { title: "Blinding Lights", artist: "The Weeknd", duration: "3:20", color: "#ff4500" },
    { title: "Bad Guy", artist: "Billie Eilish", duration: "3:14", color: "#90ee90" },
    { title: "Watermelon Sugar", artist: "Harry Styles", duration: "2:54", color: "#1e90ff" },
    { title: "Dance Monkey", artist: "Tones and I", duration: "3:29", color: "#8a3ab9" },
    { title: "Levitating", artist: "Dua Lipa", duration: "3:23", color: "#e94560" }
  ];
  
  let currentSongIndex = 0;
  let isPlaying = true;
  let isShuffle = false;
  let repeatMode = 'off'; // 'off', 'all', 'one'
  let audioInterval;
  let volume = 65;
  let isDraggingProgress = false;
  
  // Elements
  const playPauseButton = document.querySelector('.play-pause-button');
  const playIcon = document.querySelector('.play-pause-button .play-icon');
  const pauseIcon = document.querySelector('.play-pause-button .pause-icon');
  const progressContainer = document.querySelector('.progress-container');
  const progressBar = document.querySelector('.progress-bar');
  const progressThumb = document.querySelector('.progress-thumb');
  const timeElapsed = document.querySelector('.time-elapsed');
  const timeRemaining = document.querySelector('.time-remaining');
  const shuffleButton = document.querySelector('.shuffle-button');
  const repeatButton = document.querySelector('.repeat-button');
  const previousButton = document.querySelector('.previous-button');
  const nextButton = document.querySelector('.next-button');
  const likeButton = document.querySelector('.like-button');
  const volumeButton = document.querySelector('.volume-button');
  const volumeSliderContainer = document.querySelector('.volume-slider-container');
  const volumeSliderBar = document.querySelector('.volume-slider-bar');
  const volumeSliderThumb = document.querySelector('.volume-slider-thumb');
  const queueButton = document.querySelector('.queue-button');
  const queueDrawer = document.querySelector('.queue-drawer');
  const closeQueueButton = document.querySelector('.close-queue');
  const connectButton = document.querySelector('.connect-button');
  const deviceDialog = document.querySelector('.device-dialog');
  const deviceItems = document.querySelectorAll('.device-item');
  const albumCoverArt = document.querySelector('.album-cover-art');
  
  // Fix Discover Weekly icon
  const discoverWeeklyIcon = document.querySelector('.recommendation-card:nth-child(3) svg');
  if (discoverWeeklyIcon) {
    discoverWeeklyIcon.innerHTML = `
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-1.5-2.5l5.5-4-5.5-4v8z" fill="white"/>
    `;
  }
  
  // Play/pause control
  if (playPauseButton) {
    playPauseButton.addEventListener('click', () => {
      if (isPlaying) {
        pausePlayback();
        playIcon.classList.add('visible');
        pauseIcon.classList.remove('visible');
      } else {
        startPlayback();
        playIcon.classList.remove('visible');
        pauseIcon.classList.add('visible');
      }
    });
  }
  
  // Progress bar interaction
  if (progressContainer) {
    progressContainer.addEventListener('click', (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      
      progressBar.style.width = `${percentage}%`;
      progressThumb.style.left = `calc(${percentage}% - 6px)`;
      
      updateTimeDisplay(percentage);
      
      // If we were playing before, restart playback from new position
      if (isPlaying) {
        startPlayback();
      }
    });
    
    progressContainer.addEventListener('mouseenter', () => {
      if (isPlaying) {
        progressThumb.style.opacity = '1';
      }
    });
    
    progressContainer.addEventListener('mouseleave', () => {
      if (!isDraggingProgress) {
        progressThumb.style.opacity = '0';
      }
    });
  }
  
  // Like button toggle
  if (likeButton) {
    likeButton.addEventListener('click', () => {
      likeButton.classList.toggle('active');
    });
  }
  
  // Volume slider interaction
  if (volumeSliderContainer) {
    volumeSliderContainer.addEventListener('click', (e) => {
      const rect = volumeSliderContainer.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      
      volumeSliderBar.style.width = `${percentage}%`;
      volumeSliderThumb.style.left = `calc(${percentage}% - 6px)`;
      
      volume = percentage;
      updateVolumeIcon();
    });
    
    volumeSliderContainer.addEventListener('mouseenter', () => {
      volumeSliderThumb.style.opacity = '1';
    });
    
    volumeSliderContainer.addEventListener('mouseleave', () => {
      volumeSliderThumb.style.opacity = '0';
    });
  }
  
  // Volume button mute toggle
  if (volumeButton) {
    volumeButton.addEventListener('click', () => {
      if (volumeSliderBar.style.width !== '0%') {
        // Store current volume and mute
        volume = parseFloat(volumeSliderBar.style.width) || 0;
        volumeSliderBar.style.width = '0%';
        volumeSliderThumb.style.left = 'calc(0% - 6px)';
      } else {
        // Restore previous volume
        volumeSliderBar.style.width = `${volume}%`;
        volumeSliderThumb.style.left = `calc(${volume}% - 6px)`;
      }
      
      updateVolumeIcon();
    });
  }
  
  // Shuffle button toggle
  if (shuffleButton) {
    shuffleButton.addEventListener('click', () => {
      isShuffle = !isShuffle;
      shuffleButton.classList.toggle('active', isShuffle);
    });
  }
  
  // Repeat button toggle
  if (repeatButton) {
    repeatButton.addEventListener('click', () => {
      if (repeatMode === 'off') {
        repeatMode = 'all';
        repeatButton.classList.add('active');
      } else if (repeatMode === 'all') {
        repeatMode = 'one';
        repeatButton.innerHTML = `
          <svg viewBox="0 0 16 16" width="16" height="16">
            <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"/>
            <path d="M7.5 10.75a.75.75 0 0 1 .75-.75h1.5v-1.5h-1.5a.75.75 0 0 1-.75-.75v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-2.25v2.25H10a.75.75 0 0 1 0 1.5H8.25v1.5h2.25a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75v-1.5z"/>
          </svg>
        `;
        repeatButton.classList.add('active');
      } else {
        repeatMode = 'off';
        repeatButton.innerHTML = `
          <svg viewBox="0 0 16 16" width="16" height="16">
            <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"/>
          </svg>
        `;
        repeatButton.classList.remove('active');
      }
    });
  }
  
  // Previous track button
  if (previousButton) {
    previousButton.addEventListener('click', () => {
      currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
      loadSong(currentSongIndex);
      
      // Visual feedback
      previousButton.style.transform = 'scale(1.2)';
      setTimeout(() => {
        previousButton.style.transform = 'scale(1)';
      }, 150);
    });
  }
  
  // Next track button
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      currentSongIndex = (currentSongIndex + 1) % songs.length;
      loadSong(currentSongIndex);
      
      // Visual feedback
      nextButton.style.transform = 'scale(1.2)';
      setTimeout(() => {
        nextButton.style.transform = 'scale(1)';
      }, 150);
    });
  }
  
  // Queue drawer
  if (queueButton && queueDrawer && closeQueueButton) {
    queueButton.addEventListener('click', () => {
      queueDrawer.classList.add('open');
      
      // Update queue list with current playlist
      updateQueueList();
    });
    
    closeQueueButton.addEventListener('click', () => {
      queueDrawer.classList.remove('open');
    });
  }
  
  // Connect to device dialog
  if (connectButton && deviceDialog) {
    connectButton.addEventListener('click', () => {
      deviceDialog.show();
    });
  }
  
  // Mobile Sidebar Toggle
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const mobileSidebar = document.querySelector('.mobile-sidebar');
  const sidebarOverlay = document.querySelector('.mobile-sidebar-overlay');

  if (sidebarToggle && mobileSidebar && sidebarOverlay) {
    sidebarToggle.addEventListener('click', () => {
      mobileSidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('open');
    });

    sidebarOverlay.addEventListener('click', () => {
      mobileSidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  }
  
  // Helper functions
  function startPlayback() {
    isPlaying = true;
    
    if (audioInterval) {
      clearInterval(audioInterval);
    }
    
    let currentValue = parseFloat(progressBar.style.width) || 0;
    audioInterval = setInterval(() => {
      if (isDraggingProgress) return;
      
      if (currentValue < 100) {
        currentValue += 0.1;
        progressBar.style.width = `${currentValue}%`;
        progressThumb.style.left = `calc(${currentValue}% - 6px)`;
        updateTimeDisplay(currentValue);
      } else {
        // Song finished
        if (repeatMode === 'one') {
          // Repeat the same song
          currentValue = 0;
          progressBar.style.width = '0%';
          progressThumb.style.left = 'calc(0% - 6px)';
          updateTimeDisplay(0);
        } else if (repeatMode === 'all' || isShuffle) {
          // Play next song
          if (isShuffle) {
            currentSongIndex = Math.floor(Math.random() * songs.length);
          } else {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
          }
          loadSong(currentSongIndex);
        } else {
          // Stop playback if end of playlist
          pausePlayback();
          // Reset to beginning of track
          currentValue = 0;
          progressBar.style.width = '0%';
          progressThumb.style.left = 'calc(0% - 6px)';
          updateTimeDisplay(0);
        }
      }
    }, 100);
  }
  
  function pausePlayback() {
    isPlaying = false;
    if (audioInterval) {
      clearInterval(audioInterval);
    }
  }
  
  function updateTimeDisplay(percentage) {
    if (!timeElapsed || !timeRemaining) return;
    
    // Get current song duration
    const currentSong = songs[currentSongIndex];
    const durationParts = currentSong.duration.split(':');
    const totalDuration = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
    
    const currentSeconds = Math.floor(totalDuration * (percentage / 100));
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const remainingSeconds = totalDuration - currentSeconds;
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingSecs = remainingSeconds % 60;
    const formattedRemaining = `-${remainingMinutes}:${remainingSecs.toString().padStart(2, '0')}`;
    
    timeElapsed.textContent = formattedTime;
    timeRemaining.textContent = formattedRemaining;
  }
  
  function updateVolumeIcon() {
    if (!volumeButton) return;
    
    const volumeValue = parseFloat(volumeSliderBar.style.width) || 0;
    
    if (volumeValue === 0) {
      volumeButton.innerHTML = `
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 0 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06z"/>
          <path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.642 3.642 0 0 0-1.33 4.967 3.639 3.639 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.73 4.73 0 0 1-1.5-.694v1.3L2.817 9.852a2.141 2.141 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694V1.5z"/>
        </svg>
      `;
    } else if (volumeValue < 33) {
      volumeButton.innerHTML = `
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35z"/>
        </svg>
      `;
    } else if (volumeValue < 66) {
      volumeButton.innerHTML = `
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88z"/>
        </svg>
      `;
    } else {
      volumeButton.innerHTML = `
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88z"/>
          <path d="M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127v1.55z"/>
        </svg>
      `;
    }
  }
  
  function loadSong(index) {
    const song = songs[index];
    
    // Update player info
    const trackNameElement = document.querySelector('.track-name');
    const artistNameElement = document.querySelector('.artist-name');
    
    if (trackNameElement) trackNameElement.textContent = song.title;
    if (artistNameElement) artistNameElement.textContent = song.artist;
    
    // Update album art background
    if (albumCoverArt) {
      albumCoverArt.style.background = `linear-gradient(45deg, ${song.color}, #ffedbc)`;
    }
    
    // Reset progress
    if (progressBar) progressBar.style.width = '0%';
    if (progressThumb) progressThumb.style.left = 'calc(0% - 6px)';
    updateTimeDisplay(0);
    
    // Ensure play button shows correct state
    if (playPauseButton) {
      if (isPlaying) {
        playIcon.classList.remove('visible');
        pauseIcon.classList.add('visible');
      } else {
        playIcon.classList.add('visible');
        pauseIcon.classList.remove('visible');
      }
    }
    
    // If was playing, start playback of new song
    if (isPlaying) {
      startPlayback();
    }
  }
  
  function updateQueueList() {
    const nowPlayingTrack = document.querySelector('.queue-track.active');
    if (nowPlayingTrack) {
      const title = nowPlayingTrack.querySelector('.track-title');
      const artist = nowPlayingTrack.querySelector('.track-artist');
      const duration = nowPlayingTrack.querySelector('.track-duration');
      const trackImage = nowPlayingTrack.querySelector('.track-image-placeholder');
      
      const currentSong = songs[currentSongIndex];
      
      if (title) title.textContent = currentSong.title;
      if (artist) artist.textContent = currentSong.artist;
      if (duration) duration.textContent = currentSong.duration;
      if (trackImage) trackImage.style.backgroundColor = currentSong.color;
    }
    
    // Update next up tracks
    const queueTracks = document.querySelectorAll('.next-up-section .queue-track');
    queueTracks.forEach((track, i) => {
      const nextSongIndex = (currentSongIndex + i + 1) % songs.length;
      const nextSong = songs[nextSongIndex];
      
      const title = track.querySelector('.track-title');
      const artist = track.querySelector('.track-artist');
      const duration = track.querySelector('.track-duration');
      const trackImage = track.querySelector('.track-image-placeholder');
      
      if (title) title.textContent = nextSong.title;
      if (artist) artist.textContent = nextSong.artist;
      if (duration) duration.textContent = nextSong.duration;
      if (trackImage) trackImage.style.backgroundColor = nextSong.color;
    });
  }
  
  // Initialize playback
  loadSong(currentSongIndex);
  if (isPlaying) {
    startPlayback();
  }
  
  // Card play buttons
  const playButtons = document.querySelectorAll('.play-button');
  playButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const icon = button.querySelector('sl-icon');
      
      // Reset all other play buttons to "play" icon
      playButtons.forEach(otherButton => {
        if (otherButton !== button) {
          const otherIcon = otherButton.querySelector('sl-icon');
          if (otherIcon) otherIcon.name = 'play-fill';
        }
      });
      
      if (icon.name === 'play-fill') {
        icon.name = 'pause-fill';
        playIcon.classList.remove('visible');
        pauseIcon.classList.add('visible');
        startPlayback();
      } else {
        icon.name = 'play-fill';
        playIcon.classList.add('visible');
        pauseIcon.classList.remove('visible');
        pausePlayback();
      }
    });
  });
  
  // Nav item clicks
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(navItem => navItem.classList.remove('active'));
      item.classList.add('active');
    });
  });
  
  // Playlist items
  const playlistItems = document.querySelectorAll('.playlist-item');
  playlistItems.forEach(item => {
    item.addEventListener('click', () => {
      const randomSongIndex = Math.floor(Math.random() * songs.length);
      loadSong(randomSongIndex);
      playIcon.classList.remove('visible');
      pauseIcon.classList.add('visible');
      startPlayback();
    });
  });
  
  // Featured items and recommendation cards
  document.querySelectorAll('.featured-item, .recommendation-card').forEach(item => {
    item.addEventListener('click', () => {
      // Simulate loading a new playlist/song
      const randomSongIndex = Math.floor(Math.random() * songs.length);
      loadSong(randomSongIndex);
      playIcon.classList.remove('visible');
      pauseIcon.classList.add('visible');
      startPlayback();
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault(); // Prevent page scroll
      if (isPlaying) {
        pausePlayback();
        playIcon.classList.add('visible');
        pauseIcon.classList.remove('visible');
      } else {
        startPlayback();
        playIcon.classList.remove('visible');
        pauseIcon.classList.add('visible');
      }
    } else if (e.code === 'ArrowRight' && e.target === document.body) {
      if (nextButton) nextButton.click();
    } else if (e.code === 'ArrowLeft' && e.target === document.body) {
      if (previousButton) previousButton.click();
    }
  });
  
  // Check for mobile view and adjust UI
  function checkMobileView() {
    if (window.innerWidth <= 768) {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
  }
  
  // Initial check and event listener for resizing
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
  
  // Close queue drawer when clicking outside
  document.addEventListener('click', (e) => {
    if (queueDrawer && queueDrawer.classList.contains('open') && 
        !queueDrawer.contains(e.target) && 
        queueButton && !queueButton.contains(e.target)) {
      queueDrawer.classList.remove('open');
    }
  });
});