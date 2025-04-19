export function showTooltip(element, message) {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.textContent = message;

  const rect = element.getBoundingClientRect();
  tooltip.style.top = `${rect.top - 40}px`;
  tooltip.style.left = `${rect.left + rect.width / 2}px`;

  document.body.appendChild(tooltip);

  setTimeout(() => {
    tooltip.classList.add("fade-out");
    setTimeout(() => tooltip.remove(), 300);
  }, 2000);
}
