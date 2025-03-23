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
  images.push(`/Public/images/silder-images/hero-background (${i}).jpg`);
}

let currentIndex = 0;

function changeHeroBackground() {
  currentIndex = (currentIndex + 1) % images.length;
  heroSection.style.backgroundImage = `url('${images[currentIndex]}')`;
}

setInterval(changeHeroBackground, 5000);



function toggleFocus(headerElement) {
  const card = headerElement.closest('.service-card');
  const grid = document.querySelector('.services-grid');
  

  if (!card.classList.contains('focused-card')) {
  
    document.querySelectorAll('.service-card').forEach(c => {
      c.classList.remove('focused-card', 'active');
    });


    grid.classList.add('focus-mode');


    card.classList.add('focused-card', 'active');
  }

  else {
    card.classList.remove('focused-card', 'active');
 
    grid.classList.remove('focus-mode');
  }
}

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