import { saveNewsletter, deleteNewsletter, sendNewsletterCampaign } from '../../services/newsletter-service.js';

let currentNewsletters = [];
let currentSubscribers = [];
let editingNewsletterId = null;
let isSourceMode = false;

// Email presets with branded layout
const TEMPLATES = {
  welcome: {
    title: 'Приветственная скидка 5000 ₸',
    subject: 'Ваш подарок от Бабушки Ольги — скидка 5000 ₸ 🧶',
    content: `
      <h2>Добро пожаловать в семью Babushka Olga! 🤍</h2>
      <p>Спасибо за подписку на наши новости. Мы рады делиться с вами теплом, уютом и историями создания каждого свитера.</p>
      <p>Как и обещали, дарим вам <strong>промокод на скидку 5000 ₸</strong> на ваш первый заказ:</p>
      <div style="background:#f4eee5; padding: 20px; text-align: center; border-radius: 6px; margin: 24px 0;">
        <span style="font-size: 20px; font-weight: bold; letter-spacing: 0.2em; color: #2c2523;">OLGA5000</span>
        <p style="margin: 8px 0 0; font-size: 12px; color: #7a6b65;">*Действует при заказе от 35 000 ₸</p>
      </div>
      <p>Каждое изделие связано вручную в Алматы с любовью и вниманием к каждой петле.</p>
      <p style="text-align: center; margin-top: 30px;">
        <a href="https://babushka-shop.firebaseapp.com/#products" style="display: inline-block; background: #2c2523; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px;">Перейти в каталог</a>
      </p>
    `
  },
  newDrop: {
    title: 'Анонс нового дропа свитеров',
    subject: 'Новая коллекция уже доступна к заказу! 🍂',
    content: `
      <h2>Новый дроп ручных свитеров уже на сайте</h2>
      <p>Рады представить нашу новую осенне-зимнюю коллекцию. Мы отобрали самые мягкие оттенки натуральной мериносовой шерсти и альпака.</p>
      <p>Количество каждого изделия строго ограничено, так как каждый свитер вяжется вручную одной парой заботливых рук.</p>
      <blockquote style="border-left: 3px solid #c8b89a; margin: 20px 0; padding-left: 16px; font-style: italic; color: #5a4e48;">
        «Каждая вещь сохраняет тепло рук и создается для того, чтобы согревать вас годами.»
      </blockquote>
      <p style="text-align: center; margin-top: 30px;">
        <a href="https://babushka-shop.firebaseapp.com/#products" style="display: inline-block; background: #2c2523; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px;">Смотреть новый дроп</a>
      </p>
    `
  },
  care: {
    title: 'Гид по бережному уходу',
    subject: 'Как ухаживать за вашим свитером ручной вязки ✨',
    content: `
      <h2>Забота о вашем любимом свитере</h2>
      <p>Шерстяные изделия ручной работы требуют деликатного обращения. Чтобы ваш свитер оставался мягким и держал форму долгие годы, делимся главными правилами:</p>
      <ul>
        <li><strong>Только ручная стирка</strong> в прохладной воде до 30°C с жидким средством для шерсти.</li>
        <li><strong>Не выкручивать:</strong> аккуратно отожмите лишнюю воду через махровое полотенце.</li>
        <li><strong>Сушить горизонтально</strong> на ровной поверхности вдали от батарей.</li>
        <li><strong>Хранить сложенным</strong> на полке — на вешалках свитер может растянуться.</li>
      </ul>
      <p>С любовью и заботой о ваших вещах,<br><strong>Бабушка Ольга</strong> 🤍</p>
    `
  }
};

export function initNewslettersFeature() {
  setupWysiwyg();
  setupFormListeners();
}

export function updateSubscribersCount(subscribers) {
  currentSubscribers = subscribers || [];
  const badge = document.getElementById('newsletter-recipients-count');
  if (badge) {
    badge.textContent = `${currentSubscribers.length} подписчиков`;
  }
  const sendBtn = document.getElementById('btn-send-newsletter');
  if (sendBtn) {
    sendBtn.innerHTML = `📨 Отправить всем (${currentSubscribers.length})`;
  }
}

export function renderNewsletters(newsletters) {
  currentNewsletters = newsletters || [];
  const tbody = document.getElementById('admin-newsletters-tbody');
  if (!tbody) return;

  if (currentNewsletters.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:var(--sold); padding:32px; font-style:italic;">
          История рассылок пуста. Создайте и отправьте первую рассылку выше.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = currentNewsletters.map(n => {
    const isSent = n.status === 'sent';
    const isSending = n.status === 'sending';
    
    let statusBadge = '<span class="newsletter-badge badge-draft">Черновик</span>';
    if (isSent) {
      statusBadge = '<span class="newsletter-badge badge-sent">✓ Отправлено</span>';
    } else if (isSending) {
      statusBadge = '<span class="newsletter-badge badge-sending">⏳ Отправка...</span>';
    }

    const date = n.sentAt || n.createdAt;
    const formattedDate = date ? new Date(date).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }) : '—';

    const countText = n.recipientCount ? `${n.recipientCount} чел.` : (n.sentTo?.length ? `${n.sentTo.length} чел.` : '—');

    return `
      <tr>
        <td style="font-size:12px; color:var(--sold); white-space:nowrap;">${formattedDate}</td>
        <td><strong>${escapeHtml(n.title || 'Без названия')}</strong></td>
        <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escapeHtml(n.subject || '—')}
        </td>
        <td style="white-space:nowrap;"><span style="font-size:13px; font-weight:500;">${countText}</span></td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn-edit" onclick="window.editNewsletter('${n.id}')" title="Редактировать">✏️</button>
            <button class="btn-edit" onclick="window.previewNewsletterModal('${n.id}')" title="Предпросмотр" style="background:#e8dfd2;">👁️</button>
            <button class="btn-delete" onclick="window.removeNewsletter('${n.id}')" title="Удалить">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupWysiwyg() {
  const editor = document.getElementById('newsletter-wysiwyg-editor');
  const sourceTextarea = document.getElementById('newsletter-content-source');
  const previewBody = document.getElementById('newsletter-live-preview-body');
  const previewSubject = document.getElementById('newsletter-live-preview-subject');
  const subjectInput = document.getElementById('newsletter-subject');
  const titleInput = document.getElementById('newsletter-title');

  if (!editor) return;

  // Sync content from editor to live preview and source textarea
  function updateLivePreview() {
    const htmlContent = isSourceMode ? (sourceTextarea?.value || '') : (editor?.innerHTML || '');
    
    if (previewBody) {
      previewBody.innerHTML = htmlContent || '<p style="color:#999; font-style:italic;">Начните вводить текст рассылки...</p>';
    }
    if (previewSubject && subjectInput) {
      previewSubject.textContent = subjectInput.value.trim() || 'Тема письма появится здесь';
    }
  }

  editor.addEventListener('input', () => {
    if (sourceTextarea) sourceTextarea.value = editor.innerHTML;
    updateLivePreview();
  });

  if (sourceTextarea) {
    sourceTextarea.addEventListener('input', () => {
      if (editor) editor.innerHTML = sourceTextarea.value;
      updateLivePreview();
    });
  }

  if (subjectInput) {
    subjectInput.addEventListener('input', updateLivePreview);
  }

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      if (!subjectInput?.value.trim() && titleInput.value.trim()) {
        // Optional placeholder hint
      }
    });
  }

  // WYSIWYG Toolbar action handlers
  document.querySelectorAll('.wysiwyg-btn[data-command]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const command = btn.getAttribute('data-command');
      const value = btn.getAttribute('data-value') || null;

      if (isSourceMode) {
        window.showToast('Переключитесь из режима HTML-кода для визуального форматирования');
        return;
      }

      editor.focus();

      if (command === 'createLink') {
        const url = prompt('Введите ссылку (URL):', 'https://');
        if (url) document.execCommand('createLink', false, url);
      } else if (command === 'insertImage') {
        const url = prompt('Введите ссылку на изображение (URL):', 'https://');
        if (url) document.execCommand('insertImage', false, url);
      } else if (command === 'insertButton') {
        const btnText = prompt('Текст на кнопке:', 'Перейти в каталог');
        const btnUrl = prompt('Ссылка кнопки:', 'https://babushka-shop.firebaseapp.com');
        if (btnText && btnUrl) {
          const btnHtml = `<p style="text-align: center; margin: 24px 0;"><a href="${btnUrl}" style="display: inline-block; background: #2c2523; color: #ffffff; padding: 12px 26px; text-decoration: none; font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px;">${btnText}</a></p>`;
          document.execCommand('insertHTML', false, btnHtml);
        }
      } else if (command === 'formatBlock' && value) {
        document.execCommand('formatBlock', false, value);
      } else {
        document.execCommand(command, false, value);
      }

      if (sourceTextarea) sourceTextarea.value = editor.innerHTML;
      updateLivePreview();
    });
  });

  // Toggle HTML Source Mode
  const toggleSourceBtn = document.getElementById('wysiwyg-toggle-source');
  if (toggleSourceBtn) {
    toggleSourceBtn.addEventListener('click', () => {
      isSourceMode = !isSourceMode;
      toggleSourceBtn.classList.toggle('active', isSourceMode);
      if (isSourceMode) {
        if (sourceTextarea && editor) sourceTextarea.value = editor.innerHTML;
        if (editor) editor.style.display = 'none';
        if (sourceTextarea) sourceTextarea.style.display = 'block';
        toggleSourceBtn.textContent = '👁️ Визуальный редактор';
      } else {
        if (editor && sourceTextarea) editor.innerHTML = sourceTextarea.value;
        if (sourceTextarea) sourceTextarea.style.display = 'none';
        if (editor) editor.style.display = 'block';
        toggleSourceBtn.textContent = '</> HTML код';
      }
      updateLivePreview();
    });
  }

  // Preset Template loader
  const templateSelect = document.getElementById('newsletter-template-select');
  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected && TEMPLATES[selected]) {
        const tpl = TEMPLATES[selected];
        if (titleInput) titleInput.value = tpl.title;
        if (subjectInput) subjectInput.value = tpl.subject;
        if (editor) editor.innerHTML = tpl.content.trim();
        if (sourceTextarea) sourceTextarea.value = tpl.content.trim();
        updateLivePreview();
        window.showToast(`Шаблон «${tpl.title}» загружен`);
      }
      e.target.value = '';
    });
  }
}

function setupFormListeners() {
  const saveDraftBtn = document.getElementById('btn-save-newsletter-draft');
  const sendBtn = document.getElementById('btn-send-newsletter');
  const clearBtn = document.getElementById('btn-clear-newsletter');

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async () => {
      await handleSaveDraft();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      await handleSendNewsletter();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      resetNewsletterForm();
    });
  }
}

function getFormData() {
  const title = document.getElementById('newsletter-title')?.value.trim() || '';
  const subject = document.getElementById('newsletter-subject')?.value.trim() || '';
  const editor = document.getElementById('newsletter-wysiwyg-editor');
  const sourceTextarea = document.getElementById('newsletter-content-source');
  const content = (isSourceMode ? sourceTextarea?.value : editor?.innerHTML) || '';

  return { title, subject, content };
}

async function handleSaveDraft() {
  const { title, subject, content } = getFormData();
  if (!title && !subject && !content) {
    window.showToast('Заполните хотя бы одно поле для сохранения');
    return;
  }

  try {
    const savedId = await saveNewsletter({
      title: title || 'Черновик рассылки',
      subject,
      content,
      status: 'draft',
      recipientCount: currentSubscribers.length,
      sentTo: []
    }, editingNewsletterId);

    editingNewsletterId = savedId;
    window.showToast('Черновик рассылки успешно сохранен');
  } catch (err) {
    console.error('Error saving draft:', err);
    window.showToast('Ошибка сохранения: ' + (err.message || 'попробуйте позже'));
  }
}

async function handleSendNewsletter() {
  const { title, subject, content } = getFormData();

  if (!subject) {
    window.showToast('Пожалуйста, укажите тему письма (Subject)');
    document.getElementById('newsletter-subject')?.focus();
    return;
  }

  if (!content || content.trim() === '' || content === '<br>') {
    window.showToast('Пожалуйста, добавьте содержимое письма');
    document.getElementById('newsletter-wysiwyg-editor')?.focus();
    return;
  }

  if (!currentSubscribers || currentSubscribers.length === 0) {
    window.showToast('В базе нет подписчиков для отправки');
    return;
  }

  const recipientEmails = currentSubscribers.map(s => s.email).filter(Boolean);

  const confirmMsg = `Отправить рассылку «${subject}» для ${recipientEmails.length} подписчиков через Resend?`;
  if (!confirm(confirmMsg)) {
    return;
  }

  const sendBtn = document.getElementById('btn-send-newsletter');
  const saveBtn = document.getElementById('btn-save-newsletter-draft');
  const originalText = sendBtn ? sendBtn.innerHTML : '';

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '⏳ Отправка писем...';
  }
  if (saveBtn) saveBtn.disabled = true;

  try {
    // Build wrapped HTML for email clients
    const styledHtml = wrapEmailTemplate(subject, content);

    const result = await sendNewsletterCampaign({
      id: editingNewsletterId,
      title: title || subject,
      subject,
      content: styledHtml,
      recipientEmails
    });

    if (result.success) {
      window.showToast(`✓ Рассылка успешно отправлена! Доставлено: ${result.sentCount} писем.`);
      resetNewsletterForm();
    } else {
      window.showToast(`Отправлено: ${result.sentCount}, с ошибками: ${result.failedCount}`);
    }
  } catch (err) {
    console.error('Error sending campaign:', err);
    window.showToast('Ошибка отправки: ' + (err.message || 'Проверьте Resend API ключ'));
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = originalText;
    }
    if (saveBtn) saveBtn.disabled = false;
  }
}

// Wraps newsletter HTML body into a responsive email layout
function wrapEmailTemplate(subject, innerContent) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f7f3ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2c2523; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #ebd9c8; }
    .email-header { background-color: #2c2523; padding: 32px 24px; text-align: center; color: #ffffff; }
    .email-logo { font-size: 24px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff; text-decoration: none; }
    .email-tagline { font-size: 11px; letter-spacing: 0.2em; color: #c8b89a; text-transform: uppercase; margin-top: 6px; }
    .email-body { padding: 36px 32px; font-size: 15px; }
    .email-body h2 { font-size: 22px; font-weight: 400; color: #2c2523; margin-top: 0; margin-bottom: 16px; line-height: 1.3; }
    .email-body p { margin: 0 0 16px 0; }
    .email-body a { color: #8c7355; text-decoration: underline; }
    .email-footer { background-color: #f4eee5; padding: 24px 32px; text-align: center; font-size: 12px; color: #7a6b65; border-top: 1px solid #e5d8cb; }
    .email-footer a { color: #7a6b65; text-decoration: underline; }
    @media only screen and (max-width: 620px) {
      .email-container { margin: 0; width: 100% !important; border-radius: 0; border: none; }
      .email-body { padding: 24px 20px; }
      .email-header { padding: 24px 16px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-logo">Babushka Olga</div>
      <div class="email-tagline">Ручные свитера · Алматы</div>
    </div>
    <div class="email-body">
      ${innerContent}
    </div>
    <div class="email-footer">
      <p style="margin: 0 0 8px 0;"><strong>Babushka Olga</strong> — создано в Алматы с любовью 🤍</p>
      <p style="margin: 0; font-size: 11px;">Вы получили это письмо, так как подписались на рассылку на сайте babushka-olga.com</p>
      <p style="margin: 8px 0 0; font-size: 11px;"><a href="https://babushka-shop.firebaseapp.com/unsubscribe" style="color: #7a6b65; text-decoration: underline;">Отписаться от рассылки</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function resetNewsletterForm() {
  editingNewsletterId = null;
  const titleInput = document.getElementById('newsletter-title');
  const subjectInput = document.getElementById('newsletter-subject');
  const editor = document.getElementById('newsletter-wysiwyg-editor');
  const sourceTextarea = document.getElementById('newsletter-content-source');
  const formTitle = document.getElementById('newsletter-form-heading');

  if (titleInput) titleInput.value = '';
  if (subjectInput) subjectInput.value = '';
  if (editor) editor.innerHTML = '';
  if (sourceTextarea) sourceTextarea.value = '';
  if (formTitle) formTitle.textContent = 'Создать новую рассылку';

  const previewBody = document.getElementById('newsletter-live-preview-body');
  const previewSubject = document.getElementById('newsletter-live-preview-subject');
  if (previewBody) previewBody.innerHTML = '<p style="color:#999; font-style:italic;">Начните вводить текст рассылки...</p>';
  if (previewSubject) previewSubject.textContent = 'Тема письма появится здесь';
}

export function editNewsletter(id) {
  const item = currentNewsletters.find(n => n.id === id);
  if (!item) return;

  editingNewsletterId = id;
  const titleInput = document.getElementById('newsletter-title');
  const subjectInput = document.getElementById('newsletter-subject');
  const editor = document.getElementById('newsletter-wysiwyg-editor');
  const sourceTextarea = document.getElementById('newsletter-content-source');
  const formTitle = document.getElementById('newsletter-form-heading');

  if (titleInput) titleInput.value = item.title || '';
  if (subjectInput) subjectInput.value = item.subject || '';
  
  // Extract body content if wrapped in full template
  let content = item.content || '';
  if (content.includes('<div class="email-body">')) {
    const match = content.match(/<div class="email-body">([\s\S]*?)<\/div>/);
    if (match) content = match[1].trim();
  }

  if (editor) editor.innerHTML = content;
  if (sourceTextarea) sourceTextarea.value = content;
  if (formTitle) formTitle.textContent = `Редактировать рассылку: ${item.title || 'Черновик'}`;

  const previewBody = document.getElementById('newsletter-live-preview-body');
  const previewSubject = document.getElementById('newsletter-live-preview-subject');
  if (previewBody) previewBody.innerHTML = content;
  if (previewSubject) previewSubject.textContent = item.subject || '';

  // Scroll to form smoothly
  const form = document.querySelector('.newsletter-editor-layout');
  if (form) form.scrollIntoView({ behavior: 'smooth' });

  window.showToast(`Рассылка «${item.title || 'Черновик'}» загружена в редактор`);
}

export function previewNewsletterModal(id) {
  const item = currentNewsletters.find(n => n.id === id);
  if (!item) return;

  const modal = document.getElementById('newsletter-preview-modal');
  const frame = document.getElementById('newsletter-preview-frame');
  const title = document.getElementById('newsletter-preview-modal-title');

  if (title) title.textContent = item.subject || item.title || 'Предпросмотр рассылки';
  if (frame) {
    let content = item.content || '';
    if (!content.includes('<!DOCTYPE html>')) {
      content = wrapEmailTemplate(item.subject || 'Рассылка Babushka Olga', content);
    }
    frame.srcdoc = content;
  }
  if (modal) modal.classList.add('open');
}

export function closeNewsletterPreviewModal() {
  const modal = document.getElementById('newsletter-preview-modal');
  if (modal) modal.classList.remove('open');
}

export async function removeNewsletter(id) {
  const item = currentNewsletters.find(n => n.id === id);
  const name = item?.title || item?.subject || 'эту рассылку';
  if (confirm(`Вы действительно хотите удалить рассылку «${name}»?`)) {
    try {
      await deleteNewsletter(id);
      if (editingNewsletterId === id) {
        resetNewsletterForm();
      }
      window.showToast('Рассылка удалена');
    } catch (err) {
      console.error(err);
      window.showToast('Ошибка удаления рассылки');
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Global hooks for onclick events in HTML
window.editNewsletter = editNewsletter;
window.previewNewsletterModal = previewNewsletterModal;
window.closeNewsletterPreviewModal = closeNewsletterPreviewModal;
window.removeNewsletter = removeNewsletter;
