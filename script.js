const toast = document.querySelector('.toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const text = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      showToast('복사되었습니다');
    } catch {
      showToast(text);
    }
  });
});

const guestbookForm = document.querySelector('#guestbookForm');
const guestbookList = document.querySelector('#guestbookList');
const guestNameInput = document.querySelector('#guestName');
const guestMessageInput = document.querySelector('#guestMessage');
const guestSubmitButton = document.querySelector('#guestSubmitButton');
const guestCancelEdit = document.querySelector('#guestCancelEdit');
const guestbookKey = 'sangje-jinsil-guestbook';
const guestbookOwnerKey = 'sangje-jinsil-guestbook-owner';
let editingGuestbookId = null;
let longPressTimer;
let activeActionsCard = null;

const guestbookOwnerId = (() => {
  const existingId = localStorage.getItem(guestbookOwnerKey);
  if (existingId) return existingId;
  const newId = `owner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(guestbookOwnerKey, newId);
  return newId;
})();

const escapeGuestbookText = (value) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

const createGuestbookId = () => `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const getGuestbookEntries = () => JSON.parse(localStorage.getItem(guestbookKey) || '[]');
const setGuestbookEntries = (entries) => localStorage.setItem(guestbookKey, JSON.stringify(entries));

function normalizeGuestbookEntries() {
  const entries = getGuestbookEntries();
  let changed = false;
  const normalized = entries.map((entry) => {
    const nextEntry = { ...entry };
    if (!nextEntry.id) {
      nextEntry.id = createGuestbookId();
      changed = true;
    }
    if (!nextEntry.ownerId) {
      nextEntry.ownerId = guestbookOwnerId;
      changed = true;
    }
    return nextEntry;
  });
  if (changed) setGuestbookEntries(normalized);
  return normalized;
}

function hideGuestbookActions() {
  activeActionsCard?.classList.remove('show-actions');
  activeActionsCard = null;
}

function resetGuestbookEdit() {
  editingGuestbookId = null;
  guestbookForm?.reset();
  if (guestSubmitButton) guestSubmitButton.textContent = '축하글 남기기';
  if (guestCancelEdit) guestCancelEdit.hidden = true;
}

function editGuestbookEntry(id) {
  const entry = getGuestbookEntries().find((item) => item.id === id && item.ownerId === guestbookOwnerId);
  if (!entry || !guestNameInput || !guestMessageInput) return;
  editingGuestbookId = id;
  guestNameInput.value = entry.name;
  guestMessageInput.value = entry.message;
  if (guestSubmitButton) guestSubmitButton.textContent = '수정 완료';
  if (guestCancelEdit) guestCancelEdit.hidden = false;
  guestNameInput.focus();
  hideGuestbookActions();
}

function deleteGuestbookEntry(id) {
  const entry = getGuestbookEntries().find((item) => item.id === id && item.ownerId === guestbookOwnerId);
  if (!entry) return;
  if (!window.confirm('이 축하글을 삭제할까요?')) return;
  setGuestbookEntries(getGuestbookEntries().filter((item) => item.id !== id));
  if (editingGuestbookId === id) resetGuestbookEdit();
  renderGuestbook();
  showToast('삭제되었습니다');
}

const renderGuestbook = () => {
  if (!guestbookList) return;
  const entries = normalizeGuestbookEntries();
  if (!entries.length) {
    guestbookList.innerHTML = '<p class="guestbook-empty">아직 남겨진 축하글이 없습니다.</p>';
    return;
  }
  guestbookList.innerHTML = entries.map((entry, index) => {
    const isMine = entry.ownerId === guestbookOwnerId;
    return `
      <article class="guestbook-card ${index % 2 ? 'is-right' : 'is-left'} ${isMine ? 'is-mine' : ''}" data-id="${entry.id}">
        <div class="guestbook-bubble">
          <strong>${escapeGuestbookText(entry.name)}</strong>
          <p>${escapeGuestbookText(entry.message)}</p>
        </div>
        ${isMine ? `
          <div class="guestbook-actions" aria-hidden="true">
            <button type="button" data-action="edit">수정하기</button>
            <button type="button" data-action="delete">삭제하기</button>
          </div>
        ` : ''}
      </article>
    `;
  }).join('');
};

guestbookForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = guestNameInput.value.trim();
  const message = guestMessageInput.value.trim();
  if (!name || !message) return;
  const entries = getGuestbookEntries();

  if (editingGuestbookId) {
    setGuestbookEntries(entries.map((entry) => (
      entry.id === editingGuestbookId && entry.ownerId === guestbookOwnerId
        ? { ...entry, name, message }
        : entry
    )));
    resetGuestbookEdit();
    showToast('수정되었습니다');
  } else {
    setGuestbookEntries([
      { id: createGuestbookId(), ownerId: guestbookOwnerId, name, message },
      ...entries
    ].slice(0, 20));
    guestbookForm.reset();
    showToast('축하글이 남겨졌습니다');
  }

  renderGuestbook();
});

guestCancelEdit?.addEventListener('click', resetGuestbookEdit);

guestbookList?.addEventListener('pointerdown', (event) => {
  const card = event.target.closest('.guestbook-card.is-mine');
  if (!card) return;
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    hideGuestbookActions();
    card.classList.add('show-actions');
    activeActionsCard = card;
  }, 520);
});

guestbookList?.addEventListener('pointerup', () => clearTimeout(longPressTimer));
guestbookList?.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
guestbookList?.addEventListener('pointercancel', () => clearTimeout(longPressTimer));

guestbookList?.addEventListener('contextmenu', (event) => {
  const card = event.target.closest('.guestbook-card.is-mine');
  if (!card) return;
  event.preventDefault();
  hideGuestbookActions();
  card.classList.add('show-actions');
  activeActionsCard = card;
});

guestbookList?.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const card = actionButton.closest('.guestbook-card');
  const id = card?.dataset.id;
  if (!id) return;
  if (actionButton.dataset.action === 'edit') editGuestbookEntry(id);
  if (actionButton.dataset.action === 'delete') deleteGuestbookEntry(id);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.guestbook-card')) hideGuestbookActions();
});

renderGuestbook();

const galleryClosing = document.querySelector('.gallery-closing');
if (galleryClosing) {
  if ('IntersectionObserver' in window) {
    const galleryClosingObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.32 });
    galleryClosingObserver.observe(galleryClosing);
  } else {
    galleryClosing.classList.add('is-visible');
  }
}


const bgm = document.querySelector('#bgm');
const musicToggle = document.querySelector('.music-toggle');
let bgmWasStarted = false;

const syncMusicButton = () => {
  if (!bgm || !musicToggle) return;
  const isPlaying = !bgm.paused;
  musicToggle.classList.toggle('is-playing', isPlaying);
  musicToggle.setAttribute('aria-pressed', String(isPlaying));
  musicToggle.setAttribute('aria-label', isPlaying ? '배경음악 일시정지' : '배경음악 재생');
};

const playBgm = async (showNotice = false) => {
  if (!bgm) return;
  try {
    await bgm.play();
    bgmWasStarted = true;
    syncMusicButton();
  } catch (error) {
    syncMusicButton();
    if (showNotice) showToast('음악 버튼을 눌러 재생해주세요');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.setTimeout(() => playBgm(false), 350);
});

['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
  document.addEventListener(eventName, (event) => {
    if (event.target.closest('.music-toggle')) return;
    if (!bgm || bgmWasStarted || !bgm.paused) return;
    playBgm(false);
  }, { once: true, passive: true });
});

musicToggle?.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!bgm) return;
  if (bgm.paused) {
    playBgm(true);
  } else {
    bgm.pause();
    syncMusicButton();
  }
});

bgm?.addEventListener('play', syncMusicButton);
bgm?.addEventListener('pause', syncMusicButton);

const galleryMainImage = document.querySelector('#galleryMainImage');
const galleryThumbRail = document.querySelector('.gallery-thumb-rail');
const galleryThumbBelt = document.querySelector('.gallery-thumb-belt');
const galleryThumbs = document.querySelectorAll('.gallery-thumb');
let galleryAutoScrollId = null;
let galleryIsInteracting = false;
let galleryInteractionTimer = null;

const setActiveGalleryImage = (button) => {
  if (!galleryMainImage || !button) return;
  const nextSrc = button.dataset.gallerySrc;
  if (!nextSrc || galleryMainImage.getAttribute('src') === nextSrc) return;

  galleryMainImage.classList.add('is-changing');
  window.setTimeout(() => {
    galleryMainImage.src = nextSrc;
    galleryMainImage.alt = button.dataset.galleryAlt || '윤상제 이진실 웨딩 사진';
    galleryMainImage.classList.toggle('is-contain', nextSrc.includes('/6.jpg'));
    galleryMainImage.classList.remove('is-changing');
  }, 160);

  galleryThumbs.forEach((thumb) => {
    thumb.classList.toggle('is-active', thumb.dataset.gallerySrc === nextSrc);
  });
};

const pauseGalleryAutoScroll = () => {
  galleryIsInteracting = true;
  window.clearTimeout(galleryInteractionTimer);
  galleryInteractionTimer = window.setTimeout(() => {
    galleryIsInteracting = false;
  }, 1800);
};

const startGalleryAutoScroll = () => {
  if (!galleryThumbRail || !galleryThumbBelt) return;
  const step = () => {
    const loopPoint = galleryThumbBelt.scrollWidth / 2;
    if (!galleryIsInteracting && loopPoint > 0) {
      galleryThumbRail.scrollLeft += 0.45;
      if (galleryThumbRail.scrollLeft >= loopPoint) {
        galleryThumbRail.scrollLeft -= loopPoint;
      }
    }
    galleryAutoScrollId = window.requestAnimationFrame(step);
  };
  galleryAutoScrollId = window.requestAnimationFrame(step);
};

galleryThumbs.forEach((button) => {
  button.addEventListener('click', () => {
    pauseGalleryAutoScroll();
    setActiveGalleryImage(button);
  });
});

['pointerdown', 'touchstart', 'wheel'].forEach((eventName) => {
  galleryThumbRail?.addEventListener(eventName, pauseGalleryAutoScroll, { passive: true });
});

galleryThumbRail?.addEventListener('scroll', () => {
  if (!galleryThumbBelt) return;
  const loopPoint = galleryThumbBelt.scrollWidth / 2;
  if (loopPoint > 0 && galleryThumbRail.scrollLeft >= loopPoint) {
    galleryThumbRail.scrollLeft -= loopPoint;
  }
}, { passive: true });

startGalleryAutoScroll();

window.addEventListener('beforeunload', () => {
  if (galleryAutoScrollId) window.cancelAnimationFrame(galleryAutoScrollId);
});

const gallerySwipeHint = document.querySelector('.gallery-swipe-hint');
let gallerySwipeHintTimer = null;
let gallerySwipeHintWasShown = false;

const hideGallerySwipeHint = () => {
  window.clearTimeout(gallerySwipeHintTimer);
  gallerySwipeHint?.classList.add('is-hidden');
  gallerySwipeHint?.classList.remove('is-visible');
};

const showGallerySwipeHint = () => {
  if (!gallerySwipeHint || gallerySwipeHintWasShown) return;
  gallerySwipeHintWasShown = true;
  gallerySwipeHintTimer = window.setTimeout(() => {
    gallerySwipeHint.classList.add('is-visible');
    window.setTimeout(hideGallerySwipeHint, 3300);
  }, 0);
};

if (galleryThumbRail && gallerySwipeHint) {
  if ('IntersectionObserver' in window) {
    const swipeHintObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        showGallerySwipeHint();
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    swipeHintObserver.observe(galleryThumbRail);
  } else {
    showGallerySwipeHint();
  }
}

['pointerdown', 'touchstart', 'wheel', 'scroll'].forEach((eventName) => {
  galleryThumbRail?.addEventListener(eventName, hideGallerySwipeHint, { once: true, passive: true });
});
