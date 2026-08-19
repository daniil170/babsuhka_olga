let subscribersList = [];

export function renderSubscribers(subs) {
  subscribersList = subs;
  const tbody = document.getElementById('admin-subscribers-tbody');
  if (!tbody) return;
  tbody.innerHTML = subs.map(s => {
    const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleString('ru-RU') : '—';
    return `
      <tr>
        <td><strong>${s.email}</strong></td>
        <td><small style="color:var(--sold)">${dateStr}</small></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--sold);padding:24px;font-style:italic">Подписчиков нет</td></tr>`;
}

export function exportSubscribersCSV() {
  if (subscribersList.length === 0) {
    window.showToast('Нет подписчиков для экспорта');
    return;
  }
  let csvContent = "data:text/csv;charset=utf-8,Email,Date\n";
  subscribersList.forEach(s => {
    const dateStr = s.createdAt ? new Date(s.createdAt).toISOString() : '';
    csvContent += `"${s.email}","${dateStr}"\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `subscribers_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
window.exportSubscribersCSV = exportSubscribersCSV;
