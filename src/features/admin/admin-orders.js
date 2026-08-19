import { updateOrderStatus, deleteOrder } from '../../services/order-service.js';

export function renderOrders(orders) {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  tbody.innerHTML = orders.map(o => {
    const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : '—';

    // Build items breakdown html
    const itemsHtml = (o.items || []).map(item => 
      `• ${item.name.ru} (Размер: <strong>${item.size}</strong>) × ${item.quantity}`
    ).join('<br>');

    // Status styling
    const statusSelect = `
      <select class="status-select" onchange="window.updateOrderState('${o.id}', this.value)">
        <option value="new" ${o.status === 'new' ? 'selected' : ''}>Новый</option>
        <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Обработан</option>
      </select>
    `;

    const discountInfo = o.discountAmount && o.discountAmount > 0
      ? `<br><span style="font-size:11px;color:#27ae60;font-weight:normal">(скидка ${o.discountAmount.toLocaleString('ru-RU')} ₸)</span>`
      : '';

    return `
      <tr style="${o.status === 'completed' ? 'opacity: 0.6' : ''}">
        <td><strong>${o.customerName}</strong><br><a href="tel:${o.customerPhone}" style="color:var(--brown);font-size:12px;text-decoration:none">${o.customerPhone}</a></td>
        <td><div style="font-size:13px;line-height:1.4">${itemsHtml}</div></td>
        <td><strong>${o.totalPrice.toLocaleString('ru-RU')} ₸</strong>${discountInfo}</td>
        <td>${statusSelect}</td>
        <td><small style="color:var(--sold)">${dateStr}</small></td>
        <td>
          <div class="table-actions">
            <button class="btn-delete" onclick="window.deleteOrder('${o.id}')">Удалить</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--sold);padding:48px;font-style:italic">Новых заказов нет</td></tr>`;
}

export async function updateOrderState(orderId, newStatus) {
  try {
    await updateOrderStatus(orderId, newStatus);
    window.showToast('Статус заказа обновлен');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка обновления заказа');
  }
}
window.updateOrderState = updateOrderState;

export async function deleteOrderClick(id) {
  if (!confirm('Удалить заказ? Это действие необратимо.')) return;
  try {
    await deleteOrder(id);
    window.showToast('Заказ удалён');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка удаления заказа');
  }
}
window.deleteOrder = deleteOrderClick;
