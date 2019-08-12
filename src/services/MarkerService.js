const Geohash = require('latlon-geohash');

import firebase from 'firebase/app';

import User from '../models/User.js';
import Scout from '../models/Scout.js';
import Goblin from '../models/Goblin.js';
import Item from '../models/Item.js';

export default class MarkerService {
    constructor() {
        this.uid = firebase.auth().currentUser.uid;
        this.db = firebase.database()
		this.hashes = [];
        this.positions = [];
        this.environmentPositions = [];
        this.listeners = [];

        this.markersRef = firebase.database().ref('markers');

        // TEMP: Should be removed when data is migrated.
        // this.rebuildMarkerDatabase();

        firebase.database().ref(`items`).child(this.uid).once('value').then(snap => {
            if (snap.val() == null || snap.val().sword == null) {
                firebase.database().ref(`items`).child(this.uid).set({
                    sword: {
                        name: "Wooden Sword",
                        slug: "sword",
                        amount: 1,
                    }
                })
            }

        });
    }

    // TEMP: Should be removed when data is migrated.
    rebuildMarkerDatabase() {
        this.markersRef.remove();

        firebase.database().ref(`users`).once('value').then(snap => {
            for (let id in snap.val()) {
                let hash = Geohash.encode(snap.val()[id].position.lat, snap.val()[id].position.lng, 7);
                firebase.database().ref('markers').child(hash).child(id).set({
                    position: snap.val()[id].position,
                    race: snap.val().race,
                    ref: `users/${id}`
                });
            }
        });

        firebase.database().ref(`scouts`).once('value').then(snap => {
            for (let id in snap.val()) {
                let hash = Geohash.encode(snap.val()[id].position.lat, snap.val()[id].position.lng, 7);
                firebase.database().ref('markers').child(hash).child(id).set({
                    position: snap.val()[id].position,
                    race: snap.val().race,
                    ref: `scouts/${id}`
                });
            }
        });

        firebase.database().ref(`loot`).on('child_added', (snap) => {
            let hash = Geohash.encode(snap.val().position.lat, snap.val().position.lng, 7);
            firebase.database().ref('markers').child(hash).child(snap.key).set({
                position: snap.val().position,
                race: 'loot',
                ref: `loot/${snap.key}`
            });
        });

        firebase.database().ref(`npc`).on('child_added', (snap) => {
            let hash = Geohash.encode(snap.val().position.lat, snap.val().position.lng, 7);
            firebase.database().ref('markers').child(hash).child(snap.key).set({
                position: snap.val().position,
                race: snap.val().race,
                ref: `npc/${snap.key}`
            });
        });
    }

    getUniqueHashes(id, position, precision) {
        const uniques = (a) => {
            let arr = {};
            for (let i in a) {
                arr[a[i]] = a[i]
            }
            return arr;
        }
        let hashes = [];

        this.positions[id] = position;
        for (let id in this.positions) {
            let hash = Geohash.encode(this.positions[id].lat, this.positions[id].lng, precision);
            let neighbours = Geohash.neighbours(hash);

            hashes.push(hash);
            for (let n in neighbours) {
                hashes.push(neighbours[n]);
            }
        }

        return uniques(hashes)
    }

    getUniqueEnvironmentHashes(id, position, precision) {
        const uniques = (a) => {
            let arr = {};
            for (let i in a) {
                arr[a[i]] = a[i]
            }
            return arr;
        }
        let hashes = [];

        this.environmentPositions[id] = position;
        for (let id in this.environmentPositions) {
            let hash = Geohash.encode(this.environmentPositions[id].lat, this.environmentPositions[id].lng, precision);
            let neighbours = Geohash.neighbours(hash);

            hashes.push(hash);
            for (let n in neighbours) {
                hashes.push(neighbours[n]);
            }
        }

        return uniques(hashes)
    }


    addHashListener(hash) {
        const isNotMine = key => {
            const HL = window.HL;
            const isNotMyUser = (HL.user.id !== key);
            const isNotMyScout = (HL.user.scout !== key);

            return (isNotMyUser && isNotMyScout);
        }

        this.listeners[hash] = [];

        // Add new listeners for this geohashes
        this.markersRef.child(hash).on('child_added', (snap) => isNotMine(snap.key)
            ? this.onMarkerAdded(snap.key, snap.val(), hash)
            : ''
        );
        this.markersRef.child(hash).on('child_removed', (snap) => isNotMine(snap.key)
            ? this.onMarkerRemoved(snap.key, hash)
            : ''
        );
    }

    removeHashListener(hash) {
        // Remove all markers for this geohash
        for (let id in this.listeners[hash]) {
            this.onMarkerRemoved(id, hash)
        }
        this.markersRef.child(hash).off();
        delete this.listeners[hash];
    }

    removeMarker(id) {
        const HL = window.HL;
        let hash = Geohash.encode(HL.markers[id].position.lat, HL.markers[id].position.lng, 7);
        this.markersRef.child(hash).child(id).remove();
    }

    // A marker is added to geohash
	onMarkerAdded(id, data, hash) {
        const HL = window.HL;
        if (typeof HL.markers[id] === 'undefined') {

            this.listeners[hash][id] = true;

            // Statically get all data for this marker once
            this.db.ref(data.ref).once('value').then((snap) => {
                const isOfTypeAndExists = (data, type) => {
                    if (snap.val() == null) this.markersRef.child(hash).child(id).remove();
                    return (data.ref.startsWith(type) && snap.val() !== null)
                }
                if (isOfTypeAndExists(data, 'users')) HL.markers[id] = new User(snap.key, snap.val());
                if (isOfTypeAndExists(data, 'scouts')) HL.markers[id] = new Scout(snap.key, snap.val());
                if (isOfTypeAndExists(data, 'loot')) HL.markers[id] = new Item(snap.key, snap.val());
                if (isOfTypeAndExists(data, 'npc')) HL.markers[id] = new Goblin(snap.key, snap.val());

                console.log('Marker is discovered: ', id, data);
            });
        }
	}

	// A marker is removed from geohash
	onMarkerRemoved(id, hash) {
        const HL = window.HL;
        if (typeof HL.markers[id] !== 'undefined') {
            HL.markers[id].remove();
            delete this.listeners[hash][id];
            console.log('Marker is removed: ', id);
        }
	}

}