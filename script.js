/* ============================================================
   CONFIG — edit these three values, everything else is wired.
   ============================================================ */
const CONFIG = {
  // Direct MP4 URL (Cloudinary / Bunny / S3 / Vercel Blob, etc.)
  videoUrl: "https://res.cloudinary.com/ufey9hth/video/upload/v1786702270/Wedding_invitation_extended_1_cp0jyg.mp4",

  // First frame of the video, extracted by Cloudinary on the fly (so_0 = second 0).
  posterUrl: "https://res.cloudinary.com/ufey9hth/video/upload/so_0/v1786702270/Wedding_invitation_extended_1_cp0jyg.jpg",

  // Background music — plays instead of the video's own (muted) audio, and keeps
  // playing through the map screen. Requested as .mp3 so Cloudinary transcodes
  // the source to audio-only instead of shipping its full video stream (~11MB → ~4MB).
  audioUrl: "https://res.cloudinary.com/ufey9hth/video/upload/v1786624115/Eternal_Vow_aevvsa.mp3",

  // Full postal address of the venue (used for the "Open in Google Maps" button)
  venueAddress: "Villa la maison blanche, QPH9+C9V, Sfax",

  // Optional: paste a Google Maps "embed" src here to override the default search embed.
  // Get it from Google Maps → Share → Embed a map → copy the src="..." URL.
  mapEmbedSrc: ""
};
/* ============================================================ */

/* ---------- mobile-only gate ---------- */
(function mobileGate() {
  const isMobile =
    matchMedia("(pointer: coarse)").matches &&
    matchMedia("(max-width: 900px)").matches;

  if (isMobile) return;

  const gate = document.getElementById("desktopGate");
  const qr   = document.getElementById("desktopGateQr");
  qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=" +
           encodeURIComponent(location.href);
  gate.hidden = false;

  // Freeze the invitation underneath so no state / audio kicks off.
  document.body.style.overflow = "hidden";
  throw new Error("desktop-gate"); // stop the rest of the script from wiring up
})();

const stage      = document.getElementById("stage");
const video      = document.getElementById("video");
const audio      = document.getElementById("bgm");
const slide      = document.querySelector(".slide");
const thumb      = document.querySelector(".slide__thumb");
const track      = document.querySelector(".slide__track");
const mapBtn     = document.getElementById("mapButton");
const mapEmbed   = document.getElementById("mapEmbed");

/* ---------- wire the map ---------- */
const encoded = encodeURIComponent(CONFIG.venueAddress);
mapBtn.href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
mapEmbed.src = CONFIG.mapEmbedSrc
  || `https://www.google.com/maps?q=${encoded}&output=embed`;

/* ---------- wire the poster + video + audio sources ---------- */
document.querySelector(".poster-img").src = CONFIG.posterUrl;
video.poster = CONFIG.posterUrl;
video.src = CONFIG.videoUrl;
video.muted = true;
audio.src = CONFIG.audioUrl;

/* ---------- slide-to-open ---------- */
let dragging = false;
let startX   = 0;
let currentX = 0;
let maxX     = 0;
let opened   = false;

function computeMax() {
  maxX = track.clientWidth - thumb.clientWidth - 8; // 4px padding each side
}
computeMax();
window.addEventListener("resize", computeMax);

function setThumb(x) {
  currentX = Math.max(0, Math.min(maxX, x));
  thumb.style.transform = `translateX(${currentX}px)`;
}

function onDown(e) {
  if (opened) return;
  dragging = true;
  slide.classList.add("is-dragging");
  slide.classList.remove("is-releasing");
  const p = pointFrom(e);
  startX = p.x - currentX;
  slide.setPointerCapture?.(e.pointerId);
}
function onMove(e) {
  if (!dragging) return;
  const p = pointFrom(e);
  setThumb(p.x - startX);
}
function onUp() {
  if (!dragging) return;
  dragging = false;
  slide.classList.remove("is-dragging");
  slide.classList.add("is-releasing");
  if (currentX >= maxX * 0.92) {
    commitOpen();
  } else {
    setThumb(0);
  }
}
function pointFrom(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX };
  return { x: e.clientX };
}

slide.addEventListener("pointerdown", onDown);
window.addEventListener("pointermove", onMove);
window.addEventListener("pointerup", onUp);
window.addEventListener("pointercancel", onUp);

// keyboard fallback (Enter / Space)
slide.addEventListener("keydown", (e) => {
  if (opened) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    commitOpen();
  }
});

/* ---------- open sequence ---------- */
function commitOpen() {
  if (opened) return;
  opened = true;
  setThumb(maxX);

  // Switch layer + kick play() synchronously — required by iOS
  stage.dataset.state = "video";
  video.play().catch(() => {});
  audio.play().catch(() => {});
}

/* ---------- end of video → map ---------- */
function goToMap() {
  if (stage.dataset.state === "map") return;
  stage.dataset.state = "map";
  try { video.pause(); } catch (_) {}
  // Music keeps playing on the map screen — don't touch `audio` here.
}
video.addEventListener("ended", goToMap);
// Safety net: some mobile browsers occasionally miss `ended`.
video.addEventListener("timeupdate", () => {
  if (video.duration && video.currentTime >= video.duration - 0.15) goToMap();
});
