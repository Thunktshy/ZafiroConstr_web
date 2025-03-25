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