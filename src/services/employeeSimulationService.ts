import { supabase } from '@/integrations/supabase/client';
import { SimulatedEmployeeBlacklistService } from './simulatedEmployeeBlacklistService';

export interface SimulatedEmployee {
  id: number;
  employee_number: number;
  full_name: string;
  created_at: string;
}

export interface EmployeeLocationUpdate {
  lat: number;
  lng: number;
  timestamp: string;
  estimatedArrival: number; // seconds
}

export interface EmployeeStatusUpdate {
  status: 'searching' | 'assigned' | 'en_route' | 'arrived' | 'working' | 'completed';
  message: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  estimatedArrival?: number;
}

export class EmployeeSimulationService {
  private static activeSimulations = new Map<string, NodeJS.Timeout>();
  private static locationUpdateCallbacks = new Map<string, (update: EmployeeLocationUpdate) => void>();
  private static statusUpdateCallbacks = new Map<string, (update: EmployeeStatusUpdate) => void>();

  // Start simulating employee response and journey for a request
  static async startEmployeeSimulation(
    requestId: string,
    serviceType: string,
    userLocation: { lat: number; lng: number },
    onStatusUpdate: (update: EmployeeStatusUpdate) => void,
    onLocationUpdate: (update: EmployeeLocationUpdate) => void,
    onPriceQuote: (employee: SimulatedEmployee, quote: number) => void,
    onDecline?: (reason: string) => void
  ): Promise<SimulatedEmployee | null> {
    try {
      // Get blacklisted employees for this request
      const blacklistedEmployees = await SimulatedEmployeeBlacklistService.getBlacklistedEmployees(requestId);
      
      // Get available employees
      const { data: employees, error } = await supabase
        .from('employee_simulation')
        .select('*')
        .order('employee_number');

      if (error || !employees || employees.length === 0) {
        onDecline?.('No employees available at the moment');
        return null;
      }

      // Filter out blacklisted employees
      const availableEmployees = employees.filter(emp => 
        !blacklistedEmployees.includes(emp.full_name)
      );

      if (availableEmployees.length === 0) {
        onDecline?.('All available employees are currently busy');
        return null;
      }

      // Select random employee
      const selectedEmployee = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];

      // Store callbacks
      this.statusUpdateCallbacks.set(requestId, onStatusUpdate);
      this.locationUpdateCallbacks.set(requestId, onLocationUpdate);

      // Start simulation phases
      this.simulateEmployeeJourney(requestId, selectedEmployee, serviceType, userLocation, onPriceQuote);

      return selectedEmployee;
    } catch (error) {
      console.error('Error starting employee simulation:', error);
      onDecline?.('Error finding available employees');
      return null;
    }
  }

  // Simulate the complete employee journey (Glovo-style)
  private static simulateEmployeeJourney(
    requestId: string,
    employee: SimulatedEmployee,
    serviceType: string,
    userLocation: { lat: number; lng: number },
    onPriceQuote: (employee: SimulatedEmployee, quote: number) => void
  ) {
    const statusCallback = this.statusUpdateCallbacks.get(requestId);
    const locationCallback = this.locationUpdateCallbacks.get(requestId);

    if (!statusCallback || !locationCallback) return;

    // Phase 1: Searching for employee (2-4 seconds)
    statusCallback({
      status: 'searching',
      message: 'Finding the best employee for your request...',
      timestamp: new Date().toISOString()
    });

    const searchTimeout = setTimeout(() => {
      // Phase 2: Employee assigned (1-2 seconds)
      statusCallback({
        status: 'assigned',
        message: `${employee.full_name} has been assigned to your request`,
        timestamp: new Date().toISOString()
      });

      const assignedTimeout = setTimeout(() => {
        // Generate price quote
        const basePrice = this.getBasePriceForService(serviceType);
        const finalPrice = basePrice + Math.floor(Math.random() * 20) - 10;
        const priceQuote = Math.max(20, finalPrice);

        // Send price quote
        onPriceQuote(employee, priceQuote);

        // Phase 3: Employee en route (starts after price acceptance)
        // This will be triggered by acceptPriceQuote method
      }, 1000 + Math.random() * 1000);

      this.activeSimulations.set(`${requestId}_assigned`, assignedTimeout);
    }, 2000 + Math.random() * 2000);

    this.activeSimulations.set(`${requestId}_search`, searchTimeout);
  }

  // Accept price quote and start en route simulation
  static acceptPriceQuote(
    requestId: string,
    employee: SimulatedEmployee,
    userLocation: { lat: number; lng: number }
  ) {
    const statusCallback = this.statusUpdateCallbacks.get(requestId);
    const locationCallback = this.locationUpdateCallbacks.get(requestId);

    if (!statusCallback || !locationCallback) return;

    // Generate employee starting location (2-5km away)
    const employeeStartLocation = this.generateEmployeeLocation(userLocation);
    
    // Calculate journey time (5-15 minutes)
    const journeyTimeMinutes = 5 + Math.random() * 10;
    const journeyTimeSeconds = Math.floor(journeyTimeMinutes * 60);

    // Phase 3: En route
    statusCallback({
      status: 'en_route',
      message: `${employee.full_name} is on the way to your location`,
      timestamp: new Date().toISOString(),
      location: employeeStartLocation,
      estimatedArrival: journeyTimeSeconds
    });

    // Start location updates every 10 seconds
    this.startLocationUpdates(requestId, employeeStartLocation, userLocation, journeyTimeSeconds);

    // Phase 4: Arrived (after journey time)
    const arrivedTimeout = setTimeout(() => {
      statusCallback({
        status: 'arrived',
        message: `${employee.full_name} has arrived at your location`,
        timestamp: new Date().toISOString(),
        location: userLocation
      });

      // Phase 5: Working (2-5 minutes)
      const workingTimeout = setTimeout(() => {
        statusCallback({
          status: 'working',
          message: `${employee.full_name} is working on your vehicle`,
          timestamp: new Date().toISOString(),
          location: userLocation
        });

        // Phase 6: Completed (after work time)
        const workTime = (2 + Math.random() * 3) * 60 * 1000; // 2-5 minutes
        const completedTimeout = setTimeout(() => {
          statusCallback({
            status: 'completed',
            message: 'Service completed successfully!',
            timestamp: new Date().toISOString(),
            location: userLocation
          });

          // Clean up
          this.stopSimulation(requestId);
        }, workTime);

        this.activeSimulations.set(`${requestId}_completed`, completedTimeout);
      }, (2 + Math.random() * 3) * 60 * 1000); // 2-5 minutes

      this.activeSimulations.set(`${requestId}_working`, workingTimeout);
    }, journeyTimeSeconds * 1000);

    this.activeSimulations.set(`${requestId}_arrived`, arrivedTimeout);
  }

  // Start real-time location updates during journey
  private static startLocationUpdates(
    requestId: string,
    startLocation: { lat: number; lng: number },
    endLocation: { lat: number; lng: number },
    totalTimeSeconds: number
  ) {
    const locationCallback = this.locationUpdateCallbacks.get(requestId);
    if (!locationCallback) return;

    let currentTime = 0;
    const updateInterval = 10; // Update every 10 seconds
    const totalUpdates = Math.floor(totalTimeSeconds / updateInterval);

    const locationInterval = setInterval(() => {
      currentTime += updateInterval;
      const progress = currentTime / totalTimeSeconds;

      if (progress >= 1) {
        clearInterval(locationInterval);
        return;
      }

      // Calculate current position with some randomness for realistic movement
      const currentLat = startLocation.lat + (endLocation.lat - startLocation.lat) * progress + (Math.random() - 0.5) * 0.001;
      const currentLng = startLocation.lng + (endLocation.lng - startLocation.lng) * progress + (Math.random() - 0.5) * 0.001;

      const remainingTime = totalTimeSeconds - currentTime;

      locationCallback({
        lat: currentLat,
        lng: currentLng,
        timestamp: new Date().toISOString(),
        estimatedArrival: remainingTime
      });
    }, updateInterval * 1000);

    this.activeSimulations.set(`${requestId}_location`, locationInterval as any);
  }

  // Decline price quote
  static declinePriceQuote(requestId: string, employeeName: string) {
    const statusCallback = this.statusUpdateCallbacks.get(requestId);
    
    if (statusCallback) {
      statusCallback({
        status: 'searching',
        message: 'Looking for another available employee...',
        timestamp: new Date().toISOString()
      });
    }

    // Add employee to blacklist
    // This will be handled by the calling code
    
    // Stop current simulation
    this.stopSimulation(requestId);
  }

  // Stop all simulations for a request
  static stopSimulation(requestId: string) {
    // Clear all timeouts for this request
    for (const [key, timeout] of this.activeSimulations.entries()) {
      if (key.startsWith(requestId)) {
        clearTimeout(timeout);
        this.activeSimulations.delete(key);
      }
    }

    // Remove callbacks
    this.statusUpdateCallbacks.delete(requestId);
    this.locationUpdateCallbacks.delete(requestId);
  }

  // Generate realistic employee starting location
  private static generateEmployeeLocation(userLocation: { lat: number; lng: number }): { lat: number; lng: number } {
    const radius = (2 + Math.random() * 3) / 111; // 2-5 km in degrees
    const angle = Math.random() * 2 * Math.PI;
    
    return {
      lat: userLocation.lat + radius * Math.cos(angle),
      lng: userLocation.lng + radius * Math.sin(angle)
    };
  }

  // Get base price for service type
  private static getBasePriceForService(serviceType: string): number {
    const basePrices: Record<string, number> = {
      'flat-tyre': 40,
      'out-of-fuel': 30,
      'car-battery': 60,
      'tow-truck': 100,
      'emergency': 80,
      'other-car-problems': 50,
      'support': 50
    };
    
    return basePrices[serviceType] || 50;
  }

  // Get current simulation status
  static getSimulationStatus(requestId: string): boolean {
    return Array.from(this.activeSimulations.keys()).some(key => key.startsWith(requestId));
  }

  // Clean up all simulations (call on app unmount)
  static cleanupAllSimulations() {
    for (const timeout of this.activeSimulations.values()) {
      clearTimeout(timeout);
    }
    this.activeSimulations.clear();
    this.statusUpdateCallbacks.clear();
    this.locationUpdateCallbacks.clear();
  }
}