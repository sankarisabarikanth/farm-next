// Farm Next Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('veg-search');
    const sortSelect = document.getElementById('veg-sort');
    const grid = document.getElementById('vegetables-grid');
    const noResults = document.getElementById('no-results');
    
    // We only execute this on the dashboard where these elements exist
    if (!grid || !searchInput || !sortSelect) return;
    
    // Grab all cards (the grid links)
    const cards = Array.from(grid.getElementsByClassName('veg-card-link'));
    
    // Search Filtering Function
    const filterVegetables = () => {
        const query = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;
        
        cards.forEach(card => {
            const name = card.getAttribute('data-name');
            const tamil = card.getAttribute('data-tamil');
            
            // Match English name or Tamil name
            if (name.includes(query) || tamil.includes(query)) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });
        
        // Toggle empty search card state
        if (visibleCount === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    };
    
    // Sorting Function
    const sortVegetables = () => {
        const val = sortSelect.value;
        
        // Sorting comparator
        cards.sort((a, b) => {
            if (val === 'name-asc') {
                return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
            } else if (val === 'name-desc') {
                return b.getAttribute('data-name').localeCompare(a.getAttribute('data-name'));
            } else if (val === 'wholesale-asc') {
                return parseFloat(a.getAttribute('data-wholesale')) - parseFloat(b.getAttribute('data-wholesale'));
            } else if (val === 'wholesale-desc') {
                return parseFloat(b.getAttribute('data-wholesale')) - parseFloat(a.getAttribute('data-wholesale'));
            } else if (val === 'retail-desc') {
                return parseFloat(b.getAttribute('data-retail')) - parseFloat(a.getAttribute('data-retail'));
            }
            return 0;
        });
        
        // Re-append sorted cards in order
        cards.forEach(card => grid.appendChild(card));
    };
    
    // Event listeners
    searchInput.addEventListener('input', filterVegetables);
    sortSelect.addEventListener('change', sortVegetables);
});
