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

function toggleMenu() {
  document.querySelector('.navigation-primary').classList.toggle('menu-open');
}
function closeMenu() {
  document.querySelector('.navigation-primary').classList.remove('menu-open');
}
