export function renderAdminArchive(products) {
  const tbody = document.getElementById('admin-archive-tbody');
  if (!tbody) return;

  const soldProducts = products.filter(p => p.status === 'sold');

  tbody.innerHTML = soldProducts.map(p => {
    const hasMedia = p.images && p.images[0] && p.images[0].startsWith('http');
    const thumbHtml = hasMedia 
      ? `<img src="${p.images[0]}" style="width:36px;height:45px;object-fit:cover" />`
      : `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:45px;background:var(--beige-mid);margin:0 auto;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4; color: var(--brown);">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>`;

    return `
      <tr>
        <td>${thumbHtml}</td>
        <td><strong>${p.name.ru}</strong><br><small style="color:var(--sold)">${p.name.en}</small></td>
        <td>${p.price.toLocaleString('ru-RU')} ₸</td>
        <td><span style="background:var(--dark);color:white;padding:3px 10px;font-size:11px;letter-spacing:0.1em">ПРОДАНО</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-delete" onclick="deleteProduct('${p.id}')">Удалить</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--sold);padding:32px;font-style:italic">Архив пуст</td></tr>`;
}
