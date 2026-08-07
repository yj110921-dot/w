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
const guestbookForm = document.querySelector('#guestbookForm');const guestbookList = document.querySelector('#guestbookList');const guestbookKey = 'sangje-jinsil-guestbook';const escapeGuestbookText = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));const getGuestbookEntries = () => JSON.parse(localStorage.getItem(guestbookKey) || '[]');const renderGuestbook = () => {  if (!guestbookList) return;  const entries = getGuestbookEntries();  if (!entries.length) {    guestbookList.innerHTML = '<p class="guestbook-empty">아직 남겨진 축하글이 없습니다.</p>';    return;  }  guestbookList.innerHTML = entries.map((entry) => `    <article class="guestbook-card">      <strong>${escapeGuestbookText(entry.name)}</strong>      <p>${escapeGuestbookText(entry.message)}</p>    </article>  `).join('');};guestbookForm?.addEventListener('submit', (event) => {  event.preventDefault();  const name = document.querySelector('#guestName').value.trim();  const message = document.querySelector('#guestMessage').value.trim();  if (!name || !message) return;  const entries = [{ name, message }, ...getGuestbookEntries()].slice(0, 8);  localStorage.setItem(guestbookKey, JSON.stringify(entries));  guestbookForm.reset();  renderGuestbook();});renderGuestbook();