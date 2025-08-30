const nav = document.querySelector('.navigation-primary');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});


const heroSection = document.querySelector('.hero-section');
const totalImages = 40; // Cambia este número según la cantidad que tengas

const images = [];
for (let i = 1; i <= totalImages; i++) {
  images.push(`./images/silder-images/hero-background (${i}).jpg`);
}

let currentIndex = 0;

function changeHeroBackground() {
  currentIndex = (currentIndex + 1) % images.length;
  heroSection.style.backgroundImage = `url('${images[currentIndex]}')`;
}

setInterval(changeHeroBackground, 5000);



function copyEmail() {
  const emailText = document.querySelector('.email-text').textContent;
  navigator.clipboard.writeText(emailText)
    .then(() => {
      const tooltip = document.querySelector('.copy-tooltip');
      tooltip.textContent = '¡Copiado!';
      setTimeout(() => {
        tooltip.textContent = 'Haz clic para copiar';
      }, 2000);
    })
    .catch(err => {
      console.error('Error al copiar: ', err);
    });
}


function showError(message) {
  const errorMessageElement = document.getElementById("error-message");
  errorMessageElement.textContent = message;
  errorMessageElement.classList.add('alert', 'alert-danger', 'active'); // Add classes to show the alert

  // Remove the 'fade-out' class if it exists (in case of multiple calls)
  errorMessageElement.classList.remove('fade-out');

  // Show the alert for 5 seconds, then fade out
  setTimeout(() => {
      errorMessageElement.classList.add('fade-out'); // Start fading out
      setTimeout(() => {
          errorMessageElement.classList.remove('active', 'fade-out'); // Hide the alert after fading out
      }, 500); // Match this duration with the CSS transition duration
  }, 5000); // Show for 5 seconds
}

function scrollToFooter(event) {
  event.preventDefault(); // Prevent the default anchor behavior
  const footer = document.getElementById('contacto');
  if (footer) {
    footer.scrollIntoView({ behavior: 'smooth' });
  }
}  

function scrollToServicios(event) {
  event.preventDefault(); // Prevent the default anchor behavior
  const section = document.getElementById('servicios');
  if (section){
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

function toggleExperienceFocus(event, card) {
  const experienceSection = document.querySelector('.experience-section');
  const isFocused = card.classList.contains('focused-card');

  // When already focused, only allow closing if the event target is the toggle button.
  if (isFocused && !event.target.classList.contains('toggle-btn')) {
    return;
  }

  if (!isFocused) {
    // Hide all other cards
    document.querySelectorAll('.experience-card').forEach(c => {
      c.classList.remove('focused-card', 'active');
      c.style.display = 'none';
    });

    // Enter focus mode on the clicked card
    experienceSection.classList.add('focus-mode');
    card.classList.add('focused-card', 'active');
    card.style.display = 'block';

    // Change the button text to a close icon
    const toggleBtn = card.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = '&times;';
      toggleBtn.classList.add('close-focus');
    }

    // Reveal the details section
    const details = card.querySelector('.experience-details');
    if (details) {
      details.style.display = 'block';
    }
  } else {
    exitExperienceFocusMode();
  }
}

function exitExperienceFocusMode() {
  document.querySelectorAll('.experience-card').forEach(c => {
    c.classList.remove('focused-card', 'active');
    c.style.display = 'block';

    // Restore the button text
    const toggleBtn = c.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = 'Ver Detalles';
      toggleBtn.classList.remove('close-focus');
    }

    // Hide the details section
    const details = c.querySelector('.experience-details');
    if (details) {
      details.style.display = 'none';
    }
  });

  document.querySelector('.experience-section').classList.remove('focus-mode');
}