class AudioManager {
    constructor() {
        // Background music
        this.backgroundMusic = document.getElementById('background-music');
        this.backgroundMusic.volume = 0.5;
        
        // Sound effects
        this.clickSound = new Audio('sound/click.mp3');
        this.hoverSound = new Audio('sound/hover.mp3');
        this.generatedSound = new Audio('sound/generated.mp3');
        
        // Set volumes for sound effects
        this.clickSound.volume = 0.3;
        this.hoverSound.volume = 0.2;
        this.generatedSound.volume = 0.4;
        
        this.musicMuted = true;
        this.effectsMuted = false; // Unmuted by default
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Sound/music toggle button
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.addEventListener('click', async () => {
            this.musicMuted = !this.musicMuted;
            this.backgroundMusic.muted = this.musicMuted;
            // Update the icon
            const icon = soundToggle.querySelector('i');
            if (this.musicMuted) {
                icon.className = 'fas fa-volume-mute';
            } else {
                icon.className = 'fas fa-volume-up';
                try {
                    await this.backgroundMusic.play();
                } catch (error) {
                    console.log('Playback prevented:', error);
                }
            }
        });

        // Sound effects toggle button
        const effectsToggle = document.getElementById('effects-toggle');
        // Set initial icon for effects toggle
        const effectsIcon = effectsToggle.querySelector('i');
        effectsIcon.className = this.effectsMuted ? 'fas fa-bell-slash' : 'fas fa-bell';
        effectsToggle.addEventListener('click', () => {
            this.effectsMuted = !this.effectsMuted;
            // Update the icon
            const icon = effectsToggle.querySelector('i');
            if (this.effectsMuted) {
                icon.className = 'fas fa-bell-slash';
            } else {
                icon.className = 'fas fa-bell';
                // Play a sound to confirm
                this.playSound(this.clickSound);
            }
        });

        // Add click/hover sound to all buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                // Don't play click sound for the effects toggle itself
                if (button !== effectsToggle) this.playSound(this.clickSound);
            });
            button.addEventListener('mouseenter', () => this.playSound(this.hoverSound));
        });

        // Add sound effects to all select (dropdown) elements
        document.querySelectorAll('select').forEach(select => {
            select.addEventListener('focus', () => this.playSound(this.hoverSound));
            select.addEventListener('change', () => this.playSound(this.clickSound));
        });

        // Ensure watched list toggle button has sound effects
        const watchedToggle = document.getElementById('toggle-watched');
        if (watchedToggle) {
            watchedToggle.addEventListener('click', () => this.playSound(this.clickSound));
            watchedToggle.addEventListener('mouseenter', () => this.playSound(this.hoverSound));
        }

        // Add generated sound to random button
        const randomBtn = document.getElementById('random-btn');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => this.playSound(this.generatedSound));
        }

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.backgroundMusic.pause();
            } else {
                this.backgroundMusic.play().catch(error => {
                    console.log('Playback prevented:', error);
                });
            }
        });

        // Handle window blur/focus
        window.addEventListener('blur', () => {
            this.backgroundMusic.pause();
        });

        window.addEventListener('focus', () => {
            this.backgroundMusic.play().catch(error => {
                console.log('Playback prevented:', error);
            });
        });
    }

    playSound(sound) {
        if (!this.effectsMuted) {
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.log('Sound effect playback prevented:', error);
            });
        }
    }
}

// Initialize audio manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Start playing background music (muted)
    const audioManager = new AudioManager();
    audioManager.backgroundMusic.play().catch(error => {
        console.log('Autoplay prevented:', error);
    });
}); 