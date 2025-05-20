class AudioManager {
    constructor() {
        // Background music
        this.backgroundMusic = document.getElementById('background-music');
        this.backgroundMusic.volume = 0.5;
        
        // Sound effects with error handling
        this.sounds = {
            click: this.createSound('sound/click.mp3', 0.3),
            hover: this.createSound('sound/hover.mp3', 0.2),
            generated: this.createSound('sound/generated.mp3', 0.4)
        };
        
        this.musicMuted = true;
        this.effectsMuted = false; // Unmuted by default
        this.setupEventListeners();
    }

    createSound(src, volume) {
        const sound = new Audio(src);
        sound.volume = volume;
        sound.addEventListener('error', (e) => {
            console.warn(`Failed to load sound: ${src}`, e);
        });
        return sound;
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
                this.playSound(this.sounds.click);
            }
        });

        // Add click/hover sound to all buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                // Don't play click sound for the effects toggle itself
                if (button !== effectsToggle) this.playSound(this.sounds.click);
            });
            button.addEventListener('mouseenter', () => this.playSound(this.sounds.hover));
        });

        // Add sound effects to all select (dropdown) elements
        document.querySelectorAll('select').forEach(select => {
            select.addEventListener('focus', () => this.playSound(this.sounds.hover));
            select.addEventListener('change', () => this.playSound(this.sounds.click));
        });

        // Ensure watched list toggle button has sound effects
        const watchedToggle = document.getElementById('toggle-watched');
        if (watchedToggle) {
            watchedToggle.addEventListener('click', () => this.playSound(this.sounds.click));
            watchedToggle.addEventListener('mouseenter', () => this.playSound(this.sounds.hover));
        }

        // Add generated sound to random button
        const randomBtn = document.getElementById('random-btn');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => this.playSound(this.sounds.generated));
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
        if (!this.effectsMuted && sound) {
            try {
                sound.currentTime = 0;
                const playPromise = sound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('Sound effect playback prevented:', error);
                    });
                }
            } catch (error) {
                console.warn('Error playing sound:', error);
            }
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