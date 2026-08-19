export function toggleMaintenanceOverlay(isMaintenanceActive, isAdminLoggedIn) {
  const maintenanceOverlay = document.getElementById('maintenance-overlay');
  if (!maintenanceOverlay) return;
  
  // Show maintenance overlay if:
  // - Maintenance Mode is active in DB AND
  // - User is NOT authenticated as Admin
  const shouldBlock = isMaintenanceActive && !isAdminLoggedIn;
  maintenanceOverlay.classList.toggle('open', shouldBlock);
}
