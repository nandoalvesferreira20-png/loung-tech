const specialty = document.getElementById('specialty');
const day = document.getElementById('day');
const times = document.getElementById('time-options');
const dialog = document.getElementById('booking-dialog');
const status = document.getElementById('booking-status');
const confirmButton = document.getElementById('confirm-booking');
const schedules = [['09:00','10:30','14:00'],['08:30','11:00','15:30'],['09:30','13:00','16:00']];
function updateTimes() {
  times.replaceChildren();
  const options = schedules[(day.selectedIndex + specialty.selectedIndex) % schedules.length];
  options.forEach((time, index) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'time'; input.value = time; input.required = true;
    input.checked = index === 0;
    const span = document.createElement('span'); span.textContent = time;
    label.append(input, span); times.append(label);
  });
}
specialty.addEventListener('change', updateTimes);
day.addEventListener('change', updateTimes);
updateTimes();
document.querySelectorAll('[data-specialty]').forEach(button => button.addEventListener('click', () => {
  specialty.value = button.dataset.specialty; updateTimes();
  document.getElementById('agendamento').scrollIntoView(); specialty.focus({preventScroll:true});
}));
document.getElementById('booking-form').addEventListener('submit', event => {
  event.preventDefault();
  const time = document.querySelector('input[name=time]:checked');
  if (!time) return;
  const summary = document.getElementById('booking-summary'); summary.replaceChildren();
  [specialty.value, day.value + ' (dia fictício)', time.value].forEach(text => {
    const p = document.createElement('p'); p.textContent = text; summary.append(p);
  });
  status.textContent = ''; confirmButton.disabled = false; dialog.showModal();
});
confirmButton.addEventListener('click', () => {
  status.textContent = 'Simulação concluída. Nenhuma consulta foi marcada e nenhum dado foi enviado.';
  confirmButton.disabled = true;
});
