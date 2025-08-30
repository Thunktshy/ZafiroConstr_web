// Login Modal Logic and Authentication with authRouter API

document.addEventListener("DOMContentLoaded", () => {

  // --- User State ---
  let userState = {
    loggedIn: false,
    name: "",
    email: "",
    photoUrl: null, // For real app, use base64 or URL of profile image
  };

  // Helper to show/hide navbar and offcanvas login info
  function updateUserUI() {
    const navBtn = document.getElementById("loginNavbarBtn");
    const ocBtn = document.getElementById("loginOffcanvasBtn");

    if (userState.loggedIn) {
      let photoSpanNav = document.getElementById('navbar-user-photo');
      let nameSpanNav = document.getElementById('navbar-user-name');

      // Generate a circle avatar with initials
      let firstInitial = userState.name ? userState.name[0].toUpperCase() : "U";
      photoSpanNav.innerHTML = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-400/90 text-[#304781] text-xl font-bold border-2 border-white shadow">${firstInitial}</span>`;
      nameSpanNav.textContent = userState.name;
      photoSpanNav.classList.remove('hidden');
      nameSpanNav.classList.remove('hidden');

      // Offcanvas
      let photoSpanOc = document.getElementById('offcanvas-user-photo');
      let nameSpanOc = document.getElementById('offcanvas-user-name');
      photoSpanOc.innerHTML = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-400/90 text-[#304781] text-xl font-bold border-2 border-white shadow">${firstInitial}</span>`;
      nameSpanOc.textContent = userState.name;
      photoSpanOc.classList.remove('hidden');
      nameSpanOc.classList.remove('hidden');

      navBtn.innerHTML =
        `<span class="mr-2" id="navbar-user-photo"></span>
         <span class="ml-1 mr-2 text-sm rounded-full px-3 py-1 bg-yellow-400/60">${userState.name}</span>
         <i class="fas fa-sign-out-alt ml-1"></i> Cerrar sesión`;

      ocBtn.innerHTML =
        `<span class="mr-2" id="offcanvas-user-photo"></span>
         <span class="ml-1 mr-2 text-sm rounded-full px-3 py-1 bg-yellow-400/60">${userState.name}</span>
         <i class="fas fa-sign-out-alt ml-1"></i> Cerrar sesión`;

      navBtn.onclick = logoutHandler;
      ocBtn.onclick = logoutHandler;

    } else {
      // Guest
      let photoSpanNav = document.getElementById('navbar-user-photo');
      let nameSpanNav = document.getElementById('navbar-user-name');

      photoSpanNav.innerHTML = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-400 text-white/90 text-xl font-bold border-2 border-[#304781] shadow">G</span>`;
      nameSpanNav.textContent = "Guest";
      photoSpanNav.classList.remove('hidden');
      nameSpanNav.classList.remove('hidden');

      // Offcanvas
      let photoSpanOc = document.getElementById('offcanvas-user-photo');
      let nameSpanOc = document.getElementById('offcanvas-user-name');
      photoSpanOc.innerHTML = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-400 text-white/90 text-xl font-bold border-2 border-[#304781] shadow">G</span>`;
      nameSpanOc.textContent = "Guest";
      photoSpanOc.classList.remove('hidden');
      nameSpanOc.classList.remove('hidden');

      navBtn.innerHTML =
        `<i class="fas fa-sign-in-alt mr-2"></i> Iniciar sesión`;

      ocBtn.innerHTML =
        `<i class="fas fa-sign-in-alt mr-2"></i> Iniciar sesión`;

      navBtn.onclick = function() {
        document.getElementById("loginForm").reset();
        document.getElementById("loginModalError").classList.remove('active');
        openLoginModal();
      };
      ocBtn.onclick = function() {
        document.getElementById("loginForm").reset();
        document.getElementById("loginModalError").classList.remove('active');
        openLoginModal();
      };
    }
  }

  // --- Login Modal Logic ---
  function openLoginModal() {
    var modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
  }

  // --- API Authentication Handlers ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("emailLogin").value.trim();
      const password = document.getElementById("passwordLogin").value;

      // Show spinner or disable
      document.getElementById("loginModalError").classList.remove('active');
      loginForm.querySelector("button[type='submit']").disabled = true;
      loginForm.querySelector("button[type='submit']").innerHTML = "Entrando...";

      try {
        const resp = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!resp.ok) {
          throw new Error("Invalid credentials");
        }
        const data = await resp.json();

        // If login success
        if (data.success) {
          userState.loggedIn = true;
          userState.name = data.username || "Usuario";
          userState.email = email;

          updateUserUI();
          document.getElementById('loginModal').querySelector('.btn-close').click();
          alert("Bienvenido/a, " + userState.name);
        } else {
          throw new Error(data.message || "Error de inicio de sesión");
        }
      } catch (err) {
        document.getElementById("loginModalError").classList.add('active');
        document.getElementById("loginModalError").textContent = err?.message || "Hubo un problema, intente nuevamente.";
      } finally {
        loginForm.querySelector("button[type='submit']").disabled = false;
        loginForm.querySelector("button[type='submit']").innerHTML = "Entrar";
      }
    });
  }

  // --- Logout ---
  function logoutHandler(e) {
    e.preventDefault();
    fetch("/api/logout", { method: "POST" })
      .then(() => {
        userState.loggedIn = false;
        updateUserUI();
        alert("Sesión cerrada.");
      })
      .catch(err => console.error('Logout error:', err));
  }

  // --- On Page Load: Check Auth Status ---
  function checkAuthStatus() {
    fetch("/api/auth/status")
      .then(resp => resp.json())
      .then(data => {
        if (data.authenticated) {
          userState.loggedIn = true;
          userState.name = data.username || "Usuario";
        } else {
          userState.loggedIn = false;
        }
        updateUserUI();
      })
      .catch(err => {
        console.error("Error checking auth status:", err);
        userState.loggedIn = false;
        updateUserUI();
      });
  }

  // Check on page load
  checkAuthStatus();

  // --- Hero BG animation ---
  const heroSection = document.getElementById('heroSection');
  if (heroSection) {
    const totalImages = 40; 
    let currentIndex = 1, timeoutId;

    function changeHeroBackground() {
      currentIndex = (currentIndex + 1) % totalImages;
      let src = `./images/silder-images/hero-background (${(currentIndex===0?totalImages:currentIndex)}.jpg`;
      heroSection.querySelector("img").setAttribute('src', src);
      // Fade effect
      heroSection.querySelector("img").style.opacity=0.5; 
      setTimeout(()=>{heroSection.querySelector("img").style.opacity=1}, 200);
    }
    changeHeroBackground();
    clearInterval(timeoutId);
    timeoutId = setInterval(changeHeroBackground, 8300);

    // OnUnload
    window.addEventListener('beforeunload', ()=>clearInterval(timeoutId));
  }

  // --- Email copy animation ---
  function copyEmail() {
    const emailText = document.querySelector('.email-text').textContent;
    navigator.clipboard.writeText(emailText)
      .then(() => {
        let tooltip = document.querySelector('.copy-tooltip');
        if(tooltip) {
          tooltip.style.opacity="1";
          setTimeout(()=>{tooltip.style.opacity="0";}, 2200);
        }
      })
      .catch(err => console.error('Clipboard error:', err));
  }

  // Event delegation for copyEmail
  window.copyEmail = copyEmail;

});

