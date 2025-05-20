document.addEventListener('DOMContentLoaded', function () {
  // Calculate tomorrow's date string first
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${yyyy}-${mm}-${dd}`;

  // Set min date for the date input to tomorrow
  const reservationDateInput = document.getElementById('reservation-date');
  reservationDateInput.min = tomorrowStr;
  reservationDateInput.value = tomorrowStr;
  reservationDateInput.dispatchEvent(new Event('change'));

  // Initialize FullCalendar with validRange using tomorrowStr
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: '',
      center: 'title',
      right: 'prev,next'
    },
    validRange: {
      start: tomorrowStr // Only allow selecting from tomorrow onwards
    },
    dateClick: function(info) {
      calendar.select(info.date); // <-- This will highlight the clicked date
      reservationDateInput.value = info.dateStr;
      reservationDateInput.dispatchEvent(new Event('change'));
      document.getElementById('slot-section').style.display = 'block';
    }
  });
  calendar.render();

  // Fetch vehicle categories from API and populate select
  fetch('/api/vehicle-types')
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById('vehicle-type-select');
      select.innerHTML = '<option value="">Select vehicle category</option>';
      data.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name || type.category || type.title || `Type ${type.id}`;
        select.appendChild(option);
      });
    });

  const startHour = 8;
  const endHour = 20;

  function generateTimeSlots() {
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 15) {
        slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
      }
    }
    return slots;
  }

  function populateTimeSlotSelect(selectId, reserved = []) {
    const select = document.getElementById(selectId);
    select.innerHTML = '';
    generateTimeSlots().forEach(time => {
      if (!reserved.includes(time)) {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        select.appendChild(option);
      }
    });
  }

  function fetchReservedSlots(date, callback) {
    fetch(`/api/timeslots/available?date=${date}`)
      .then(res => res.json())
      .then(data => callback(data))
      .catch(() => callback([]));
  }

  document.getElementById('reservation-date').addEventListener('change', function () {
    const date = this.value;
    fetchReservedSlots(date, reserved => {
      populateTimeSlotSelect('arrival-time-slot', reserved);
      populateTimeSlotSelect('departure-time-slot', reserved);
      document.getElementById('slot-section').style.display = 'block';
    });
  });

  window.reserveSlot = function () {
    const reservationDate = document.getElementById('reservation-date').value;
    const arrivalTime = document.getElementById('arrival-time-slot').value;
    const departureTime = document.getElementById('departure-time-slot').value;
    const registration = document.getElementById('registration-input').value.trim();
    const country = document.getElementById('country-input').value.trim();
    const vehicleType = document.getElementById('vehicle-type-select').value;
    const email = document.getElementById('email-input').value.trim();
    const company = document.getElementById('company-input').value.trim();
    const disclaimerChecked = document.getElementById('disclaimer-checkbox').checked;
    const disclaimerError = document.getElementById('disclaimer-error');

    if (!reservationDate || !arrivalTime || !departureTime) {
      alert('Please select a date and both arrival and departure times.');
      return;
    }
    if (!registration) {
      alert('Please enter the registration.');
      return;
    }
    if (!country) {
      alert('Please enter the country of origin.');
      return;
    }
    if (!vehicleType) {
      alert('Please select a vehicle category.');
      return;
    }
    if (!email) {
      alert('Please enter your email address.');
      return;
    }
    if (!company) {
      alert('Please enter the company name.');
      return;
    }
    if (!disclaimerChecked) {
      disclaimerError.style.display = 'inline';
      return;
    } else {
      disclaimerError.style.display = 'none';
    }

    fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: reservationDate,
        arrival_time: arrivalTime,
        departure_time: departureTime,
        registration,
        country,
        company, // <-- add this line
        email,
        vehicle_type_id: vehicleType
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Reservation successful!');
        } else {
          alert('Error reserving slot');
        }
      });
  };
});