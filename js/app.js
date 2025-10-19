class PokemonApp {
  constructor() {
    this.API_URL = 'https://pokeapi.co/api/v2/pokemon';
    this.pokemonList = [];
    this.filteredList = [];
    this.offset = 0;
    this.limit = 20;
    this.isLoading = false;

    this.elements = {
      container: document.getElementById('pokemon-container'),
      btnOrdenar: document.getElementById('ordenar'),
      btnAgregar: document.getElementById('agregar'),
      btnEliminar: document.getElementById('eliminar'),
      btnLimpiar: document.getElementById('limpiar'),
      inputSearch: document.getElementById('search'),
      btnCargarMas: document.getElementById('cargarMas'),
      spinner: document.getElementById('spinner'),
      pokemonCount: document.getElementById('pokemon-count'),
      errorContainer: document.getElementById('error-container'),
      modal: document.getElementById('pokemonModal'),
      modalBody: document.getElementById('pokemonModalBody'),
      modalTitle: document.getElementById('pokemonModalLabel'),
      toastBody: document.getElementById('toast-body'),
      toast: document.getElementById('liveToast'),
      toastTime: document.getElementById('toast-time')
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.fetchPokemons();
    this.showWelcomeMessage();
  }

  bindEvents() {
    if (this.elements.btnOrdenar) this.elements.btnOrdenar.addEventListener('click', () => this.ordenarPokemons());
    if (this.elements.btnAgregar) this.elements.btnAgregar.addEventListener('click', () => this.agregarPokemonAleatorio());
    if (this.elements.btnEliminar) this.elements.btnEliminar.addEventListener('click', () => this.eliminarUltimoPokemon());
    if (this.elements.btnLimpiar) this.elements.btnLimpiar.addEventListener('click', () => this.limpiarLista());
    if (this.elements.inputSearch) this.elements.inputSearch.addEventListener('input', (e) => this.buscarPokemon(e.target.value));
    if (this.elements.btnCargarMas) this.elements.btnCargarMas.addEventListener('click', () => this.cargarMasPokemons());
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  handleKeyboardShortcuts(e) {
    if (e.ctrlKey) {
      switch (e.key) {
        case 'f':
          e.preventDefault();
          this.elements.inputSearch.focus();
          break;
        case 'r':
          e.preventDefault();
          this.agregarPokemonAleatorio();
          break;
      }
    }
  }

  showWelcomeMessage() {
    this.mostrarToast('¡Bienvenido a la Pokédex! Usa Ctrl+F para buscar y Ctrl+R para agregar un Pokémon aleatorio', 'info');
  }

  mostrarSpinner() {
    if (this.elements.spinner) this.elements.spinner.style.display = 'block';
    if (this.elements.errorContainer) this.elements.errorContainer.style.display = 'none';
  }

  ocultarSpinner() {
    if (this.elements.spinner) this.elements.spinner.style.display = 'none';
  }

  mostrarError() {
    if (this.elements.errorContainer) this.elements.errorContainer.style.display = 'block';
    this.ocultarSpinner();
  }

  async fetchPokemons() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.mostrarSpinner();
    this.setButtonLoading(this.elements.btnCargarMas, true);

    try {
      const response = await fetch(`${this.API_URL}?limit=${this.limit}&offset=${this.offset}`);
      if (!response.ok) {
        throw new Error(`Error en la respuesta de la API: ${response.status}`);
      }
      const data = await response.json();
      
      const detalles = await Promise.allSettled(
        data.results.map(pokemon => fetch(pokemon.url).then(resp => {
          if (!resp.ok) {
            throw new Error(`Error al obtener detalles de ${pokemon.name}`);
          }
          return resp.json();
        }))
      );

      const validPokemons = detalles.filter(result => result.status === 'fulfilled').map(result => result.value);
      const errors = detalles.filter(result => result.status === 'rejected');

      if (errors.length > 0) {
        console.warn(`${errors.length} Pokémon no se pudieron cargar:`, errors);
      }
      
      this.pokemonList = [...this.pokemonList, ...validPokemons];
      this.filteredList = [...this.pokemonList];
      this.renderPokemons();
      this.updatePokemonCount();

      if (validPokemons.length > 0) {
        this.mostrarToast(`${validPokemons.length} Pokémon cargados exitosamente`, 'success');
      }

    } catch (error) {
      console.error('Error al cargar Pokémon:', error);
      this.mostrarError();
      this.mostrarToast('Error al cargar Pokémon. Verifica tu conexión e intenta nuevamente.', 'danger');
    } finally {
      this.isLoading = false;
      this.ocultarSpinner();
      this.setButtonLoading(this.elements.btnCargarMas, false);
    }
  }

  renderPokemons() {
    if (!this.elements.container) return;
    if (this.filteredList.length === 0) {
      this.elements.container.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="mb-4">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="40" stroke="#dee2e6" stroke-width="2" fill="#f8f9fa"/>
              <text x="50%" y="55%" text-anchor="middle" fill="#6c757d" font-size="14">🔍</text>
            </svg>
          </div>
          <h4 class="text-muted">No se encontraron Pokémon</h4>
          <p class="text-muted">
            ${this.pokemonList.length === 0 ? 'Carga algunos Pokémon para comenzar' : 'Intenta con otro término de búsqueda'}
          </p>
        </div>
      `;
      return;
    }
    this.elements.container.innerHTML = '';
    this.filteredList.forEach((pokemon, index) => {
      const card = this.createPokemonCard(pokemon, index);
      this.elements.container.appendChild(card);
    });
  }

  createPokemonCard(pokemon, index) {
    const card = document.createElement('div');
    card.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-3';
    
    const mainType = pokemon.types && pokemon.types.length > 0 ? pokemon.types[0].type.name : 'normal';
    const typeClassName = `type-card-${mainType}`;

    const typesHTML = this.createTypesHTML(pokemon.types);
    const imageUrl = this.getPokemonImageUrl(pokemon);
    const cleanName = pokemon.name.replace(/-/g, ' ');
    
    card.innerHTML = `
      <div class="card shadow-sm h-100 ${typeClassName}" data-pokemon-index="${index}"> 
        <div class="position-relative">
          <img src="${imageUrl}" class="card-img-top" alt="${cleanName}" loading="lazy" onerror="this.src='${this.createFallbackImageSVG()}'">
          <div class="position-absolute top-0 end-0 p-2">
            <span class="badge bg-light text-dark">#${pokemon.id}</span>
          </div>
        </div>
        <div class="card-body text-center d-flex flex-column">
          <h5 class="card-title text-capitalize mb-2">${cleanName}</h5>
          <div class="mb-2">${typesHTML}</div>
          <div class="mt-auto">
            <small class="text-muted">
              ${pokemon.height ? `${(pokemon.height / 10).toFixed(1)}m` : ''} •
              ${pokemon.weight ? `${(pokemon.weight / 10).toFixed(1)}kg` : ''}
            </small>
          </div>
        </div>
      </div>
    `;
    const cardElement = card.querySelector('.card');
    if (cardElement) {
      cardElement.addEventListener('click', () => this.mostrarDetalles(pokemon));
    }
    return card;
  }

  getPokemonImageUrl(pokemon) {
    return pokemon.sprites?.front_default || this.createFallbackImageSVG();
  }

  createFallbackImageSVG() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="#f8f9fa"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6c757d" font-size="20">?</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  createTypesHTML(types) {
    if (!types || types.length === 0) {
      return '<span class="badge bg-secondary">Desconocido</span>';
    }
    return types.map(type => `<span class="badge type-${type.type?.name || 'unknown'} me-1">${type.type?.name || 'unknown'}</span>`).join('');
  }

  mostrarDetalles(pokemon) {
    if (!pokemon || !this.elements.modalBody || !this.elements.modalTitle) {
      this.mostrarToast('Error: No se pueden mostrar los detalles del Pokémon', 'danger');
      return;
    }
    const cleanName = pokemon.name.replace(/-/g, ' ');
    this.elements.modalTitle.textContent = `🔍 ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
    const image = this.getPokemonImageUrl(pokemon);
    const weight = pokemon.weight ? `${(pokemon.weight / 10).toFixed(1)} kg` : 'N/A';
    const height = pokemon.height ? `${(pokemon.height / 10).toFixed(1)} m` : 'N/A';
    const baseExp = pokemon.base_experience || 'N/A';
    const typesHTML = this.createTypesHTML(pokemon.types);
    const statsHTML = this.createStatsHTML(pokemon.stats || []);
    const abilitiesHTML = (pokemon.abilities || []).map(ability => {
      const abilityName = ability.ability?.name?.replace('-', ' ') || 'unknown';
      const isHidden = ability.is_hidden ? ' (Oculta)' : '';
      return `<span class="badge bg-info me-1">${abilityName}${isHidden}</span>`;
    }).join('');
    this.elements.modalBody.innerHTML = `
      <div class="text-center">
        <div class="pokemon-image-container mb-3">
          <img src="${image}" alt="${cleanName}" class="img-fluid" onerror="this.src='${this.createFallbackImageSVG()}'">
        </div>
        <h4 class="text-capitalize pokemon-name mb-3">
          ${cleanName}
          <span class="badge bg-primary">#${pokemon.id}</span>
        </h4>
        <div class="pokemon-stats mb-4">
          <div class="row text-center">
            <div class="col-4">
              <strong>Peso:</strong><br>
              <span class="stat-value">${weight}</span>
            </div>
            <div class="col-4">
              <strong>Altura:</strong><br>
              <span class="stat-value">${height}</span>
            </div>
            <div class="col-4">
              <strong>Exp. Base:</strong><br>
              <span class="stat-value">${baseExp}</span>
            </div>
          </div>
        </div>
        <div class="pokemon-types mb-4">
          <strong>Tipos:</strong><br>
          ${typesHTML}
        </div>
        ${abilitiesHTML.length > 0 ? `
          <div class="pokemon-abilities mb-4">
            <strong>Habilidades:</strong><br>
            ${abilitiesHTML}
          </div>
        ` : ''}
        ${statsHTML.length > 0 ? `
          <div class="pokemon-base-stats">
            <strong>Estadísticas Base:</strong>
            <div class="mt-3">
              ${statsHTML}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    try {
      const modal = new bootstrap.Modal(this.elements.modal);
      modal.show();
    } catch (error) {
      console.error('Error showing modal:', error);
      this.mostrarToast('Error al mostrar detalles', 'danger');
    }
  }

  createStatsHTML(stats) {
    if (!stats || stats.length === 0) return '';
    return stats.map(stat => {
      const statName = stat.stat?.name?.replace('-', ' ');
      const statValue = stat.base_stat;
      const percentage = Math.min((statValue / 255) * 100, 100);
      return `
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <small class="text-muted text-capitalize fw-bold">${statName}:</small>
            <small class="text-primary fw-bold">${statValue}</small>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-gradient" style="width: ${percentage}%" role="progressbar" aria-valuenow="${statValue}" aria-valuemin="0" aria-valuemax="255"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  mostrarToast(mensaje, tipo = 'success') {
    if (!this.elements.toastBody || !this.elements.toast || !this.elements.toastTime) {
      console.error('Elementos del toast no encontrados');
      return;
    }
    this.elements.toastBody.textContent = mensaje;
    this.elements.toastTime.textContent = new Date().toLocaleTimeString();
    this.elements.toast.className = `toast text-bg-${tipo}`;
    try {
      const bsToast = new bootstrap.Toast(this.elements.toast, {
        autohide: true,
        delay: tipo === 'danger' ? 5000 : 3000
      });
      bsToast.show();
    } catch (error) {
      console.error('Error showing toast:', error);
    }
  }

  updatePokemonCount() {
    if (this.elements.pokemonCount) {
      this.elements.pokemonCount.textContent = this.pokemonList.length;
    }
  }

  setButtonLoading(button, loading) {
    if (!button) return;
    if (loading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  ordenarPokemons() {
    if (this.pokemonList.length === 0) {
      this.mostrarToast('No hay Pokémon para ordenar', 'warning');
      return;
    }
    this.filteredList.sort((a, b) => a.name.localeCompare(b.name));
    this.renderPokemons();
    this.mostrarToast('Pokémon ordenados alfabéticamente');
  }

  async agregarPokemonAleatorio() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.setButtonLoading(this.elements.btnAgregar, true);
    this.mostrarToast('Buscando Pokémon aleatorio...', 'info');
    try {
      const randomId = Math.floor(Math.random() * 1010) + 1;
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const newPokemon = await response.json();
      const existe = this.pokemonList.find(p => p.id === newPokemon.id);
      if (existe) {
        this.mostrarToast(`${newPokemon.name} ya está en tu colección`, 'warning');
        return;
      }
      this.pokemonList.push(newPokemon);
      this.filteredList = [...this.pokemonList];
      this.renderPokemons();
      this.updatePokemonCount();
      this.mostrarToast(`🎉 ${newPokemon.name} agregado a tu colección`);
    } catch (error) {
      console.error('Error agregando Pokémon:', error);
      this.mostrarToast('Error al agregar Pokémon aleatorio. Intenta nuevamente.', 'danger');
    } finally {
      this.isLoading = false;
      this.setButtonLoading(this.elements.btnAgregar, false);
    }
  }

  eliminarUltimoPokemon() {
    if (this.pokemonList.length === 0) {
      this.mostrarToast('No hay Pokémon para eliminar', 'warning');
      return;
    }
    const eliminado = this.pokemonList.pop();
    this.filteredList = [...this.pokemonList];
    this.renderPokemons();
    this.updatePokemonCount();
    this.mostrarToast(`${eliminado.name} eliminado de tu colección`);
  }

  limpiarLista() {
    if (this.pokemonList.length === 0) {
      this.mostrarToast('La lista ya está vacía', 'warning');
      return;
    }
    if (confirm('¿Estás seguro de que quieres limpiar toda la lista? Esta acción no se puede deshacer.')) {
      const cantidadEliminada = this.pokemonList.length;
      this.pokemonList = [];
      this.filteredList = [];
      this.offset = 0;
      this.renderPokemons();
      this.updatePokemonCount();
      this.mostrarToast(`${cantidadEliminada} Pokémon eliminados exitosamente`);
    }
  }

  buscarPokemon(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (term === '') {
      this.filteredList = [...this.pokemonList];
    } else {
      this.filteredList = this.pokemonList.filter(pokemon => {
        const matchName = pokemon.name.toLowerCase().includes(term);
        const matchId = pokemon.id.toString().includes(term);
        const matchType = pokemon.types.some(type => type.type.name.toLowerCase().includes(term));
        const matchAbility = pokemon.abilities?.some(ability => ability.ability.name.toLowerCase().includes(term));
        return matchName || matchId || matchType || matchAbility;
      });
    }
    this.renderPokemons();
    if (term && this.filteredList.length > 0) {
      this.mostrarToast(`${this.filteredList.length} Pokémon encontrados`, 'info');
    }
  }

  cargarMasPokemons() {
    this.offset += this.limit;
    this.fetchPokemons();
  }

  handleError(error) {
    console.error('Error en la aplicación:', error);
    this.mostrarToast('Ha ocurrido un error inesperado', 'danger');
  }
}

// Theme Manager Class
class ThemeManager {
  constructor() {
    this.themeToggle = document.getElementById('theme-toggle');
    this.init();
  }

  init() {
    const savedTheme = this.getSavedTheme();
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
    this.bindEvents();
  }

  getSavedTheme() {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch (e) {
      return 'light';
    }
  }

  saveTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('No se pudo guardar el tema');
    }
  }

  bindEvents() {
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }

  toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    this.saveTheme(currentTheme);
    
    if (window.pokemonApp) {
      window.pokemonApp.mostrarToast(
        `Tema ${currentTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 
        'info'
      );
    }
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.pokemonApp = new PokemonApp();
    window.themeManager = new ThemeManager();
  } catch (error) {
    console.error('Error inicializando la aplicación:', error);
    const container = document.getElementById('pokemon-container');
    if (container) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <h4 class="text-danger">⚠️ Error de Inicialización</h4>
          <p>No se pudo inicializar la aplicación. Por favor, recarga la página.</p>
          <button class="btn btn-primary" onclick="location.reload()">Reintentar</button>
        </div>
      `;
    }
  }
});

window.addEventListener('error', (event) => {
  console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rechazada:', event.reason);
});