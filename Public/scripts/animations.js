// Función para manejar las animaciones
function setupAnimations() {
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.2
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('animate-visible');
          observer.unobserve(entry.target);
        }, 100);
      }
    });
  }, options);

  // Observamos todos los elementos con clases de animación
  const animatedElements = document.querySelectorAll(
    '.fade-up, .fade-right, .fade-left, .fade-in, .fade-down, .scale-up, .slide-in'
  );

  // Aseguramos que los elementos empiecen sin la clase animate-visible
  animatedElements.forEach(element => {
    element.classList.remove('animate-visible');
    observer.observe(element);
  });
}

// Iniciamos las animaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Animación específica para el navbar
  const navItems = document.querySelectorAll('.navigation-primary .slide-in');
  const navTexts = document.querySelectorAll('.navigation-primary .link-text');
  const logoElements = document.querySelectorAll('.navigation-primary .fade-in');

  // Animar logo y nombre de la empresa
  logoElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('animate-visible');
    }, index * 200);
  });

  // Animar items de navegación
  navItems.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('animate-visible');
    }, 300 + (index * 100));
  });

  // Animar textos de navegación
  navTexts.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('animate-visible');
    }, 400 + (index * 100));
  });

  // Resto de las animaciones
  setTimeout(setupAnimations, 100);
});

// Modificamos la animación del hero section
window.addEventListener('load', () => {
  const heroElements = document.querySelectorAll('.hero-section .fade-up');
  heroElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('animate-visible');
    }, index * 200); // Agregamos un retraso secuencial para cada elemento
  });
});

