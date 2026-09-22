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
let editingGuestbookId = null;
let longPressTimer;
let activeActionsCard = null;
let guestbookEntries = [];
let currentGuestbookUserId = null;
let guestbookApi = null;

const firebaseConfig = {
  apiKey: "AIzaSyAM3223C0FgwRUxgyV60ive1XtU6m_bqbs",
  authDomain: "wedding-guestbook-8f222.firebaseapp.com",
  projectId: "wedding-guestbook-8f222",
  storageBucket: "wedding-guestbook-8f222.firebasestorage.app",
  messagingSenderId: "436965062966",
  appId: "1:436965062966:web:74f92c54b25eb5b4d81b97"
};

const escapeGuestbookText = (value = '') => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

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

function setGuestbookBusy(isBusy) {
  if (!guestSubmitButton) return;
  guestSubmitButton.disabled = isBusy;
  guestSubmitButton.textContent = isBusy
    ? '저장 중...'
    : editingGuestbookId ? '수정 완료' : '축하글 남기기';
}

function editGuestbookEntry(id) {
  const entry = guestbookEntries.find((item) => item.id === id && item.ownerId === currentGuestbookUserId);
  if (!entry || !guestNameInput || !guestMessageInput) return;
  editingGuestbookId = id;
  guestNameInput.value = entry.name;
  guestMessageInput.value = entry.message;
  if (guestSubmitButton) guestSubmitButton.textContent = '수정 완료';
  if (guestCancelEdit) guestCancelEdit.hidden = false;
  guestNameInput.focus();
  hideGuestbookActions();
}

async function deleteGuestbookEntry(id) {
  const entry = guestbookEntries.find((item) => item.id === id && item.ownerId === currentGuestbookUserId);
  if (!entry || !guestbookApi) return;
  if (!window.confirm('이 축하글을 삭제할까요?')) return;

  try {
    await guestbookApi.deleteDoc(guestbookApi.doc(guestbookApi.db, 'guestbook', id));
    if (editingGuestbookId === id) resetGuestbookEdit();
    showToast('삭제되었습니다');
  } catch {
    showToast('삭제에 실패했습니다');
  }
}

const renderGuestbook = () => {
  if (!guestbookList) return;

  if (!currentGuestbookUserId) {
    guestbookList.innerHTML = '<p class="guestbook-empty">방명록을 불러오는 중입니다.</p>';
    return;
  }

  if (!guestbookEntries.length) {
    guestbookList.innerHTML = '<p class="guestbook-empty">아직 남겨진 축하글이 없습니다.</p>';
    return;
  }

  guestbookList.innerHTML = guestbookEntries.map((entry, index) => {
    const isMine = entry.ownerId === currentGuestbookUserId;
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

async function setupGuestbook() {
  if (!guestbookForm || !guestbookList) return;
  renderGuestbook();

  try {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);

    const app = appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);
    guestbookApi = { db, ...firestoreModule };

    authModule.onAuthStateChanged(auth, (user) => {
      currentGuestbookUserId = user?.uid || null;
      renderGuestbook();
    });

    await authModule.signInAnonymously(auth);

    const guestbookQuery = firestoreModule.query(
      firestoreModule.collection(db, 'guestbook'),
      firestoreModule.orderBy('createdAt', 'desc')
    );

    firestoreModule.onSnapshot(guestbookQuery, (snapshot) => {
      guestbookEntries = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
      renderGuestbook();
    }, () => {
      guestbookList.innerHTML = '<p class="guestbook-empty">방명록 연결 설정을 확인해주세요.</p>';
    });
  } catch {
    guestbookList.innerHTML = '<p class="guestbook-empty">방명록을 불러오지 못했습니다.</p>';
  }
}

guestbookForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = guestNameInput.value.trim();
  const message = guestMessageInput.value.trim();
  if (!name || !message || !guestbookApi || !currentGuestbookUserId) return;

  setGuestbookBusy(true);

  try {
    if (editingGuestbookId) {
      await guestbookApi.updateDoc(guestbookApi.doc(guestbookApi.db, 'guestbook', editingGuestbookId), {
        name,
        message,
        updatedAt: guestbookApi.serverTimestamp()
      });
      resetGuestbookEdit();
      showToast('수정되었습니다');
    } else {
      await guestbookApi.addDoc(guestbookApi.collection(guestbookApi.db, 'guestbook'), {
        ownerId: currentGuestbookUserId,
        name,
        message,
        createdAt: guestbookApi.serverTimestamp()
      });
      guestbookForm.reset();
      showToast('축하글이 남겨졌습니다');
    }
  } catch {
    showToast('저장에 실패했습니다');
  } finally {
    setGuestbookBusy(false);
  }
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

setupGuestbook();

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
const galleryUniqueThumbs = [...galleryThumbs].filter((thumb) => thumb.getAttribute('aria-hidden') !== 'true');
const galleryPrevButton = document.querySelector('.gallery-arrow-prev');
const galleryNextButton = document.querySelector('.gallery-arrow-next');
let galleryAutoScrollId = null;
let galleryIsInteracting = false;
let galleryInteractionTimer = null;

const setActiveGalleryImage = (button, direction = 0) => {
  if (!galleryMainImage || !button) return;
  const nextSrc = button.dataset.gallerySrc;
  if (!nextSrc || galleryMainImage.getAttribute('src') === nextSrc) return;

  if (direction) {
    document.querySelectorAll('.gallery-slide-out').forEach((image) => image.remove());
    const previousImage = galleryMainImage.cloneNode(true);
    previousImage.removeAttribute('id');
    previousImage.classList.remove('is-changing', 'is-sliding-next', 'is-sliding-prev');
    previousImage.classList.add(
      'gallery-slide-out',
      direction > 0 ? 'gallery-slide-out-next' : 'gallery-slide-out-prev'
    );
    galleryMainImage.parentElement?.append(previousImage);

    galleryMainImage.classList.remove('is-changing', 'is-sliding-next', 'is-sliding-prev');
    galleryMainImage.src = nextSrc;
    galleryMainImage.alt = button.dataset.galleryAlt || '윤상제 이진실 웨딩 사진';
    galleryMainImage.classList.toggle('is-contain', nextSrc.includes('/6.jpg'));
    void galleryMainImage.offsetWidth;
    galleryMainImage.classList.add(direction > 0 ? 'is-sliding-next' : 'is-sliding-prev');
    galleryMainImage.addEventListener('animationend', () => {
      galleryMainImage.classList.remove('is-sliding-next', 'is-sliding-prev');
      previousImage.remove();
    }, { once: true });
  } else {
    galleryMainImage.classList.add('is-changing');
    window.setTimeout(() => {
      galleryMainImage.src = nextSrc;
      galleryMainImage.alt = button.dataset.galleryAlt || '윤상제 이진실 웨딩 사진';
      galleryMainImage.classList.toggle('is-contain', nextSrc.includes('/6.jpg'));
      galleryMainImage.classList.remove('is-changing');
    }, 160);
  }

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

const moveGallery = (direction) => {
  if (!galleryMainImage || !galleryUniqueThumbs.length) return;
  const currentSrc = galleryMainImage.getAttribute('src');
  const currentIndex = galleryUniqueThumbs.findIndex((thumb) => thumb.dataset.gallerySrc === currentSrc);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  const nextIndex = (safeIndex + direction + galleryUniqueThumbs.length) % galleryUniqueThumbs.length;
  const nextThumb = galleryUniqueThumbs[nextIndex];

  pauseGalleryAutoScroll();
  setActiveGalleryImage(nextThumb, direction);
};

galleryPrevButton?.addEventListener('click', () => moveGallery(-1));
galleryNextButton?.addEventListener('click', () => moveGallery(1));

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
