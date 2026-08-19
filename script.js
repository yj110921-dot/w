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

const gallerySection = document.querySelector('.gallery-single');
const galleryToggle = document.querySelector('.gallery-toggle');
galleryToggle?.addEventListener('click', () => {
  const isExpanded = gallerySection?.classList.toggle('is-expanded');
  galleryToggle.setAttribute('aria-expanded', String(Boolean(isExpanded)));
});
