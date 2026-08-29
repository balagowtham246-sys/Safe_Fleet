import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp
} from './firebase';
import { INITIAL_VEHICLES, INITIAL_DRIVERS, INITIAL_SAFETY_EVENTS } from '../data/fleetData';
import { Vehicle, Driver, SafetyEvent, UserProfile } from '../types';

// Collection references
export const USERS_COLLECTION = 'users';
export const VEHICLES_COLLECTION = 'vehicles';
export const DRIVERS_COLLECTION = 'drivers';
export const INCIDENTS_COLLECTION = 'incidents';

/**
 * Deeply removes undefined keys and sanitizes values for Firestore compatibility.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as any;
  }
  return data;
}

/**
 * Fetches a user profile document from Firestore by authenticated UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
    return null;
  }
}

/**
 * Persists or updates a driver record document in Firestore with sanitization.
 */
export async function saveDriverRecord(driver: Driver): Promise<void> {
  try {
    const docRef = doc(db, DRIVERS_COLLECTION, driver.id);
    const clean = sanitizeForFirestore(driver);
    await setDoc(docRef, clean, { merge: true });
  } catch (error) {
    console.error('Error saving driver record to Firestore:', error);
    throw error;
  }
}

/**
 * Ensures a driver document exists in drivers/{driverId} for authenticated driver profiles.
 */
export async function ensureDriverRecordExists(profile: UserProfile): Promise<void> {
  if (profile.role !== 'driver' || !profile.driverId) return;
  try {
    const docRef = doc(db, DRIVERS_COLLECTION, profile.driverId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const driverRecord: Driver = {
        id: profile.driverId,
        driverId: profile.driverId,
        uid: profile.uid,
        name: profile.name,
        email: profile.email || '',
        phone: profile.phone || '+919842188412',
        role: 'driver',
        licenseNumber: `DL-${Math.floor(100000 + Math.random() * 900000)}`,
        assignedVehicleId: undefined,
        assignedVehicleReg: undefined,
        safetyScore: 85,
        riskLevel: 'SAFE',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        experienceYears: 2,
        totalTrips: 0,
        incidentCount: 0,
        trendPercentage: 0,
        trendDirection: 'stable',
        breakdown: { speeding: 0, drowsiness: 0, distraction: 0, harshBraking: 0 },
        recentEvents: ['Driver record synchronized on SafeFleet AI'],
      };
      await saveDriverRecord(driverRecord);
    }
  } catch (err) {
    console.error('Error ensuring driver record exists in Firestore:', err);
  }
}

/**
 * Persists or updates a user profile document in Firestore.
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, profile.uid);
    const clean = sanitizeForFirestore({
      ...profile,
      createdAt: profile.createdAt || new Date().toISOString(),
    });
    await setDoc(docRef, clean, { merge: true });
  } catch (error) {
    console.error('Error saving user profile to Firestore:', error);
    throw error;
  }
}

/**
 * Initializes Firestore collections with default fleet data if not already populated.
 */
export async function initializeFleetCollections(): Promise<void> {
  try {
    const vehiclesSnap = await getDocs(collection(db, VEHICLES_COLLECTION));
    if (vehiclesSnap.empty) {
      console.log('Seeding initial vehicles to Firestore...');
      for (const vehicle of INITIAL_VEHICLES) {
        await setDoc(doc(db, VEHICLES_COLLECTION, vehicle.id), sanitizeForFirestore(vehicle));
      }
    }

    const driversSnap = await getDocs(collection(db, DRIVERS_COLLECTION));
    if (driversSnap.empty) {
      console.log('Seeding initial drivers to Firestore...');
      for (const driver of INITIAL_DRIVERS) {
        await setDoc(doc(db, DRIVERS_COLLECTION, driver.id), sanitizeForFirestore(driver));
      }
    }

    const incidentsSnap = await getDocs(collection(db, INCIDENTS_COLLECTION));
    if (incidentsSnap.empty) {
      console.log('Seeding initial safety events to Firestore...');
      for (const event of INITIAL_SAFETY_EVENTS) {
        await setDoc(doc(db, INCIDENTS_COLLECTION, event.id), sanitizeForFirestore(event));
      }
    }
  } catch (error) {
    console.error('Error initializing Firestore fleet collections:', error);
  }
}

/**
 * Subscribes to real-time updates for fleet vehicles from Firestore.
 */
export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
  const q = collection(db, VEHICLES_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const vehicles = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as Partial<Vehicle>;
          const defaultRef = INITIAL_VEHICLES.find((v) => v.id === docSnap.id || v.registrationNumber === raw.registrationNumber) || INITIAL_VEHICLES[0];
          return {
            ...defaultRef,
            ...raw,
            id: raw.id || docSnap.id || defaultRef.id,
            driverId: raw.driverId || defaultRef.driverId || 'DRV-8021',
            driverName: raw.driverName || defaultRef.driverName || 'Arun Kumar',
            registrationNumber: raw.registrationNumber || defaultRef.registrationNumber || 'TN38XX1234',
          } as Vehicle;
        });
        callback(vehicles);
      } else {
        callback(INITIAL_VEHICLES);
      }
    },
    (error) => {
      console.error('Firestore vehicles subscription error:', error);
      callback(INITIAL_VEHICLES);
    }
  );
}

export async function generateUniqueDriverId(): Promise<string> {
  try {
    const driversSnap = await getDocs(collection(db, DRIVERS_COLLECTION));
    const existingIds = new Set<string>();
    INITIAL_DRIVERS.forEach((d) => existingIds.add(d.id));
    driversSnap.docs.forEach((docSnap) => existingIds.add(docSnap.id));

    let maxNum = 8022;
    for (const id of existingIds) {
      if (id.startsWith('DRV-')) {
        const numStr = id.replace('DRV-', '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    let nextNum = maxNum + 1;
    let candidate = `DRV-${nextNum}`;
    while (existingIds.has(candidate)) {
      nextNum++;
      candidate = `DRV-${nextNum}`;
    }
    return candidate;
  } catch (err) {
    console.error('Error generating unique driver ID:', err);
    return `DRV-${Math.floor(8030 + Math.random() * 1000)}`;
  }
}

/**
 * Subscribes to real-time updates for fleet drivers from Firestore (Manager scope).
 */
export function subscribeToDrivers(callback: (drivers: Driver[]) => void) {
  const q = collection(db, DRIVERS_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const drivers = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as Partial<Driver>;
          const defaultRef = INITIAL_DRIVERS.find((d) => d.id === docSnap.id) || {
            id: docSnap.id,
            name: raw.name || 'Driver',
            phone: raw.phone || '+919842188412',
            licenseNumber: raw.licenseNumber || 'DL-999999',
            assignedVehicleId: raw.assignedVehicleId,
            assignedVehicleReg: raw.assignedVehicleReg,
            safetyScore: raw.safetyScore ?? 85,
            riskLevel: raw.riskLevel || 'SAFE',
            avatar: raw.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            experienceYears: raw.experienceYears || 2,
            totalTrips: raw.totalTrips || 0,
            incidentCount: raw.incidentCount || 0,
            trendPercentage: raw.trendPercentage || 0,
            trendDirection: raw.trendDirection || 'stable',
            breakdown: raw.breakdown || { speeding: 0, drowsiness: 0, distraction: 0, harshBraking: 0 },
            recentEvents: raw.recentEvents || [],
          };
          return {
            ...defaultRef,
            ...raw,
            id: raw.id || docSnap.id || defaultRef.id,
          } as Driver;
        });
        callback(drivers);
      } else {
        callback(INITIAL_DRIVERS);
      }
    },
    (error) => {
      console.error('Firestore drivers subscription error:', error);
      callback(INITIAL_DRIVERS);
    }
  );
}

/**
 * Subscribes to a specific driver's record in real-time (Driver scope).
 */
export function subscribeToDriverRecord(driverId: string, callback: (driver: Driver | null) => void) {
  const docRef = doc(db, DRIVERS_COLLECTION, driverId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const raw = docSnap.data() as Partial<Driver>;
        const defaultRef = INITIAL_DRIVERS.find((d) => d.id === driverId) || INITIAL_DRIVERS[0];
        callback({
          ...defaultRef,
          ...raw,
          id: driverId,
        } as Driver);
      } else {
        const defaultRef = INITIAL_DRIVERS.find((d) => d.id === driverId) || null;
        callback(defaultRef);
      }
    },
    (error) => {
      console.error(`Firestore single driver subscription error for ${driverId}:`, error);
      const defaultRef = INITIAL_DRIVERS.find((d) => d.id === driverId) || null;
      callback(defaultRef);
    }
  );
}

/**
 * Subscribes to real-time safety events & incidents from Firestore (Fleet-wide Manager scope).
 */
export function subscribeToIncidents(callback: (events: SafetyEvent[]) => void) {
  const q = query(collection(db, INCIDENTS_COLLECTION), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const events = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as Partial<SafetyEvent>;
          return {
            id: raw.id || docSnap.id,
            driverId: raw.driverId || 'DRV-8021',
            driverName: raw.driverName || 'Arun Kumar',
            vehicleId: raw.vehicleId || 'VEH-101',
            vehicleReg: raw.vehicleReg || 'TN38XX1234',
            severity: raw.severity || 'MEDIUM',
            timestamp: raw.timestamp || 'Just now',
            location: raw.location || 'Highway Corridor',
            description: raw.description || 'Safety incident',
            actionTaken: raw.actionTaken || 'Advisory issued',
            factors: raw.factors || [],
            riskScore: raw.riskScore ?? 50,
          } as SafetyEvent;
        });
        callback(events);
      } else {
        callback(INITIAL_SAFETY_EVENTS);
      }
    },
    (error) => {
      console.error('Firestore incidents subscription error:', error);
      callback(INITIAL_SAFETY_EVENTS);
    }
  );
}

/**
 * Subscribes to real-time safety events & incidents strictly belonging to a specific driver (Driver scope).
 */
export function subscribeToDriverIncidents(driverId: string, callback: (events: SafetyEvent[]) => void) {
  const q = query(
    collection(db, INCIDENTS_COLLECTION),
    where('driverId', '==', driverId),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const events = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as Partial<SafetyEvent>;
          return {
            id: raw.id || docSnap.id,
            driverId: raw.driverId || driverId,
            driverName: raw.driverName || 'Driver',
            vehicleId: raw.vehicleId || 'VEH-101',
            vehicleReg: raw.vehicleReg || 'TN38XX1234',
            severity: raw.severity || 'MEDIUM',
            timestamp: raw.timestamp || 'Just now',
            location: raw.location || 'Highway Corridor',
            description: raw.description || 'Safety incident',
            actionTaken: raw.actionTaken || 'Advisory issued',
            factors: raw.factors || [],
            riskScore: raw.riskScore ?? 50,
          } as SafetyEvent;
        });
        callback(events);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error(`Firestore driver incidents subscription error for ${driverId}:`, error);
      callback([]);
    }
  );
}

/**
 * Logs a new safety incident to Firestore with strict data sanitization.
 */
export async function logSafetyIncidentToFirestore(event: SafetyEvent): Promise<void> {
  try {
    const sanitizedEvent: SafetyEvent = {
      id: event.id || `EVT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      driverId: event.driverId || 'DRV-8021',
      driverName: event.driverName || 'Arun Kumar',
      vehicleId: event.vehicleId || 'VEH-101',
      vehicleReg: event.vehicleReg || 'TN38XX1234',
      severity: event.severity || 'MEDIUM',
      timestamp: event.timestamp || new Date().toLocaleTimeString('en-US', { hour12: false }),
      location: event.location || 'Freight Transit Corridor',
      description: event.description || 'Safety event detected',
      actionTaken: event.actionTaken || 'Automated response dispatched',
      factors: event.factors || [],
      riskScore: event.riskScore ?? 50,
      confidence: event.confidence ?? 90,
      resolved: event.resolved ?? false,
    };

    const cleanData = sanitizeForFirestore(sanitizedEvent);
    await setDoc(doc(db, INCIDENTS_COLLECTION, cleanData.id), cleanData);
  } catch (error) {
    console.error('Failed to log safety incident to Firestore:', error);
  }
}

/**
 * Updates a vehicle telemetry status in Firestore.
 */
export async function updateVehicleInFirestore(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
  try {
    if (!vehicleId) return;
    const cleanUpdates = sanitizeForFirestore(updates);
    await setDoc(doc(db, VEHICLES_COLLECTION, vehicleId), cleanUpdates, { merge: true });
  } catch (error) {
    console.error(`Failed to update vehicle ${vehicleId} in Firestore:`, error);
  }
}

/**
 * Updates a driver's score / incident record in Firestore.
 */
export async function updateDriverInFirestore(driverId: string, updates: Partial<Driver>): Promise<void> {
  try {
    if (!driverId) return;
    const cleanUpdates = sanitizeForFirestore(updates);
    await setDoc(doc(db, DRIVERS_COLLECTION, driverId), cleanUpdates, { merge: true });
  } catch (error) {
    console.error(`Failed to update driver ${driverId} in Firestore:`, error);
  }
}

/**
 * Updates an incident document in Firestore with call escalation audit fields.
 */
export async function updateIncidentInFirestore(incidentId: string, updates: Partial<SafetyEvent>): Promise<void> {
  try {
    if (!incidentId) return;
    const cleanUpdates = sanitizeForFirestore(updates);
    await setDoc(doc(db, INCIDENTS_COLLECTION, incidentId), cleanUpdates, { merge: true });
  } catch (error) {
    console.error(`Failed to update incident ${incidentId} in Firestore:`, error);
  }
}

