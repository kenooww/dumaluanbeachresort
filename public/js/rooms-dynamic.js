// Loads rooms created in the admin dashboard (stored in MongoDB) and renders them
// into the "Featured Rooms" section, using this template's own markup/classes so the
// styling from css/style.css applies automatically. Falls back to whatever static
// markup is already in #roomsHere if the API can't be reached (e.g. backend not running yet).

document.addEventListener('DOMContentLoaded', function () {
  var roomsHere = document.getElementById('roomsHere');
  var roomTypeSelect = document.getElementById('bookingRoomTypeSelect');
  if (!roomsHere) return;

  fetch('/api/rooms')
    .then(function (res) {
      if (!res.ok) throw new Error('Request failed');
      return res.json();
    })
    .then(function (rooms) {
      if (!Array.isArray(rooms) || rooms.length === 0) return; // keep static fallback markup

      roomsHere.innerHTML = rooms.map(roomCardHTML).join('');

      // main.js binds Magnific Popup to ".popup-with-form" once, on page load - the
      // freshly-injected "book now" links above need it re-applied so the booking
      // popup still opens for them.
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.magnificPopup) {
        window.jQuery(roomsHere)
          .find('.popup-with-form')
          .magnificPopup({ type: 'inline', preloader: false, focus: '#datepicker', modal: false });
      }

      if (roomTypeSelect) {
        var options = ['<option data-display="Room type">Room type</option>']
          .concat(
            rooms.map(function (room) {
              return '<option value="' + escapeHtml(room._id) + '">' + escapeHtml(room.name) + '</option>';
            })
          );
        roomTypeSelect.innerHTML = options.join('');
      }
    })
    .catch(function () {
      // API not reachable - leave the template's placeholder rooms in place
      console.warn('Could not load /api/rooms, showing placeholder rooms instead.');
    });

  function roomCardHTML(room) {
    var img = room.image ? room.image : 'img/rooms/1.png';
    var price = Number(room.pricePerNight || 0).toFixed(0);
    return (
      '<div class="single_rooms">' +
      '<div class="room_thumb">' +
      '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(room.name) + '">' +
      '<div class="room_heading d-flex justify-content-between align-items-center">' +
      '<div class="room_heading_inner">' +
      '<span>From $' + price + '/night</span>' +
      '<h3>' + escapeHtml(room.name) + '</h3>' +
      '</div>' +
      '<a href="#test-form" class="line-button popup-with-form">book now</a>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
