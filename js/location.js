class LocationManager {
    constructor() {
        this.watchId = null;
        this.currentPosition = null;
        this.proximityRadius = 15; // meters
        this.eventListeners = {}; // Add event listener storage
    }

    async init() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser.');
        }
    }

    // Returns a Promise that resolves to {lat, lng}
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(this.currentPosition);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );
        });
    }

    // Add event handling methods
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach(callback => callback(data));
    }

    startTracking() {
        return new Promise((resolve, reject) => {
            this.watchId = navigator.geolocation.watchPosition(
                position => {
                    this.currentPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.emit('positionChanged', this.currentPosition);
                },
                error => {
                    console.error('Error getting location:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );
            resolve();
        });
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    calculateDistance(point1, point2) {
        // Haversine formula for calculating distance between two points
        const R = 6371e3; // Earth's radius in meters
        const φ1 = point1.lat * Math.PI/180;
        const φ2 = point2.lat * Math.PI/180;
        const Δφ = (point2.lat - point1.lat) * Math.PI/180;
        const Δλ = (point2.lng - point1.lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    isInProximity(targetPoint) {
        if (!this.currentPosition) return false;
        const distance = this.calculateDistance(this.currentPosition, targetPoint);
        return distance <= this.proximityRadius;
    }

    calculateBearing(targetPoint) {
        if (!this.currentPosition) return null;

        const φ1 = this.currentPosition.lat * Math.PI/180;
        const φ2 = targetPoint.lat * Math.PI/180;
        const λ1 = this.currentPosition.lng * Math.PI/180;
        const λ2 = targetPoint.lng * Math.PI/180;

        const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
        const θ = Math.atan2(y, x);
        
        return (θ * 180/Math.PI + 360) % 360; // In degrees
    }
}