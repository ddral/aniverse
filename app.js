// Constants
const ANILIST_API = 'https://graphql.anilist.co';
const MANGA_API = 'https://api.mangadex.org';

// State
let currentMode = 'anime';
let watchedItems = JSON.parse(localStorage.getItem('watchedItems')) || [];
let currentItem = null;
let mangaTagMap = {};

// DOM Elements
const modeButtons = document.querySelectorAll('.mode-btn');
const genreFilter = document.getElementById('genre-filter');
const statusFilter = document.getElementById('status-filter');
const randomBtn = document.getElementById('random-btn');
const watchedBtn = document.getElementById('watched-btn');
const watchedList = document.getElementById('watched-list');
const toggleWatchedBtn = document.getElementById('toggle-watched');
const loadingSpinner = document.querySelector('.loading-spinner');
const mediaContent = document.querySelector('.media-content');
const watchedCount = document.getElementById('watched-count');
const regionFilterWrapper = document.getElementById('region-filter-wrapper');
const formatFilter = document.getElementById('format-filter');
const formatFilterWrapper = document.getElementById('format-filter-wrapper');

// Event Listeners
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        updateGenreFilter();
        clearCurrentItem();
        // Show/hide region and format filters based on mode
        if (currentMode === 'anime') {
            regionFilterWrapper.classList.remove('hidden');
            formatFilterWrapper.classList.remove('hidden-for-manga');
        } else if (currentMode === 'manga') {
            regionFilterWrapper.classList.remove('hidden'); // Show region filter for manga
            formatFilterWrapper.classList.add('hidden-for-manga');
        }
    });
});

randomBtn.addEventListener('click', getRandomItem);
watchedBtn.addEventListener('click', toggleWatched);
toggleWatchedBtn.addEventListener('click', toggleWatchedList);
genreFilter.addEventListener('change', getRandomItem);
statusFilter.addEventListener('change', getRandomItem);
formatFilter.addEventListener('change', getRandomItem);

// Initialize
updateGenreFilter();
loadWatchedItems();

// Functions
function toggleWatchedList() {
    watchedList.classList.toggle('expanded');
    toggleWatchedBtn.classList.toggle('active');
}

async function updateGenreFilter() {
    try {
        const genres = currentMode === 'anime' 
            ? await fetchAnimeGenres()
            : await fetchMangaGenres();
        
        genreFilter.innerHTML = '<option value="">Surprise me!</option>';
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error updating genre filter:', error);
    }
}

async function fetchAnimeGenres() {
    const query = `
        query {
            GenreCollection
        }
    `;
    
    try {
        console.log('Fetching anime genres...');
        const response = await fetch(ANILIST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Anime genres fetched successfully:', data.data.GenreCollection);
        return data.data.GenreCollection;
    } catch (error) {
        console.error('Error fetching anime genres:', error);
        return [];
    }
}

async function fetchMangaGenres() {
    try {
        console.log('Fetching manga genres...');
        const response = await fetch(`${MANGA_API}/manga/tag`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Manga genres fetched successfully:', data.data);
        // Build mapping from name to id
        mangaTagMap = {};
        data.data.forEach(tag => {
            mangaTagMap[tag.attributes.name.en] = tag.id;
        });
        return data.data.map(tag => tag.attributes.name.en);
    } catch (error) {
        console.error('Error fetching manga genres:', error);
        return [];
    }
}

async function getRandomItem() {
    showLoading();
    
    try {
        console.log('Getting random item...', { mode: currentMode });
        if (currentMode === 'anime') {
            currentItem = await getRandomAnime();
        } else {
            currentItem = await getRandomManga();
        }
        
        if (!currentItem) {
            throw new Error('No items found with the selected filters');
        }
        
        // Check if the item is already watched
        const isWatched = watchedItems.some(item => 
            item.id === currentItem.id && item.mode === currentMode
        );
        
        if (isWatched) {
            console.log('Item already watched, getting another one...');
            return getRandomItem();
        }
        
        console.log('Random item fetched successfully:', currentItem);
        displayItem(currentItem);
    } catch (error) {
        console.error('Error fetching random item:', error);
        alert(`Failed to fetch random item: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function getRandomAnime() {
    const genre = genreFilter.value;
    const status = statusFilter.value;
    const format = formatFilter.value;
    const region = document.getElementById('region-filter').value;
    console.log('Fetching random anime with filters:', { genre, status, format, region });
    // Build query parts
    let filterFields = '';
    let variables = {
        page: 1,
        perPage: 50
    };
    if (genre) {
        filterFields += 'genre: $genre, ';
        variables.genre = genre;
    }
    if (status) {
        filterFields += 'status: $status, ';
        variables.status = status;
    }
    if (format) {
        filterFields += 'format: $format, ';
        variables.format = format;
    }
    if (region) {
        filterFields += 'countryOfOrigin: $countryOfOrigin, ';
        variables.countryOfOrigin = region;
    }
    let query = `
        query ($page: Int, $perPage: Int${genre ? ', $genre: String' : ''}${status ? ', $status: MediaStatus' : ''}${format ? ', $format: MediaFormat' : ''}${region ? ', $countryOfOrigin: CountryCode' : ''}) {
            Page(page: $page, perPage: $perPage) {
                media(
                    type: ANIME,
                    sort: POPULARITY_DESC,
                    ${filterFields}
                ) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    coverImage {
                        large
                    }
                    genres
                    averageScore
                    status
                    format
                    startDate {
                        year
                    }
                    countryOfOrigin
                }
            }
        }
    `;
    try {
        console.log('Sending query with variables:', { query, variables });
        const response = await fetch(ANILIST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Anime API response:', data);
        if (!data.data || !data.data.Page || !data.data.Page.media) {
            throw new Error('Invalid response format from AniList API');
        }
        const items = data.data.Page.media;
        console.log(`API returned ${items ? items.length : 0} items for selected filters:`, { genre, status, format, region });
        if (!items || items.length === 0) {
            // If no results with filters, try without filters
            if (genre || status || format || region) {
                console.log('No results with filters, trying without filters...');
                return getRandomAnimeWithoutFilters();
            }
            throw new Error('No anime found');
        }
        return items[Math.floor(Math.random() * items.length)];
    } catch (error) {
        console.error('Error fetching random anime:', error);
        throw error;
    }
}

async function getRandomAnimeWithoutFilters() {
    const query = `
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(type: ANIME, sort: POPULARITY_DESC) {
                    id
                    title {
                        romaji
                        english
                    }
                    description
                    coverImage {
                        large
                    }
                    genres
                    averageScore
                    status
                }
            }
        }
    `;
    
    const variables = {
        page: 1,
        perPage: 50
    };
    
    try {
        const response = await fetch(ANILIST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const items = data.data.Page.media;
        
        if (!items || items.length === 0) {
            throw new Error('No anime found');
        }
        
        return items[Math.floor(Math.random() * items.length)];
    } catch (error) {
        console.error('Error fetching random anime without filters:', error);
        throw error;
    }
}

async function getRandomManga() {
    const genre = genreFilter.value;
    const status = statusFilter.value;
    const region = document.getElementById('region-filter').value;
    console.log('Fetching random manga with filters:', { genre, status, region });
    // Map AniList status to MangaDex status for client-side filtering
    const statusMap = {
        'RELEASING': 'ongoing',
        'FINISHED': 'completed',
        'HIATUS': 'hiatus'
    };
    try {
        // First, get the total count of manga (still needed for offset calculation)
        const countResponse = await fetch(`${MANGA_API}/manga?limit=1`);
        if (!countResponse.ok) {
            throw new Error(`HTTP error! status: ${countResponse.status}`);
        }
        const countData = await countResponse.json();
        console.log('Manga count response:', countData);
        if (!countData.total) {
            throw new Error('Could not get total manga count');
        }
        const totalManga = countData.total;
        const randomOffset = Math.floor(Math.random() * Math.min(totalManga, 1000));
        // Build params for initial fetch (without region or status)
        const params = new URLSearchParams({
            limit: 100,
            offset: randomOffset
        });
        params.append('includes[]', 'cover_art');
        params.append('includes[]', 'author');
        params.append('includes[]', 'artist');
        params.append('contentRating[]', 'safe');
        if (genre && mangaTagMap[genre]) {
            params.append('includedTags[]', mangaTagMap[genre]);
        }
        const fetchUrl = `${MANGA_API}/manga?${params}`;
        console.log('Fetching manga from URL (without region or status filters):', fetchUrl);
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            alert('Failed to fetch random manga. Please try again.');
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Manga API response:', data);
        if (!data.data || !Array.isArray(data.data)) {
             alert('No manga found for the selected filters.');
             throw new Error('Invalid response format from MangaDex API');
        }
        let items = data.data;
        console.log(`API returned ${items ? items.length : 0} items for selected filters:`, { genre });
        // Client-side filtering by status if selected
        if (status && statusMap[status]) {
             const targetStatus = statusMap[status];
             items = items.filter(item => item.attributes.status === targetStatus);
             console.log(`Client-side filtered down to ${items.length} items for status: ${status}`);
        }
        // Client-side filtering by region if selected
        if (region) {
            const langMap = { JP: 'ja', KR: 'ko', CN: 'zh' };
            const targetLang = langMap[region];
            if (targetLang) {
                items = items.filter(item => item.attributes.originalLanguage === targetLang);
                console.log(`Client-side filtered down to ${items.length} items for region: ${region}`);
            }
        }
        if (!items || items.length === 0) {
            alert('No manga found for the selected filters.');
            throw new Error('No manga found after filtering');
        }
        return items[Math.floor(Math.random() * items.length)];
    } catch (error) {
        console.error('Error fetching random manga:', error);
        alert('An error occurred while fetching manga. Please try again.');
        throw error;
    }
}

function displayItem(item) {
    if (!item) return;
    const title = currentMode === 'anime' 
        ? item.title.english || item.title.romaji
        : item.attributes.title.en;
    const originalTitle = currentMode === 'anime'
        ? item.title.native
        : item.attributes.title[item.attributes.originalLanguage] || null;
    const description = currentMode === 'anime'
        ? item.description
        : item.attributes.description.en;
    const coverImage = currentMode === 'anime'
        ? item.coverImage.large
        : item.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName;

    // Update title and original title
    document.getElementById('title').textContent = title;
    const originalTitleElement = document.getElementById('original-title');
    if (originalTitle && originalTitle !== title) {
        originalTitleElement.textContent = originalTitle;
        originalTitleElement.style.display = 'block';
    } else {
        originalTitleElement.style.display = 'none';
    }

    document.getElementById('description').innerHTML = description || 'No description available';
    document.getElementById('cover-image').src = currentMode === 'anime' 
        ? coverImage 
        : `https://uploads.mangadex.org/covers/${item.id}/${coverImage}`;
    const tagsContainer = document.getElementById('tags');
    tagsContainer.innerHTML = '';
    const genres = currentMode === 'anime' 
        ? item.genres 
        : item.attributes.tags.map(tag => tag.attributes.name.en);
    genres.forEach(genre => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = genre;
        tagsContainer.appendChild(tag);
    });
    
    // Update rating and status
    const ratingElement = document.getElementById('rating');
    const statusElement = document.getElementById('status').querySelector('span');
    const statusIcon = document.getElementById('status').querySelector('i');

    if (currentMode === 'anime') {
        ratingElement.style.display = 'flex';
        ratingElement.querySelector('span').textContent = (item.averageScore / 10).toFixed(1);
        statusElement.textContent = item.status;
        statusIcon.className = 'fas fa-circle';
        statusIcon.style.color = '#5cb85c'; // Default green
    } else {
        // Hide rating for manga
        ratingElement.style.display = 'none';
        
        // Manga status with colored dots
        const status = item.attributes.status;
        statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        statusIcon.className = 'fas fa-circle';
        
        // Set color based on status
        switch(status) {
            case 'ongoing':
                statusIcon.style.color = '#ffc107'; // Yellow
                break;
            case 'completed':
                statusIcon.style.color = '#5cb85c'; // Green
                break;
            case 'cancelled':
                statusIcon.style.color = '#dc3545'; // Red
                break;
            case 'hiatus':
                statusIcon.style.color = '#6c757d'; // Gray
                break;
            default:
                statusIcon.style.color = '#5cb85c'; // Default green
        }
    }

    // Add extra info based on mode
    let extraInfo = '';
    if (currentMode === 'anime') {
        let year = 'Unknown';
        if (item.startDate && typeof item.startDate.year === 'number' && item.startDate.year > 1900) {
            year = item.startDate.year;
        }
        let format = 'Unknown';
        if (item.format) {
            format = item.format === 'TV' ? 'TV Series' : (item.format === 'MOVIE' ? 'Movie' : item.format.replace('_', ' '));
        }
        let country = 'Unknown';
        if (item.countryOfOrigin && typeof item.countryOfOrigin === 'string' && item.countryOfOrigin.length === 2) {
            country = item.countryOfOrigin;
        }
        extraInfo = `<div class="extra-info">
            <span title="Year"><strong>Year:</strong> ${year}</span>
            <span title="Format"><strong>Format:</strong> ${format}</span>
            <span title="Country"><strong>Country:</strong> ${country}</span>
        </div>`;
    } else {
        // Manga extra info
        const authors = item.relationships
            .filter(r => r.type === 'author')
            .map(r => r.attributes?.name || 'Unknown')
            .join(', ');
        
        const artists = item.relationships
            .filter(r => r.type === 'artist')
            .map(r => r.attributes?.name || 'Unknown')
            .join(', ');

        const year = item.attributes.year || 'Unknown';
        const contentRating = item.attributes.contentRating.charAt(0).toUpperCase() + item.attributes.contentRating.slice(1);
        
        // Map language codes to country codes
        const languageToCountry = {
            'ja': 'JP',
            'ko': 'KR',
            'zh': 'CN'
        };
        const country = languageToCountry[item.attributes.originalLanguage] || 'Unknown';

        extraInfo = `<div class="extra-info">
            <span title="Author"><strong>Author:</strong> ${authors || 'Unknown'}</span>
            <span title="Artist"><strong>Artist:</strong> ${artists || 'Unknown'}</span>
            <span title="Year"><strong>Year:</strong> ${year}</span>
            <span title="Country"><strong>Country:</strong> ${country}</span>
            <span title="Content Rating"><strong>Rating:</strong> ${contentRating}</span>
        </div>`;
    }

    // Remove any existing extra-info div
    const oldExtra = document.querySelector('.extra-info');
    if (oldExtra) oldExtra.remove();
    // Insert extra info below the tags
    if (extraInfo) tagsContainer.insertAdjacentHTML('afterend', extraInfo);
    mediaContent.classList.remove('hidden');
    updateWatchedButton();
}

function toggleWatched() {
    if (!currentItem) return;
    
    const itemId = currentMode === 'anime' 
        ? currentItem.id 
        : currentItem.id;
    
    const isWatched = watchedItems.some(item => 
        item.id === itemId && item.mode === currentMode
    );
    
    if (isWatched) {
        watchedItems = watchedItems.filter(item => 
            !(item.id === itemId && item.mode === currentMode)
        );
    } else {
        watchedItems.push({
            id: itemId,
            mode: currentMode,
            title: currentMode === 'anime' 
                ? currentItem.title.english || currentItem.title.romaji
                : currentItem.attributes.title.en,
            coverImage: currentMode === 'anime'
                ? currentItem.coverImage.large
                : currentItem.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName,
            dateAdded: new Date().toISOString()
        });
    }
    
    localStorage.setItem('watchedItems', JSON.stringify(watchedItems));
    updateWatchedButton();
    loadWatchedItems();
    getRandomItem(); // Get a new random item after marking as watched
}

function updateWatchedButton() {
    if (!currentItem) return;
    const itemId = currentMode === 'anime' 
        ? currentItem.id 
        : currentItem.id;
    const isWatched = watchedItems.some(item => 
        item.id === itemId && item.mode === currentMode
    );
    if (currentMode === 'anime') {
        watchedBtn.innerHTML = isWatched
            ? '<i class="fas fa-check-circle"></i> Remove from Watched'
            : '<i class="far fa-check-circle"></i> Add to my Watched list!';
    } else {
        watchedBtn.innerHTML = isWatched
            ? '<i class="fas fa-book-reader"></i> Remove from Read'
            : '<i class="far fa-book-reader"></i> Add to my Read list!';
    }
}

function loadWatchedItems() {
    watchedList.innerHTML = '';
    if (watchedCount) watchedCount.textContent = watchedItems.length;
    
    // Sort watched items by date added (newest first)
    const sortedItems = [...watchedItems].sort((a, b) => 
        new Date(b.dateAdded) - new Date(a.dateAdded)
    );
    
    sortedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'watched-item';
        
        const coverImage = item.mode === 'anime'
            ? item.coverImage
            : `https://uploads.mangadex.org/covers/${item.id}/${item.coverImage}`;
        
        card.innerHTML = `
            <img src="${coverImage}" alt="${item.title}">
            <div class="item-info">
                <h3>${item.title}</h3>
                <p>${item.mode.charAt(0).toUpperCase() + item.mode.slice(1)}</p>
                <p class="date-added">Added: ${new Date(item.dateAdded).toLocaleDateString()}</p>
            </div>
            <button class="remove-btn" title="Remove from watched list">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add click handler for the remove button
        const removeBtn = card.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            watchedItems = watchedItems.filter(watched => 
                !(watched.id === item.id && watched.mode === item.mode)
            );
            localStorage.setItem('watchedItems', JSON.stringify(watchedItems));
            loadWatchedItems();
        });
        
        watchedList.appendChild(card);
    });
}

function showLoading() {
    loadingSpinner.classList.remove('hidden');
    mediaContent.classList.add('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function clearCurrentItem() {
    currentItem = null;
    mediaContent.classList.add('hidden');
    if (currentMode === 'anime') {
        watchedBtn.innerHTML = '<i class="far fa-check-circle"></i> Add to my Watched list!';
    } else {
        watchedBtn.innerHTML = '<i class="far fa-book-reader"></i> Add to my Read list!';
    }
}

// On page load, also set watched count
if (watchedCount) watchedCount.textContent = watchedItems.length;

function updateMediaContent(data) {
    const titleElement = document.getElementById('title');
    const originalTitleElement = document.getElementById('original-title');
    const descriptionElement = document.getElementById('description');
    const coverImageElement = document.getElementById('cover-image');
    const tagsElement = document.getElementById('tags');
    const ratingElement = document.getElementById('rating').querySelector('span');
    const statusElement = document.getElementById('status').querySelector('span');

    titleElement.textContent = data.title || 'Title not available';
    if (data.originalTitle) {
        originalTitleElement.textContent = data.originalTitle;
        originalTitleElement.style.display = 'block';
    } else {
        originalTitleElement.style.display = 'none';
    }
    descriptionElement.textContent = data.description || 'Description not available';
    coverImageElement.src = data.coverImage || 'default-cover.jpg';
    coverImageElement.alt = data.title || 'Cover Image';

    // Clear existing tags
    tagsElement.innerHTML = '';
    if (data.tags && data.tags.length > 0) {
        data.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            tagsElement.appendChild(tagElement);
        });
    }

    ratingElement.textContent = data.rating || '0';
    statusElement.textContent = data.status || 'Unknown';
} 